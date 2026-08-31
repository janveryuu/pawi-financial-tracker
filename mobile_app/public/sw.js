/**
 * Pawi Financial Tracker — Service Worker
 * Handles Web Push and Android PWA / TWA push notifications with deep-linking.
 */

self.addEventListener("install", (event) => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

// Listen for incoming push messages
self.addEventListener("push", (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const title = data.title || "Pawi Financial Tracker 🐢"
    const options = {
      body: data.body || "You have a new update from Pawi.",
      icon: data.icon || "/pawikan-logo.png",
      badge: data.badge || "/pawikan-logo.png",
      tag: data.tag || "pawi-alert",
      data: data.data || { url: data.url || "/" },
      vibrate: [200, 100, 200],
      renotify: true,
    }

    event.waitUntil(self.registration.showNotification(title, options))
  } catch (err) {
    console.error("Error processing push event:", err)
  }
})

// Handle notification click with deep-linking
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const targetUrl = (event.notification.data && event.notification.data.url) || "/"

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If an open window already exists, focus it and navigate
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus()
            if ("navigate" in client) {
              return client.navigate(targetUrl)
            }
            return
          }
        }
        // Otherwise, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
      })
  )
})
