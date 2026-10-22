// Readable production-style functions for breakpoints. Inputs are synthetic lesson data.
export function chooseStore(coords, preserveOrder) {
  const latitude = preserveOrder ? coords.latitude : coords.longitude;
  const longitude = preserveOrder ? coords.longitude : coords.latitude;
  return {
    latitude,
    longitude,
    store:
      Math.abs(latitude - 31.23) < 1 && Math.abs(longitude - 121.47) < 1
        ? "上海门店"
        : "手动选择",
  };
}
export function locationFailure(code, handleFailure) {
  return handleFailure
    ? {
        loading: false,
        manual: true,
        message: { 1: "定位被拒绝", 2: "定位不可用", 3: "定位超时" }[code],
      }
    : { loading: true, manual: false, message: "" };
}
export function checkout(order, good, variant) {
  console.table([
    { coupon: order.coupon, stock: order.stock, requested: order.quantity },
  ]);
  if (variant === 0) {
    const coupon = good ? order.coupon : order.couponCode;
    if (!coupon)
      console.warn("[coupon] input did not match field", order.coupon);
    return {
      total: order.price * order.quantity - (coupon === "SAVE5" ? 5 : 0),
      blocked: false,
    };
  }
  const stock = good ? order.stock : order.quantity;
  if (stock < order.quantity) {
    console.error("[stock] unavailable", order.stock);
    return { total: 0, blocked: true };
  }
  console.warn("[stock] order accepted despite stock", order.stock);
  return { total: order.price * order.quantity, blocked: false };
}
export function auditInventory(items, good, variant) {
  let accepted = 0,
    normalized = true;
  for (const item of items) {
    const price = good ? Number(item.price) : item.price;
    if (typeof price !== "number") normalized = false;
    // Place a conditional breakpoint on typeof item.price === 'string' or item.stock < 0.
    if (good && item.stock < 0) continue;
    if (variant === 0)
      accepted += typeof price === "number" ? price * item.quantity : 0;
    else accepted += price * item.quantity;
  }
  return { accepted, normalized };
}
export function pairProtocol(messages, matchId) {
  const request = messages.find((x) => x.method === "DOM.getDocument" && x.id);
  const responses = messages.filter((x) => x.result);
  const response = matchId
    ? responses.find((x) => x.id === request.id)
    : responses[0];
  return {
    matched: response?.id === request.id,
    root: response?.result.root || null,
  };
}
export function credentialPolicy({
  registeredId,
  allowedIds,
  userVerified,
  requireUV,
}) {
  return {
    credentialMatch: allowedIds.includes(registeredId),
    uv: !requireUV || userVerified,
  };
}

export function shouldCommitSearch(lesson, variant, good, sequence, latest) {
  const acceptsStale =
    !good &&
    ((lesson === "53" && variant === 0) || (lesson === "18" && variant === 1));
  return acceptsStale || sequence === latest;
}
