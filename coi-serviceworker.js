/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
// From: https://github.com/gzuidhof/coi-serviceworker
if (typeof window === "undefined") {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener("message", (ev) => {
    if (ev.data && ev.data.type === "deregister") {
      self.registration
        .unregister()
        .then(() => {
          return self.clients.matchAll();
        })
        .then((clients) => {
          clients.forEach((client) => client.navigate(client.url));
        });
    }
  });

  self.addEventListener("fetch", function (event) {
    if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 0) {
            return response;
          }

          const newHeaders = new Headers(response.headers);
          newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
          newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((e) => console.error(e))
    );
  });
} else {
  (() => {
    // You can customize the behavior of this script through a global `coi` variable.
    const coi = {
      shouldRegister: () => true,
      shouldDeregister: () => false,
      doReload: () => window.location.reload(),
      quiet: false,
      ...window.coi,
    };

    const n = navigator;
    if (coi.shouldDeregister() && n.serviceWorker && n.serviceWorker.controller) {
      n.serviceWorker.controller.postMessage({ type: "deregister" });
    }
    
    // If we're already coi: do nothing.
    if (window.crossOriginIsolated) return;
    
    // If another coi script is already running, do nothing.
    if (n.serviceWorker && n.serviceWorker.controller) return;

    // If we're not running in a secure context, do nothing.
    if (!window.isSecureContext) return;

    if (coi.shouldRegister()) {
      n.serviceWorker.register(window.document.currentScript.src).then(
        (registration) => {
          !coi.quiet && console.log("COOP/COEP Service Worker registered", registration.scope);
          
          registration.addEventListener("updatefound", () => {
             !coi.quiet && console.log("New COOP/COEP Service Worker found, refreshing");
             coi.doReload();
          });

          // If the registration is active, but it's not controlling the page
          if (registration.active && !n.serviceWorker.controller) {
            !coi.quiet && console.log("Reloading page to make the COOP/COEP Service Worker effective.");
            coi.doReload();
          }
        },
        (err) => {
          !coi.quiet && console.error("COOP/COEP Service Worker failed to register:", err);
        }
      );
    }
  })();
}
