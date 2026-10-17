// Keep an open team workspace active for retention; no controls or visual changes.
(() => {
  if (window.location.origin !== "https://telemetry.aurora-racing.com") return;
  let timer;
  let controller;
  let stopped = false;
  async function pulse() {
    if (stopped || controller) return;
    controller = new AbortController();
    const timeout = setTimeout(() => controller?.abort(), 10000);
    try {
      const response = await fetch("/api/aurora/activity", {
        credentials: "same-origin", cache: "no-store", signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) stopped = true;
    } catch (_) {
      // A network outage or a busy analyzer will retry; no credentials are stored.
    } finally {
      clearTimeout(timeout);
      controller = null;
      if (!stopped) timer = setTimeout(pulse, 60000);
    }
  }
  window.addEventListener("pagehide", () => {
    stopped = true;
    clearTimeout(timer);
    controller?.abort();
  });
  window.addEventListener("pageshow", event => {
    if (event.persisted) {
      stopped = false;
      pulse();
    }
  });
  pulse();
})();
