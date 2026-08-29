import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 })
    }

    const cleanEmail = String(email).trim().toLowerCase()
    const cleanName = (name && String(name).trim()) || "Janver"

    // 1. Create user with auto-confirmed email (bypasses rate limit)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name: cleanName,
        full_name: cleanName,
        display_name: cleanName,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // 2. Ensure profiles table has starter row for this user
    if (data?.user) {
      try {
        await supabaseAdmin.from("profiles").upsert({
          id: data.user.id,
          name: cleanName,
          initials: cleanName.slice(0, 2).toUpperCase(),
          profile_type: "student",
          is_student: true,
          weekly_allowance: 0,
          onboarding_completed: false,
          tutorial_completed: false,
          tutorial_step: 0,
          currency: "PHP",
          country: "PH",
        }, { onConflict: "id" })
      } catch (e) {
        console.warn("Could not insert starter profile row:", e)
      }
    }

    return NextResponse.json({ user: data.user }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create user" }, { status: 500 })
  }
}
