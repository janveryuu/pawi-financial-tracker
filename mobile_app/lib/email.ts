import { Resend } from "resend"

const resendApiKey = process.env.RESEND_API_KEY || "re_dummy_resend_key"
export const resend = new Resend(resendApiKey)

export interface SendDigestEmailParams {
  to: string
  userName: string
  totalIncome: number
  totalExpense: number
  netSavings: number
  topCategory: string
  topCategoryAmount: number
  goalName?: string
  goalProgressPct?: number
}

export async function sendWeeklyDigestEmail({
  to,
  userName,
  totalIncome,
  totalExpense,
  netSavings,
  topCategory,
  topCategoryAmount,
  goalName,
  goalProgressPct,
}: SendDigestEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[Resend Simulated Email to ${to}] Weekly Digest for ${userName}: Net Savings: ₱${netSavings}`)
    return { id: "simulated_email_id", success: true }
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #F5F6F3; padding: 24px; border-radius: 24px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #3D784E; margin: 0; font-size: 24px; font-weight: 800;">Pawi Financial Digest 🐢</h1>
        <p style="color: #666; font-size: 13px; margin-top: 4px;">Your weekly money recap & progress</p>
      </div>

      <div style="background: #ffffff; padding: 20px; border-radius: 16px; margin-bottom: 16px; border: 1px solid rgba(0,0,0,0.06);">
        <h2 style="font-size: 16px; margin: 0 0 12px 0; color: #111;">Hello ${userName}!</h2>
        <p style="font-size: 14px; color: #444; line-height: 1.5; margin: 0 0 16px 0;">
          Here is how your cashflow looked over the past 7 days:
        </p>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 13px;">Total Inflow</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #3D784E; font-size: 14px;">+₱${totalIncome.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 13px;">Total Outflow</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #E53E3E; font-size: 14px;">-₱${totalExpense.toLocaleString()}</td>
          </tr>
          <tr style="border-top: 1px solid #eee;">
            <td style="padding: 10px 0; font-weight: 700; color: #111; font-size: 14px;">Net Savings</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 800; color: ${netSavings >= 0 ? '#3D784E' : '#E53E3E'}; font-size: 16px;">₱${netSavings.toLocaleString()}</td>
          </tr>
        </table>

        ${
          topCategory
            ? `<div style="background: #F5F6F3; padding: 12px; border-radius: 12px; margin-bottom: 12px;">
                <span style="font-size: 12px; color: #666;">Top Spending Category:</span>
                <div style="font-weight: 700; color: #111; font-size: 13px; margin-top: 2px;">${topCategory} (₱${topCategoryAmount.toLocaleString()})</div>
              </div>`
            : ""
        }

        ${
          goalName
            ? `<div style="background: #EBF3ED; padding: 12px; border-radius: 12px;">
                <span style="font-size: 12px; color: #3D784E; font-weight: 700;">Active Goal: ${goalName}</span>
                <div style="font-weight: 800; color: #3D784E; font-size: 14px; margin-top: 2px;">${goalProgressPct}% Reached 🎯</div>
              </div>`
            : ""
        }
      </div>

      <div style="text-align: center; font-size: 11px; color: #888;">
        Keep swimming toward financial freedom! 🌊<br/>
        Pawi Financial Tracker · Philippines
      </div>
    </div>
  `

  return await resend.emails.send({
    from: "Pawi Financial Tracker <updates@pawi.app>",
    to: [to],
    subject: `Your Weekly Pawi Money Digest 🐢 (Net: ₱${netSavings.toLocaleString()})`,
    html,
  })
}
