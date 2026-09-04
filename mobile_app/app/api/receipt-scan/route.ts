import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai"
import { createAdminClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("image") as File | null
    const userId = (formData.get("userId") as string) || "anonymous"

    if (!file) {
      return NextResponse.json({ error: "No receipt or QR image provided" }, { status: 400 })
    }

    // Verify MIME type is an image
    const mimeType = file.type || "image/jpeg"
    if (!mimeType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid file format. Please upload an image (JPEG, PNG, or WebP)." },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Data = buffer.toString("base64")

    // 1. Upload to Supabase Storage 'receipts' bucket if configured
    let receiptUrl: string | null = null
    try {
      const supabaseAdmin = createAdminClient()
      const filename = `${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
      const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
        .from("receipts")
        .upload(filename, buffer, {
          contentType: mimeType,
          upsert: true,
        })

      if (!uploadErr && uploadData) {
        const { data: pubUrlData } = supabaseAdmin.storage.from("receipts").getPublicUrl(filename)
        receiptUrl = pubUrlData?.publicUrl || null
      }
    } catch (storageErr) {
      console.warn("Receipt storage upload notice:", storageErr)
    }

    // 2. Extract structured data with Gemini
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Receipt OCR scanning service is currently not configured." },
        { status: 503 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const candidateModels = ["gemini-3.7-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
    const prompt = `You are a strict financial document analyzer. Examine this image carefully.
First, verify whether this image is a genuine financial receipt, billing invoice, transaction slip, payment confirmation (e.g. GCash, Maya, Shopee, GrabPay, bank transfer slip), or payment QR code.
If the image is NOT a financial transaction receipt or payment slip (for example: a selfie, animal, meme, random scenery, vehicle photo without receipt, or plate of food without a receipt bill), set 'is_valid_receipt_or_qr' to false, confidence to 'none', and amount to 0.
If it IS a valid receipt or transaction slip, set 'is_valid_receipt_or_qr' to true and extract the merchant name, total grand amount paid (strictly > 0), currency (default to PHP), transaction date, budget category, and payment method.`

    let parsedResult: any = null

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                is_valid_receipt_or_qr: {
                  type: SchemaType.BOOLEAN,
                  description: "True if the image contains a legitimate financial receipt, transaction slip, invoice, or payment QR code. False for random non-financial photos.",
                },
                merchant: { type: SchemaType.STRING, description: "Name of the store, biller, or merchant" },
                amount: { type: SchemaType.NUMBER, description: "Total grand total amount paid (must be > 0)" },
                currency: { type: SchemaType.STRING, description: "Currency code e.g. PHP, USD" },
                transaction_date: { type: SchemaType.STRING, description: "Date of transaction in YYYY-MM-DD" },
                category: { type: SchemaType.STRING, description: "Category e.g. Food & Dining, Groceries, Shopping, Transport, Utilities & Bills" },
                payment_method_guess: { type: SchemaType.STRING, description: "Payment method detected e.g. Cash, GCash, Maya, Card" },
                confidence: { type: SchemaType.STRING, description: "Confidence level: 'high', 'low', or 'none'" },
                low_fields: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                  description: "List of fields with low OCR confidence",
                },
              },
              required: ["is_valid_receipt_or_qr", "merchant", "amount", "currency", "category", "confidence"],
            },
          },
        })

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
        ])

        const responseText = result.response.text()
        if (responseText) {
          parsedResult = JSON.parse(responseText)
          break
        }
      } catch (scanErr) {
        console.warn(`Receipt OCR notice with ${modelName}:`, scanErr)
      }
    }

    // Strict validation: Reject if not a valid financial receipt or non-positive amount
    if (
      !parsedResult ||
      parsedResult.is_valid_receipt_or_qr === false ||
      parsedResult.confidence === "none" ||
      !parsedResult.amount ||
      parsedResult.amount <= 0
    ) {
      return NextResponse.json(
        { error: "No valid QR code or receipt detected. Please scan a clear payment slip or QR code." },
        { status: 422 }
      )
    }

    const rawSummary = `Spent ${parsedResult.amount.toLocaleString()} on ${parsedResult.category || "General"} at ${parsedResult.merchant || "Store"} (${parsedResult.payment_method_guess || "Cash"})`

    return NextResponse.json({
      ...parsedResult,
      receipt_url: receiptUrl,
      raw_summary: rawSummary,
    })
  } catch (error: any) {
    console.error("Receipt OCR API error:", error)
    return NextResponse.json(
      { error: "No valid QR code or receipt detected. Please scan a clear payment slip or QR code." },
      { status: 422 }
    )
  }
}
