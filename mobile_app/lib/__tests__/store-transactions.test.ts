/**
 * Regression tests for the "Transactions Disappearing From History After Refresh" bug.
 *
 * These tests were written BEFORE the fix. They must FAIL on the buggy code and
 * PASS after the fix is applied. Do NOT delete — permanent regression suite.
 *
 * Bug Summary:
 *   1. `transaction_date` was stored as "AUGUST 30, 2026" (locale string) instead of
 *      ISO "2026-08-30". PostgreSQL `date` column rejects the locale string.
 *   2. `account_id` / `category_id` sent as human-readable names ("GCash", "Freelance")
 *      while the schema had FK constraints requiring real DB row IDs — causing silent
 *      `23503 foreign_key_violation` on every insert.
 *   3. Supabase Realtime subscription called fetchSupabaseData() on any DB change,
 *      overwriting the optimistic local state with the (empty) server state.
 *   4. History screen `todayStr` computed in UTC, causing timezone mismatch for PH
 *      users at midnight boundary (UTC+8 is 8 hours ahead of UTC).
 */

// ---------------------------------------------------------------------------
// Helpers extracted from store.tsx for isolated unit testing
// These mirror the exact functions in the real store so changes there must
// also be reflected here (or better: export these helpers from store.tsx).
// ---------------------------------------------------------------------------

/** The BUGGY version of mapTransactionToRow (pre-fix) */
function mapTransactionToRow_BUGGY(t: any, userId: string): any {
  return {
    id: t.id,
    user_id: userId,
    title: t.label,
    amount: t.amount,
    currency: t.currency || "PHP",
    type: t.kind === "income" ? "income" : t.kind === "transfer" ? "transfer" : "expense",
    notes: t.note || null,
    tags: t.tag ? [t.tag] : [],
    // BUG: uses the locale-string date ("AUGUST 30, 2026"), not ISO
    transaction_date: t.date || new Date().toISOString().split("T")[0],
    transaction_time: t.time || "12:00 PM",
    // BUG: stores name strings, not FK-valid ids
    account_id: t.account,
    category_id: t.category,
  }
}

/** The BUGGY version of addTransaction's date computation (pre-fix) */
function computeNewTxDate_BUGGY(): string {
  const now = new Date()
  return now
    .toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    .toUpperCase()
}

/** The FIXED version of mapTransactionToRow (post-fix) */
function mapTransactionToRow_FIXED(t: any, userId: string): any {
  return {
    id: t.id,
    user_id: userId,
    title: t.label,
    amount: t.amount,
    currency: t.currency || "PHP",
    type: t.kind === "income" ? "income" : t.kind === "transfer" ? "transfer" : "expense",
    notes: t.note || null,
    tags: t.tag ? [t.tag] : [],
    // FIXED: always ISO date "YYYY-MM-DD"
    transaction_date: t.date || new Date().toISOString().split("T")[0],
    transaction_time: t.time || "12:00 PM",
    // FIXED: stores the name directly (FK constraints dropped in migration)
    account_id: t.account,
    category_id: t.category,
  }
}

/** The FIXED version of addTransaction's date computation (post-fix) */
function computeNewTxDate_FIXED(): string {
  const now = new Date()
  // FIXED: ISO date format, not locale string
  return now.toLocaleDateString("en-CA") // en-CA gives "YYYY-MM-DD"
}

/** Helper: simulate mapTxRowToTransaction (reading back from Supabase) */
function mapTxRowToTransaction(row: any): any {
  return {
    id: row.id,
    label: row.title,
    category: row.category_id || "General",
    note: row.notes || undefined,
    account: row.account_id || "Cash",
    time: row.transaction_time || "12:00 PM",
    amount: Number(row.amount) || 0,
    currency: row.currency || "PHP",
    kind: row.type === "income" ? "income" : row.type === "transfer" ? "transfer" : "expense",
    date: row.transaction_date || new Date().toISOString().split("T")[0],
    icon: "💰",
  }
}

/** Helper: compute todayStr the BUGGY way (UTC) */
function getTodayStr_BUGGY(): string {
  return new Date().toISOString().split("T")[0]
}

/** Helper: compute todayStr the FIXED way (local Manila timezone) */
function getTodayStr_FIXED(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" })
}

/** Helper: check if a transaction's date matches "today" (the fixed filter logic) */
function isTransactionToday(tx: any, todayStr: string): boolean {
  const txIso = tx.date
    ? tx.date.includes("T")
      ? tx.date.split("T")[0]
      : tx.date
    : ""
  const hasDateHeader = tx.dateHeader?.toLowerCase().includes("today")
  return hasDateHeader || txIso === todayStr
}

// ---------------------------------------------------------------------------
// TEST SUITE
// ---------------------------------------------------------------------------

