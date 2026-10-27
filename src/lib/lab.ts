import online from "../../.openai/online.json";
export const isHosted = import.meta.env.MODE === "site";
export const labOrigin = isHosted ? online.shop.origin : "http://127.0.0.1:4174";
// 在同一教程文档内复用窗口，同时隔离不同教程窗口的 opener 与结果接收方。
export const labWindowName = `devtools-lab-${crypto.randomUUID()}`;
export function labUrl(scenario = "waiting", token?: string) {
  const query = new URLSearchParams({ tutorial: location.origin });
  if (token) query.set("token", token);
  else query.set("scenario", scenario);
  return `${labOrigin}/shop/?${query}`;
}
export async function labRequest(path: string, body?: object) {
  const response = await fetch(`${labOrigin}${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(isHosted ? 30000 : 5000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "实验服务返回错误。");
  return data;
}
