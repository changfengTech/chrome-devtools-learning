// CONFIG 由本会话服务注入；scope 始终在 /labs/<token>/ 内。
self.addEventListener("install", (event) => {
  if (CONFIG.takeover) event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE" && event.data.token === CONFIG.token)
    self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(CONFIG.prefix)
  )
    return;
  if (
    CONFIG.lesson === "38" &&
    url.pathname === CONFIG.prefix + "controlled-version.json"
  ) {
    event.respondWith(
      Promise.resolve(
        new Response(
          JSON.stringify({
            workerVersion: CONFIG.version,
            source: "service-worker",
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          },
        ),
      ),
    );
    return;
  }
  if (CONFIG.lesson !== "39") return;
  if (url.pathname === CONFIG.prefix + "offline-product.json") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CONFIG.cacheName),
          key = new Request(
            self.location.origin + CONFIG.prefix + "offline-product.json",
          );
        const network = async () => {
          const response = await fetch(event.request);
          if (!response.ok) throw new Error("网络响应错误");
          await cache.put(key, response.clone());
          return response;
        };
        if (CONFIG.strategy === "cache-first") {
          const cached = await cache.match(key);
          return cached || network();
        }
        try {
          return await network();
        } catch (error) {
          const cached = await cache.match(key);
          if (cached) {
            const body = await cached.json();
            return new Response(
              JSON.stringify({ ...body, source: "cache-storage-fallback" }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "X-Lab-Cache": "offline-fallback",
                },
              },
            );
          }
          throw error;
        }
      })(),
    );
    return;
  }
  if (event.request.mode === "navigate")
    event.respondWith(
      (async () => {
        try {
          return await fetch(event.request);
        } catch {
          const cached = await caches.match(
            self.location.origin + CONFIG.prefix + "offline.html",
            { cacheName: CONFIG.cacheName },
          );
          return (
            cached ||
            new Response("尚未准备本会话离线页面", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })(),
    );
});
