import assets from 'virtual:lab-assets';
import { Buffer } from 'node:buffer';
function key(value) {
  const pathname = value instanceof URL ? value.pathname : String(value);
  return pathname.replace(/^.*?\/(public|src\/data)\//, '$1/');
}
export function readFileSync(value, encoding) {
  const item = assets[key(value)];
  if (!item) throw new Error('Unknown bundled resource: '+key(value));
  const data = Buffer.from(item.body, 'base64');
  return encoding ? data.toString(encoding) : data;
}
export async function readFile(value, encoding) { return readFileSync(value, encoding); }
