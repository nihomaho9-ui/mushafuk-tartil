const SHELL = "tartil-shell-v4";
const FONTS = "https://mushafuk.online/yazi-fonts/";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith("tartil-shell-") && key !== SHELL).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  const font = url.href.startsWith(FONTS);
  if (url.origin !== self.location.origin && !font) return;
  if (url.pathname.endsWith("/model.onnx")) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(SHELL).then((cache) => cache.put(event.request, copy)).catch(() => undefined);
        }
        return res;
      })
      .catch(async () => {
        const hit = (await caches.match(event.request)) || (await caches.match(event.request, { ignoreSearch: true }));
        if (hit) return hit;
        if (event.request.mode === "navigate") {
          return (
            (await caches.match(new URL("./", self.registration.scope))) ||
            (await caches.match(new URL("./index.html", self.registration.scope))) ||
            Response.error()
          );
        }
        return Response.error();
      }),
  );
});
