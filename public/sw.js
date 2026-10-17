// Bloom service worker: shows reminder pushes and handles their Taken / Snooze 10m buttons.
// Buttons log straight from the notification via /api/notify-action (a signed token, so it works
// with the app closed). Note: iOS shows a tap-to-open notification without action buttons.
const ICON = "/icons/icon-192.png";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Bloom", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title || "Bloom", {
        body: data.body || "",
        tag: data.tag,
        renotify: Boolean(data.tag),
        requireInteraction: data.requireInteraction !== false,
        icon: ICON,
        badge: ICON,
        data: { url: data.url || "/", ...(data.data || {}) },
        actions: data.actions || [],
      });
      // If Bloom is open, let it ring its own in-app alarm and refresh.
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) w.postMessage({ type: "bloom-reminder", tag: data.tag });
    })(),
  );
});

async function refreshOpenWindows() {
  const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const w of wins) w.postMessage({ type: "bloom-refresh" });
}

self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data || {};
  event.notification.close();

  if ((event.action === "taken" || event.action === "snooze") && data.token) {
    event.waitUntil(
      fetch("/api/notify-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: data.token, action: event.action }),
      })
        .then((r) => r.json())
        .then((res) => self.registration.showNotification("Bloom", { body: res.message, tag: "bloom-confirm", icon: ICON, requireInteraction: false }))
        .catch(() => self.registration.showNotification("Bloom", { body: "That didn't save. Open Bloom to log it.", tag: "bloom-confirm", icon: ICON }))
        .then(refreshOpenWindows),
    );
    return;
  }

  const url = data.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
