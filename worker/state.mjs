import { createPublicKey } from 'node:crypto';
import { Buffer } from 'node:buffer';

export function encode(value) {
  if (value instanceof Set) return { $set: [...value].map(encode) };
  if (value instanceof Map) return { $map: Object.fromEntries([...value].map(([k,v])=>[k,encode(v)])) };
  if (Buffer.isBuffer(value)) return { $buffer: value.toString('base64') };
  if (value && typeof value.export === 'function') return { $key: value.export({format:'jwk'}) };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,encode(v)]));
  return value;
}
export function decode(value) {
  if (value?.$set) return new Set(value.$set.map(decode));
  if (value?.$map) return new Map(Object.entries(value.$map).map(([k,v])=>[k,decode(v)]));
  if (value?.$buffer) return Buffer.from(value.$buffer,'base64');
  if (value?.$key) return createPublicKey({key:value.$key,format:'jwk'});
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,decode(v)]));
  return value;
}
const same = (a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Merge disjoint run mutations and append-only resource observations when two
// Workers receive parallel requests for the same exercise. Never last-write-win
// an entire session: that would lose resource evidence or a completed phase.
export function merge(base, next, current, key='') {
  if (same(base,next)) return current;
  if (same(base,current) || current === undefined) return next;
  if (typeof base==='number' && typeof next==='number' && typeof current==='number' && ['baseline','fixed','traces','attempts'].includes(key)) return current+next-base;
  if (Array.isArray(base) && Array.isArray(next) && Array.isArray(current) && same(next.slice(0,base.length),base) && same(current.slice(0,base.length),base)) return [...current,...next.slice(base.length)];
  if (next && current && !Array.isArray(next) && !Array.isArray(current) && typeof next==='object' && typeof current==='object') {
    const result={...current};
    for (const k of new Set([...Object.keys(base||{}),...Object.keys(next)])) {
      if (!(k in next)) { if(same(base?.[k],current[k])) delete result[k]; }
      else result[k]=merge(base?.[k],next[k],current[k],k);
    }
    return result;
  }
  return next;
}
export async function loadState(db, namespace, token) {
  const map=new Map(); let original;
  if (token) {
    const row=await db.prepare('SELECT state FROM lab_sessions WHERE namespace=? AND token=? AND expires_at>?').bind(namespace,token,Date.now()).first();
    if(row){ original=JSON.parse(row.state);map.set(token,decode(original)); }
  }
  return {
    map,
    async save() {
      for(const [id,state] of map) {
        const next=encode(state);
        if(id===token && same(original,next)) continue;
        if(!original || id!==token) {
          await db.prepare('INSERT INTO lab_sessions(namespace,token,state,revision,expires_at) VALUES(?,?,?,0,?) ON CONFLICT(namespace,token) DO NOTHING').bind(namespace,id,JSON.stringify(next),(state.created||Date.now())+1800000).run();
        } else {
          let saved=false;
          for(let attempt=0;attempt<12;attempt++) {
            const row=await db.prepare('SELECT state,revision FROM lab_sessions WHERE namespace=? AND token=?').bind(namespace,id).first();
            if(!row) throw new Error('Session expired while saving');
            const merged=merge(original,next,JSON.parse(row.state));
            const result=await db.prepare('UPDATE lab_sessions SET state=?,revision=revision+1 WHERE namespace=? AND token=? AND revision=?').bind(JSON.stringify(merged),namespace,id,row.revision).run();
            if(result.meta.changes===1){saved=true;break;}
          }
          if(!saved)throw new Error('Concurrent session write, please retry');
        }
      }
    }
  };
}
