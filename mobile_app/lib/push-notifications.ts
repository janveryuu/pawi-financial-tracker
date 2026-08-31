// Client-side Web Push & Android PWA/TWA Notification Helpers

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

export function getPushPermissionStatus(): NotificationPermission {
  if (!isPushSupported()) return "denied"
  return Notification.permission
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
    await navigator.serviceWorker.ready
    return registration
  } catch (err) {
    console.warn("Service worker registration notice:", err)
    return null
  }
}

export async function requestPushPermission(userId: string): Promise<{
  success: boolean
  permission: NotificationPermission
  error?: string
}> {
  if (!isPushSupported()) {
    return { success: false, permission: "denied", error: "Push notifications not supported on this device." }
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      return { success: false, permission }
    }

    const registration = await registerServiceWorker()
    if (!registration) {
      return { success: false, permission, error: "Failed to initialize service worker." }
    }

    const vapidPublicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBKr3qBUYIhbQ41G0M2C_eb94"

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })
    }

    const subJson = subscription.toJSON()
    if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
      const isAndroid = /Android/i.test(navigator.userAgent)
      const isPWA = window.matchMedia("(display-mode: standalone)").matches

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
          deviceLabel: isPWA
            ? isAndroid
              ? "Android App (PWA/APK)"
              : "Installed PWA"
            : navigator.userAgent.includes("Mobile")
            ? "Mobile Browser"
            : "Desktop Browser",
          platform: isAndroid ? "android" : "web",
        }),
      })
    }

    return { success: true, permission: "granted" }
  } catch (err: any) {
    console.warn("Push subscription registration notice:", err)
    return { success: false, permission: "denied", error: err?.message || "Registration failed" }
  }
}

export async function unsubscribePush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          endpoint: subscription.endpoint,
        }),
      })
    }
    return true
  } catch (err) {
    console.warn("Push unsubscribe notice:", err)
    return false
  }
}