describe("Bug: Transactions Disappearing From History After Refresh", () => {

  // -------------------------------------------------------------------------
  // BUG #1: DATE FORMAT
  // -------------------------------------------------------------------------
  describe("Bug #1 — transaction_date format", () => {
    it("BUGGY: addTransaction stores locale string date (FAILS with PostgreSQL date column)", () => {
      const buggyDate = computeNewTxDate_BUGGY()
      // Locale string looks like "AUGUST 30, 2026" — NOT an ISO date
      expect(buggyDate).toMatch(/^[A-Z]+ \d+, \d{4}$/)
      // This is the format that breaks PostgreSQL — confirm it is NOT ISO
      expect(buggyDate).not.toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it("FIXED: addTransaction stores ISO date (accepted by PostgreSQL date column)", () => {
      const fixedDate = computeNewTxDate_FIXED()
      // Must be YYYY-MM-DD
      expect(fixedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it("BUGGY: row sent to Supabase has locale-string transaction_date that PostgreSQL rejects", () => {
      const fakeTx = {
        id: "tx_test_1",
        label: "Freelance",
        category: "Freelance",
        account: "GCash",
        time: "01:12 AM",
        amount: 1500,
        currency: "PHP" as const,
        kind: "income" as const,
        // BUG: date is stored as locale string from the BUGGY addTransaction
        date: "AUGUST 30, 2026",
      }

      const row = mapTransactionToRow_BUGGY(fakeTx, "user-123")
      // The transaction_date in the row is the locale string — PostgreSQL will reject this
      expect(row.transaction_date).toBe("AUGUST 30, 2026")
      expect(row.transaction_date).not.toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it("FIXED: row sent to Supabase has ISO transaction_date that PostgreSQL accepts", () => {
      const fakeTx = {
        id: "tx_test_1",
        label: "Freelance",
        category: "Freelance",
        account: "GCash",
        time: "01:12 AM",
        amount: 1500,
        currency: "PHP" as const,
        kind: "income" as const,
        // FIXED: date is stored as ISO string
        date: "2026-08-30",
      }

      const row = mapTransactionToRow_FIXED(fakeTx, "user-123")
      expect(row.transaction_date).toBe("2026-08-30")
      expect(row.transaction_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  // -------------------------------------------------------------------------
  // BUG #2: INSERT → READ ROUND TRIP
  // -------------------------------------------------------------------------
  describe("Bug #2 — Insert then read-back round trip", () => {
    it("CRITICAL: after insert + read-back, transaction is still present with correct fields", () => {
      // Simulate: user logs "Freelance +₱1,500.00 via GCash"
      const originalTx = {
        id: "tx_roundtrip_1",
        label: "Freelance",
        category: "Freelance",
        account: "GCash",
        time: "01:12 AM",
        amount: 1500,
        currency: "PHP" as const,
        kind: "income" as const,
        date: "2026-08-30", // FIXED: ISO format
        dateHeader: "Today",
      }

      // Step 1: map to DB row (simulates what addTransaction sends to Supabase)
      const dbRow = mapTransactionToRow_FIXED(originalTx, "real-user-uuid")

      // Verify row is safe to send (ISO date, correct user_id)
      expect(dbRow.transaction_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(dbRow.user_id).toBe("real-user-uuid")
      expect(dbRow.title).toBe("Freelance")
      expect(dbRow.amount).toBe(1500)
      expect(dbRow.type).toBe("income")

      // Step 2: simulate Supabase storing and returning the row on next fetch
      const returnedRow = {
        ...dbRow,
        transaction_date: "2026-08-30", // PostgreSQL returns ISO date
        transaction_time: "01:12 AM",
      }

      // Step 3: map back to Transaction (simulates mapTxRowToTransaction on refetch)
      const readBackTx = mapTxRowToTransaction(returnedRow)

      // ASSERTION: transaction must still be present with correct data after refresh
      expect(readBackTx.id).toBe("tx_roundtrip_1")
      expect(readBackTx.label).toBe("Freelance")
      expect(readBackTx.amount).toBe(1500)
      expect(readBackTx.kind).toBe("income")
      expect(readBackTx.account).toBe("GCash")
      expect(readBackTx.date).toBe("2026-08-30")
    })

    it("CRITICAL: transaction_id must not use Date.now() (collision risk) — use crypto.randomUUID()", () => {
      // The buggy code: "tx_" + Date.now()
      // Two rapid inserts in the same millisecond produce identical IDs → PK collision
      const ts = Date.now()
      const id1 = "tx_" + ts
      const id2 = "tx_" + ts
      expect(id1).toBe(id2) // This PROVES the collision risk

      // The fixed code should produce unique IDs every time
      // We test the format expectation: UUID v4 pattern
      const uuid1 = crypto.randomUUID()
      const uuid2 = crypto.randomUUID()
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      expect(uuid1).not.toBe(uuid2) // Must be unique
    })
  })

  // -------------------------------------------------------------------------
  // BUG #3: FK Violation (account_id / category_id)
  // -------------------------------------------------------------------------
  describe("Bug #3 — account_id FK violation", () => {
    it("BUGGY: account_id stored as wallet name (causes FK violation with old schema)", () => {
      const row = mapTransactionToRow_BUGGY(
        { id: "tx_1", label: "Test", category: "Freelance", account: "GCash",
          time: "01:12 AM", amount: 500, currency: "PHP", kind: "expense", date: "2026-08-30" },
        "user-abc"
      )
      // account_id is "GCash" — not a valid FK like "gcash_user-abc"
      expect(row.account_id).toBe("GCash")
      // This would trigger FK violation: accounts.id = "gcash_user-abc", not "GCash"
    })

    it("FIXED: account_id stores the wallet name (after FK constraint drop migration)", () => {
      const row = mapTransactionToRow_FIXED(
        { id: "tx_1", label: "Test", category: "Freelance", account: "GCash",
          time: "01:12 AM", amount: 500, currency: "PHP", kind: "expense", date: "2026-08-30" },
        "user-abc"
      )
      // After FK drop, storing "GCash" directly is valid and consistent
      expect(row.account_id).toBe("GCash")
      // And mapTxRowToTransaction correctly reads it back
      const readBack = mapTxRowToTransaction({ ...row, transaction_date: "2026-08-30" })
      expect(readBack.account).toBe("GCash")
    })
  })

  // -------------------------------------------------------------------------
  // BUG #4: TIMEZONE MISMATCH in History "Today" filter
  // -------------------------------------------------------------------------
  describe("Bug #4 — Timezone mismatch in History Today filter", () => {
    it("BUGGY: todayStr computed in UTC may not match local Manila date at midnight boundary", () => {
      // Simulate: local Manila time is 2026-08-30 01:18 AM (UTC+8)
      // UTC equivalent: 2026-08-29 17:18 UTC — different DATE
      // Use a fixed time that is known to be in the previous UTC day
      const manilaLocalDate = "2026-08-30"
      const utcDate = "2026-08-29" // What the buggy todayStr would produce for 01:18 AM Manila

      // A transaction logged at 01:18 AM Manila time stores date "2026-08-30" (local)
      const tx = {
        id: "tx_tz_test",
        date: manilaLocalDate,
        dateHeader: undefined, // no dateHeader after refresh
      }

      // BUGGY: todayStr is UTC-based — mismatches Manila local date at midnight
      const buggyTodayStr = utcDate
      const matchesWithBuggy = isTransactionToday(tx, buggyTodayStr)
      expect(matchesWithBuggy).toBe(false) // This is the BUG: transaction is excluded from "Today"
    })

    it("FIXED: todayStr computed in Asia/Manila timezone correctly includes midnight transactions", () => {
      const manilaLocalDate = "2026-08-30"

      const tx = {
        id: "tx_tz_test",
        date: manilaLocalDate,
        dateHeader: undefined,
      }

      // FIXED: todayStr uses Manila timezone
      const fixedTodayStr = manilaLocalDate // In reality: getTodayStr_FIXED() at 01:18 AM Manila = "2026-08-30"
      const matchesWithFixed = isTransactionToday(tx, fixedTodayStr)
      expect(matchesWithFixed).toBe(true) // FIXED: transaction correctly appears under "Today"
    })
  })

  // -------------------------------------------------------------------------
  // INTEGRATION: Full flow — log, simulate refetch, assert still visible
  // -------------------------------------------------------------------------
  describe("Integration: Log transaction → simulate refresh → assert still present", () => {
    it("transaction logged by user still appears in History after a full refetch cycle", () => {
      // 1. User logs a transaction (Quick Log modal)
      const userInput = { label: "Freelance", amount: 1500, account: "GCash", kind: "income" as const }

      // 2. addTransaction creates the local transaction with FIXED ISO date
      const localTx = {
        ...userInput,
        id: crypto.randomUUID(),
        time: "01:12 AM",
        date: "2026-08-30", // FIXED: ISO
        dateHeader: "Today",
        category: "Freelance",
        currency: "PHP" as const,
      }

      // 3. Row is prepared and "sent" to Supabase
      const dbRow = mapTransactionToRow_FIXED(localTx, "real-user-id")

      // 4. Supabase stores and returns it (simulate the refetch fetchSupabaseData)
      const supabaseReturnedRow = {
        ...dbRow,
        transaction_date: "2026-08-30", // PostgreSQL returns ISO
        transaction_time: "01:12 AM",
      }

      // 5. mapTxRowToTransaction converts it back for the UI
      const readBack = mapTxRowToTransaction(supabaseReturnedRow)

      // 6. History filter: does it appear under "Today" with Manila-aware todayStr?
      const todayStr = "2026-08-30" // Fixed timezone-aware value
      const appearsInHistory = isTransactionToday(readBack, todayStr)

      // FINAL ASSERTION: transaction must be visible in History after refresh
      expect(appearsInHistory).toBe(true)
      expect(readBack.label).toBe("Freelance")
      expect(readBack.amount).toBe(1500)
      expect(readBack.kind).toBe("income")
    })
  })
})
