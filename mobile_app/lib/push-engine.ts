/**
 * push-engine.ts
 *
 * Unified Server-Side Push Notification Dispatch Layer for Pawi.
 * Uses web-push with VAPID keys to deliver notifications to all registered
 * device endpoints (Web Browser and Android APK / TWA).
 */

import webpush from "web-push"
import { createAdminClient } from "./supabase"
import { EvaluationItem, NotificationType } from "./push-types"

export * from "./push-types"

export interface DispatchResult {
  userId: string
  type: NotificationType
  relatedEntityId: string
  cycleIdentifier: string
  devicesSent: number
  devicesFailed: number
  cleanedSubscriptions: number
  error?: string
}

/**
 * Dispatches a notification to all registered push subscriptions for a user,
 * logs it in notification_log with unique dedupe constraints, and cleans up dead subscriptions.
 */
export async function dispatchNotificationToUser(
  item: EvaluationItem,
  userId: string
): Promise<DispatchResult> {
  const vapidPublic = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@pawi.app"

  const supabaseAdmin = createAdminClient()

  const result: DispatchResult = {
    userId,
    type: item.type,
    relatedEntityId: item.relatedEntityId,
    cycleIdentifier: item.cycleIdentifier,
    devicesSent: 0,
    devicesFailed: 0,
    cleanedSubscriptions: 0,
  }

  // 1. Insert into notification_log FIRST or check dedupe
  const { error: logInsertErr } = await supabaseAdmin.from("notification_log").insert({
    user_id: userId,
    notification_type: item.type,
    related_entity_id: item.relatedEntityId,
    cycle_identifier: item.cycleIdentifier,
    title: item.payload.title,
    body: item.payload.body,
    url: item.payload.url,
    is_read: false,
    sent_at: new Date().toISOString(),
  })

  if (logInsertErr) {
    // Unique constraint violation means already sent
    if (logInsertErr.code === "23505" || logInsertErr.message?.includes("duplicate")) {
      result.error = "Already sent (deduplicated)"
      return result
    }
  }

  // 2. Fetch all user subscriptions (supports multi-device Web + Android APK)
  const { data: subs, error: subsErr } = await supabaseAdmin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)

  if (subsErr || !subs || subs.length === 0) {
    result.error = "No active device subscriptions"
    return result
  }

  if (vapidPublic && vapidPrivate) {
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

    const payloadString = JSON.stringify({
      title: item.payload.title,
      body: item.payload.body,
      icon: item.payload.icon || "/pawikan-logo.png",
      badge: item.payload.badge || "/pawikan-logo.png",
      url: item.payload.url,
      tag: item.payload.tag,
      data: {
        url: item.payload.url,
        type: item.type,
        ...item.payload.data,
      },
    })

    const sendPromises = subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payloadString
        )
        result.devicesSent++
      } catch (err: any) {
        result.devicesFailed++
        // Clean up expired or unregistered endpoints (HTTP 404 or 410)
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id)
          result.cleanedSubscriptions++
        }
      }
    })

    await Promise.allSettled(sendPromises)
  }

  return result
}
