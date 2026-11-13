"use client";

import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (window.sessionStorage.getItem("tatame.reload") !== "1") return;
      window.sessionStorage.removeItem("tatame.reload");
      window.location.reload();
    });

    void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((registration) => {
      const announce = () => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          window.dispatchEvent(new Event("tatame-update"));
        }
      };
      const installing = registration.installing;
      if (installing && !navigator.serviceWorker.controller) {
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed") registration.waiting?.postMessage("skip-waiting");
        });
      }
      announce();
      registration.addEventListener("updatefound", () => {
        registration.installing?.addEventListener("statechange", () => announce());
      });
    }).catch((error: unknown) => {
      console.error(error);
    });
  }, []);
  return null;
}
