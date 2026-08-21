import { createAdminClient } from "./supabase"

export type ActivityEventType =
  | "signup"
  | "login"
  | "transaction_created"
  | "transaction_edited"
  | "transaction_deleted"
  | "goal_completed"
  | "budget_threshold_crossed"
  | "receipt_scanned"
  | "wallet_transfer"

export interface LogActivityParams {
  eventType: ActivityEventType
  description: string
  userId?: string
  performedBy?: string
  metadata?: Record<string, any>
}

export async function logActivity({
  eventType,
  description,
  userId,
  performedBy,
  metadata = {},
}: LogActivityParams) {
  try {
    const supabaseAdmin = createAdminClient()
    await supabaseAdmin.from("activity_log").insert({
      event_type: eventType,
      description,
      related_user_id: userId || null,
      performed_by: performedBy || "user",
      metadata,
    })
  } catch (err) {
    console.warn("Activity log recording notice:", err)
  }
}
