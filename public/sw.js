// Cache only public app resources; private API data and uploaded media never enter this cache.
const scope = new URL("./", self.location.href);
const BUILD = "__DAREME_BUILD__";
const ASSETS = /*__DAREME_ASSETS__*/ [];
const PREFIX = `dareme-${scope.pathname}-`;
const CACHE = `${PREFIX}${BUILD}`;
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(ASSETS.map(path => new URL(path, scope).href)),
      ),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => (key.startsWith(PREFIX) || key === "dareme-shell-v1") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== scope.origin ||
    !url.pathname.startsWith(scope.pathname)
  )
    return;
  const relative = url.pathname.slice(scope.pathname.length);
  if (relative.startsWith("api/") || relative.startsWith("uploads/")) return;
  const isShell = request.mode === "navigate";
  const isAsset =
    /^(assets|fonts|images|icons)\//.test(relative) ||
    relative === "manifest.webmanifest" ||
    relative === "favicon.svg";
  if (!isShell && !isAsset) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          event.waitUntil(
            caches
              .open(CACHE)
              .then((cache) => cache.put(isShell ? scope.href : request, copy)),
          );
        }
        return response;
      })
      .catch(
        async () =>
          (await caches.match(isShell ? scope.href : request)) ||
          Response.error(),
      ),
  );
});
