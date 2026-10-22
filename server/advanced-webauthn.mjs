import {
  randomBytes,
  createHash,
  createPublicKey,
  verify,
  timingSafeEqual,
} from "node:crypto";
const b64 = (b) => Buffer.from(b).toString("base64url");
const hash = (b) => createHash("sha256").update(b).digest();
// Bounded CBOR subset for none attestation and ES256 COSE keys. No tags or indefinite lengths.
export function decodeCbor(buffer) {
  let offset = 0,
    count = 0;
  function read(depth = 0) {
    if (depth > 8 || ++count > 200 || offset >= buffer.length)
      throw Error("CBOR limit");
    const h = buffer[offset++],
      major = h >> 5,
      ai = h & 31;
    let n = ai;
    if (ai === 24) n = buffer.readUInt8(offset++);
    else if (ai === 25) {
      n = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (ai === 26) {
      n = buffer.readUInt32BE(offset);
      offset += 4;
    } else if (ai >= 27) throw Error("Unsupported CBOR");
    if (n > 65536) throw Error("CBOR length");
    if (major === 0) return n;
    if (major === 1) return -1 - n;
    if (major === 2 || major === 3) {
      if (offset + n > buffer.length) throw Error("CBOR truncated");
      const v = buffer.subarray(offset, offset + n);
      offset += n;
      return major === 2 ? v : v.toString("utf8");
    }
    if (major === 4) return Array.from({ length: n }, () => read(depth + 1));
    if (major === 5) {
      const m = new Map();
      for (let i = 0; i < n; i++) {
        const k = read(depth + 1);
        if (m.has(k)) throw Error("Duplicate CBOR key");
        m.set(k, read(depth + 1));
      }
      return m;
    }
    throw Error("Unsupported CBOR major");
  }
  const value = read();
  return { value, bytes: offset };
}
function decode(s) {
  if (typeof s !== "string" || s.length > 90000 || !/^[\w-]+$/.test(s))
    throw Error("Invalid base64url");
  return Buffer.from(s, "base64url");
}
function equal(a, b) {
  return a.length === b.length && timingSafeEqual(a, b);
}
function client(s, data, type, origin) {
  const raw = decode(data),
    c = JSON.parse(raw);
  if (
    c.type !== type ||
    c.challenge !== s.authChallenge?.value ||
    c.origin !== origin ||
    c.crossOrigin === true
  )
    throw Error("challenge / origin / type mismatch");
  if (
    Date.now() - s.authChallenge.created > 120000 ||
    s.authChallenge.type !== type
  )
    throw Error("challenge expired");
  s.authChallenge = null; // consume once, even on later validation failure
  return raw;
}
function authData(raw, rp, uv) {
  if (
    raw.length < 37 ||
    !equal(raw.subarray(0, 32), hash(rp)) ||
    !(raw[32] & 1) ||
    (uv && !(raw[32] & 4))
  )
    throw Error("RP / UP / UV mismatch");
  return { count: raw.readUInt32BE(33), flags: raw[32] };
}
export function authOptions(s, action, origin) {
  const rp = new URL(origin).hostname;
  s.authChallenge = {
    value: b64(randomBytes(32)),
    created: Date.now(),
    type: action === "register" ? "webauthn.create" : "webauthn.get",
  };
  if (action === "register")
    return {
      challenge: s.authChallenge.value,
      rp: { id: rp, name: "DevTools local exercise" },
      user: {
        id: b64(Buffer.from(s.token)),
        name: "test-" + s.seed,
        displayName: "本地测试学习者",
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      timeout: 30000,
      attestation: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    };
  if (!s.credential) throw Error("先真实注册测试凭据");
  const good = s.currentGood;
  return {
    challenge: s.authChallenge.value,
    rpId: rp,
    timeout: 15000,
    userVerification: s.variant === 1 ? "required" : "preferred",
    allowCredentials: [
      {
        type: "public-key",
        id: !good && s.variant === 0 ? b64(randomBytes(32)) : s.credential.id,
      },
    ],
  };
}
export function registerCredential(s, input, origin) {
  client(s, input.clientDataJSON, "webauthn.create", origin);
  const obj = decodeCbor(decode(input.attestationObject)).value;
  if (
    !(obj instanceof Map) ||
    obj.get("fmt") !== "none" ||
    !(obj.get("attStmt") instanceof Map) ||
    obj.get("attStmt").size !== 0
  )
    throw Error("本课仅接受 none attestation");
  const raw = obj.get("authData");
  if (!Buffer.isBuffer(raw)) throw Error("Missing authData");
  const { flags, count } = authData(raw, new URL(origin).hostname, false);
  if (!(flags & 64) || raw.length < 55)
    throw Error("Missing attested credential");
  const len = raw.readUInt16BE(53),
    id = raw.subarray(55, 55 + len);
  if (!len || len > 1024 || 55 + len >= raw.length || b64(id) !== input.id)
    throw Error("Credential ID mismatch");
  const key = decodeCbor(raw.subarray(55 + len)).value;
  if (
    !(key instanceof Map) ||
    key.get(1) !== 2 ||
    key.get(3) !== -7 ||
    key.get(-1) !== 1 ||
    key.get(-2)?.length !== 32 ||
    key.get(-3)?.length !== 32
  )
    throw Error("Only ES256 P-256 supported");
  const publicKey = createPublicKey({
    key: { kty: "EC", crv: "P-256", x: b64(key.get(-2)), y: b64(key.get(-3)) },
    format: "jwk",
  });
  s.credential = { id: b64(id), publicKey, count };
  return {
    registered: true,
    id: b64(id),
    algorithm: "ES256",
    attestation: "none",
  };
}
export function verifyCredential(s, input, origin) {
  const clientBytes = client(s, input.clientDataJSON, "webauthn.get", origin);
  if (!s.credential || input.id !== s.credential.id)
    throw Error("Credential mismatch");
  const raw = decode(input.authenticatorData),
    { count } = authData(raw, new URL(origin).hostname, s.variant === 1);
  if (!s.currentGood && s.variant === 0)
    throw Error("Credential was not allowed for this case");
  if ((count || s.credential.count) && count <= s.credential.count)
    throw Error("Sign counter did not increase");
  if (
    !verify(
      "sha256",
      Buffer.concat([raw, hash(clientBytes)]),
      s.credential.publicKey,
      decode(input.signature),
    )
  )
    throw Error("Invalid assertion signature");
  s.credential.count = count;
  s.nativeAuthenticated = true;
  return {
    authenticated: true,
    signatureVerified: true,
    uv: Boolean(raw[32] & 4),
    count,
  };
}
