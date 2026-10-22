export const labOrigin = "http://127.0.0.1:4174";
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
    signal: AbortSignal.timeout(5000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "实验服务返回错误。");
  return data;
}
