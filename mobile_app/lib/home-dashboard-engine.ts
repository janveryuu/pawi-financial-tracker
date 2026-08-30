import { Transaction, Goal, Budget, PlannedPayment, formatMoney } from "./pawi-data"
import { UserProfile } from "./use-profile"
import { PaydayCountdownInfo } from "./store"

export interface DaySpend {
  day: string
  dateStr: string
  isToday: boolean
  income: number
  expense: number
  height: number
}

export interface HomeHeroMetrics {
  weeklyIncome: number
  weeklyExpense: number
  weeklyNet: number
  isPositive: boolean
  days: DaySpend[]
  callout: string
  calloutSubtext?: string
  trendPercentVsLastWeek?: number
  bestDayLabel?: string
}

export interface SpotlightItem {
  id: string
  type: "goal" | "budget"
  title: string
  subtitle: string
  current: number
  target: number
  remaining: number
  percent: number
  accent: string
  icon?: string
  statusLabel: string
  statusType: "success" | "warning" | "caution" | "neutral"
  ctaLabel: string
}

export interface GoalBudgetSpotlight {
  hasData: boolean
  items: SpotlightItem[]
}

export interface PacingMetrics {
  isConfigured: boolean
  type: "allowance" | "payday" | "unconfigured"
  title: string
  totalBudget: number
  spent: number
  remaining: number
  percentSpent: number
  percentTimeElapsed: number
  statusText: string
  statusTone: "healthy" | "warning" | "critical"
  daysRemaining?: number
  formattedTargetDate?: string
  dailySpendable?: number
}

export interface QuickInsight {
  hasData: boolean
  tag: string
  title: string
  body: string
  iconName: "sparkles" | "trending-up" | "alert-triangle" | "shield-check" | "calendar"
  accentColor: string
}

// ---------------------------------------------------------------------------------
// 1. "This Week At a Glance" Hero Metrics
// ---------------------------------------------------------------------------------
export function computeHomeHeroMetrics(
  transactions: Transaction[],
  referenceDate: Date = new Date()
): HomeHeroMetrics {
  const dayLetters = ["S", "M", "T", "W", "T", "F", "S"]
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const days: DaySpend[] = []

  let weeklyIncome = 0
  let weeklyExpense = 0

  // Build the 7 rolling days ending on referenceDate (Today)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(referenceDate)
    d.setDate(referenceDate.getDate() - i)
    const dateStr = d.toISOString().split("T")[0]
    const dayIdx = d.getDay()

    const dayIncome = transactions
      .filter((t) => t.kind === "income" && t.date && t.date.startsWith(dateStr))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)

    const dayExpense = transactions
      .filter((t) => t.kind === "expense" && t.date && t.date.startsWith(dateStr))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)

    weeklyIncome += dayIncome
    weeklyExpense += dayExpense

    days.push({
      day: dayLetters[dayIdx],
      dateStr,
      isToday: i === 0,
      income: dayIncome,
      expense: dayExpense,
      height: 8,
    })
  }

  const maxDailyExpense = Math.max(...days.map((d) => d.expense), 0)
  const daysWithHeights = days.map((d) => ({
    ...d,
    height: maxDailyExpense > 0
      ? Math.max(15, Math.min(100, Math.round((d.expense / maxDailyExpense) * 100)))
      : 8,
  }))

  const weeklyNet = weeklyIncome - weeklyExpense
  const isPositive = weeklyNet >= 0

  // Compute Previous Week's Expenses for trend comparison
  let previousWeekExpense = 0
  for (let i = 13; i >= 7; i--) {
    const d = new Date(referenceDate)
    d.setDate(referenceDate.getDate() - i)
    const dateStr = d.toISOString().split("T")[0]

    const dayExp = transactions
      .filter((t) => t.kind === "expense" && t.date && t.date.startsWith(dateStr))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)

    previousWeekExpense += dayExp
  }

  let trendPercentVsLastWeek: number | undefined
  if (previousWeekExpense > 0 && weeklyExpense > 0) {
    const diff = weeklyExpense - previousWeekExpense
    trendPercentVsLastWeek = Math.round((diff / previousWeekExpense) * 100)
  }

  // Generate Standout Callout Line
  let callout = "Ready to log your first transaction today?"
  let calloutSubtext = "Start tracking every peso slow and steady 🐢"
  let bestDayLabel: string | undefined

  if (transactions.length === 0) {
    callout = "Ready to start your weekly tracker?"
    calloutSubtext = "Log transactions to unlock real-time spending insights."
  } else if (weeklyExpense === 0 && weeklyIncome > 0) {
    callout = "Zero expenses logged this week! 🎉"
    calloutSubtext = `You received ${formatMoney(weeklyIncome)} with 100% saved so far.`
  } else if (weeklyExpense > 0) {
    // Find lowest spend day with active tracking
    const nonZeroDays = days.filter((d) => d.expense > 0)
    if (nonZeroDays.length > 0) {
      const lowestDay = nonZeroDays.reduce((min, cur) => (cur.expense < min.expense ? cur : min), nonZeroDays[0])
      const dayDate = new Date(lowestDay.dateStr)
      const dayName = dayNames[dayDate.getDay()]
      bestDayLabel = dayName
    }

    if (trendPercentVsLastWeek !== undefined && trendPercentVsLastWeek < 0) {
      callout = `You're spending ${Math.abs(trendPercentVsLastWeek)}% less than last week! 👏`
      calloutSubtext = "Solid budget discipline. Keep your momentum going."
    } else if (trendPercentVsLastWeek !== undefined && trendPercentVsLastWeek > 25) {
      callout = `Spending is up +${trendPercentVsLastWeek}% vs last week`
      calloutSubtext = "Review non-essential expenses to keep savings safe."
    } else if (bestDayLabel) {
      callout = `Your thriftiest day this week was ${bestDayLabel}`
      calloutSubtext = `Net position is currently ${isPositive ? "+" : ""}${formatMoney(weeklyNet)}.`
    } else {
      callout = isPositive
        ? "You're in the green zone this week! 💚"
        : "Expenses exceeded income this week ⚠️"
      calloutSubtext = `Net flow is ${formatMoney(weeklyNet)}.`
    }
  }

  return {
    weeklyIncome,
    weeklyExpense,
    weeklyNet,
    isPositive,
    days: daysWithHeights,
    callout,
    calloutSubtext,
    trendPercentVsLastWeek,
    bestDayLabel,
  }
}

// ---------------------------------------------------------------------------------
// 2. Goal & Budget Spotlight (The Primary Hook)
// ---------------------------------------------------------------------------------
export function computeGoalBudgetSpotlight(
  goals: Goal[] = [],
  budgets: Budget[] = []
): GoalBudgetSpotlight {
  const items: SpotlightItem[] = []

  // 1. Process Goals
  for (const g of goals) {
    const target = Number(g.target) || 1
    const saved = Number(g.saved) || 0
    const percent = Math.min(100, Math.round((saved / target) * 100))
    const remaining = Math.max(0, target - saved)

    let statusLabel = "In Progress"
    let statusTone: SpotlightItem["statusType"] = "neutral"

    if (percent >= 100) {
      statusLabel = "Goal Reached! 🏆"
      statusTone = "success"
    } else if (percent >= 80) {
      statusLabel = "Almost there! 🎯"
      statusTone = "success"
    } else if (percent >= 50) {
      statusLabel = "Halfway mark! 🚀"
      statusTone = "neutral"
    } else {
      statusLabel = "Growing steady 🐢"
      statusTone = "neutral"
    }

    items.push({
      id: `goal-${g.id}`,
      type: "goal",
      title: g.name,
      subtitle: remaining === 0 ? "Goal achieved" : `${formatMoney(remaining)} left to target`,
      current: saved,
      target,
      remaining,
      percent,
      accent: g.accent || "#3D784E",
      icon: g.icon || "🎯",
      statusLabel,
      statusType: statusTone,
      ctaLabel: percent >= 100 ? "Review Goal" : "+ Deposit Funds",
    })
  }

  // 2. Process Budgets
  for (const b of budgets) {
    const limit = Number(b.limit) || 1
    const spent = Number(b.spent) || 0
    const percent = Math.round((spent / limit) * 100)
    const remaining = limit - spent

    let statusLabel = "On Track"
    let statusTone: SpotlightItem["statusType"] = "neutral"

    if (spent >= limit) {
      statusLabel = "Over Budget ⚠️"
      statusTone = "caution"
    } else if (percent >= 80) {
      statusLabel = "Approaching limit ⚠️"
      statusTone = "warning"
    } else {
      statusLabel = "Healthy Pace 💚"
      statusTone = "success"
    }

    items.push({
      id: `budget-${b.id}`,
      type: "budget",
      title: `${b.category} Budget`,
      subtitle: remaining < 0 ? `${formatMoney(Math.abs(remaining))} over limit` : `${formatMoney(remaining)} remaining`,
      current: spent,
      target: limit,
      remaining: Math.max(0, remaining),
      percent: Math.min(100, percent),
      accent: b.accent || (percent >= 80 ? "#E53E3E" : "#3D784E"),
      icon: b.icon || "🍽️",
      statusLabel,
      statusType: statusTone,
      ctaLabel: "Manage Budget",
    })
  }

  // Sort items to put the most urgent / interesting item first:
  // - High priority: At-risk budgets (>=80%), Goals near completion (>=80%), then active goals
  items.sort((a, b) => {
    if (a.statusType === "caution" && b.statusType !== "caution") return -1
    if (b.statusType === "caution" && a.statusType !== "caution") return 1
    if (a.statusType === "warning" && b.statusType !== "warning") return -1
    if (b.statusType === "warning" && a.statusType !== "warning") return 1
    return b.percent - a.percent
  })

  return {
    hasData: items.length > 0,
    items,
  }
}

// ---------------------------------------------------------------------------------
// 3. Allowance & Payday Pacing Tool
// ---------------------------------------------------------------------------------
export function computePacingMetrics(
  profile?: UserProfile | null,
  transactions: Transaction[] = [],
  paydayCountdown?: PaydayCountdownInfo | null,
  referenceDate: Date = new Date()
): PacingMetrics {
  const isStudent = profile?.profile_type === "student" || profile?.profile_type === "working_student" || (profile?.weekly_allowance || 0) > 0
  const allowance = Number(profile?.weekly_allowance) || 0

  if (isStudent && allowance > 0) {
    // Determine start of current week (Monday)
    const dayOfWeek = referenceDate.getDay() // 0 = Sun, 1 = Mon ...
    const diffToMonday = (dayOfWeek + 6) % 7 // Monday = 0, Sun = 6
    const monday = new Date(referenceDate)
    monday.setDate(referenceDate.getDate() - diffToMonday)
    const mondayStr = monday.toISOString().split("T")[0]

    // Sum expenses from Monday to today
    const spentThisWeek = transactions
      .filter((t) => t.kind === "expense" && t.date && t.date >= mondayStr)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)

    const remaining = Math.max(0, allowance - spentThisWeek)
    const percentSpent = Math.min(100, Math.round((spentThisWeek / allowance) * 100))
    const daysElapsed = diffToMonday + 1 // 1 on Monday, 7 on Sunday
    const percentTimeElapsed = Math.round((daysElapsed / 7) * 100)

    let statusText = "Pacing on track 🐢"
    let statusTone: PacingMetrics["statusTone"] = "healthy"

    if (spentThisWeek > allowance) {
      statusText = "Over allowance by " + formatMoney(spentThisWeek - allowance)
      statusTone = "critical"
    } else if (percentSpent > percentTimeElapsed + 15) {
      statusText = "Pacing ahead of week schedule"
      statusTone = "warning"
    } else {
      statusText = `${formatMoney(remaining)} left for ${7 - daysElapsed} days`
      statusTone = "healthy"
    }

    const daysLeft = Math.max(1, 7 - daysElapsed)
    const dailySpendable = Math.round(remaining / daysLeft)

    return {
      isConfigured: true,
      type: "allowance",
      title: "Weekly Baon Pacing",
      totalBudget: allowance,
      spent: spentThisWeek,
      remaining,
      percentSpent,
      percentTimeElapsed,
      statusText,
      statusTone,
      dailySpendable,
    }
  }

  if (paydayCountdown?.configured) {
    const daysRemaining = paydayCountdown.daysRemaining ?? 0
    const targetAmount = paydayCountdown.amount || 0

    return {
      isConfigured: true,
      type: "payday",
      title: "Days Until Payday",
      totalBudget: targetAmount,
      spent: 0,
      remaining: targetAmount,
      percentSpent: 0,
      percentTimeElapsed: 0,
      statusText: daysRemaining === 0 ? "Payday is today! 🎉" : `${daysRemaining} days remaining`,
      statusTone: "healthy",
      daysRemaining,
      formattedTargetDate: paydayCountdown.formattedDate,
    }
  }

  return {
    isConfigured: false,
    type: "unconfigured",
    title: "Payday / Allowance Pacing",
    totalBudget: 0,
    spent: 0,
    remaining: 0,
    percentSpent: 0,
    percentTimeElapsed: 0,
    statusText: "Configure your schedule to track pacing",
    statusTone: "healthy",
  }
}

// ---------------------------------------------------------------------------------
// 4. Quick Insight / Nudge (Genuinely computed from real data)
// ---------------------------------------------------------------------------------
export function computeQuickInsight(
  transactions: Transaction[] = [],
  goals: Goal[] = [],
  budgets: Budget[] = [],
  plannedPayments: PlannedPayment[] = [],
  profile?: UserProfile | null
): QuickInsight {
  if (transactions.length === 0) {
    return {
      hasData: false,
      tag: "GETTING STARTED",
      title: "Your financial co-pilot is ready",
      body: "Log a few transactions and Pawi will start spotting spending patterns and savings opportunities for you.",
      iconName: "sparkles",
      accentColor: "#3D784E",
    }
  }

  // 1. Check for top category concentration this week
  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(now.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0]

  const recentExpenses = transactions.filter(
    (t) => t.kind === "expense" && t.date && t.date >= sevenDaysAgoStr
  )

  const totalRecentExpense = recentExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0)

  if (totalRecentExpense > 0) {
    const categoryTotals: Record<string, number> = {}
    for (const t of recentExpenses) {
      const cat = t.category || "General"
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount || 0)
    }

    const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])
    const [topCat, topCatAmount] = sortedCats[0]
    const topCatShare = Math.round((topCatAmount / totalRecentExpense) * 100)

    if (topCatShare >= 40 && topCatAmount > 300) {
      return {
        hasData: true,
        tag: "SPENDING PATTERN",
        title: `${topCat} is your #1 expense this week`,
        body: `You've spent ${formatMoney(topCatAmount)} on ${topCat} (${topCatShare}% of your total week spend).`,
        iconName: "trending-up",
        accentColor: "#EA580C",
      }
    }
  }

  // 2. Check for Near-Completion Goal
  const closeGoal = goals.find((g) => g.target > 0 && g.saved / g.target >= 0.75 && g.saved < g.target)
  if (closeGoal) {
    const remaining = closeGoal.target - closeGoal.saved
    return {
      hasData: true,
      tag: "GOAL MILESTONE",
      title: `${closeGoal.name} is almost funded! 🎯`,
      body: `Just ${formatMoney(remaining)} more to hit your ${formatMoney(closeGoal.target)} goal. You're ${Math.round((closeGoal.saved / closeGoal.target) * 100)}% there!`,
      iconName: "sparkles",
      accentColor: "#3D784E",
    }
  }

  // 3. Check for Upcoming Bill Coverage
  const totalUpcoming = plannedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  if (totalUpcoming > 0) {
    return {
      hasData: true,
      tag: "BILL READINESS",
      title: `${plannedPayments.length} upcoming bill${plannedPayments.length > 1 ? "s" : ""} queued`,
      body: `Total planned payments: ${formatMoney(totalUpcoming)}. Keep enough buffer in your primary wallet.`,
      iconName: "calendar",
      accentColor: "#0284C7",
    }
  }

  // Fallback active insight
  return {
    hasData: true,
    tag: "FINANCIAL MOMENTUM",
    title: "Tracking consistency pays off",
    body: `You have ${transactions.length} total logged transactions. Regular check-ins build long-term financial security.`,
    iconName: "shield-check",
    accentColor: "#3D784E",
  }
}

// ---------------------------------------------------------------------------------
// 5. Data-Driven Mascot Dialogue by Account Maturity
// ---------------------------------------------------------------------------------
export function computeMascotDialogue(params: {
  transactions: Transaction[]
  goals: Goal[]
  budgets: Budget[]
  streakDays: number
  hour: number
  isOverspending: boolean
  paydayCountdown?: PaydayCountdownInfo | null
}): string[] {
  const { transactions, goals, budgets, streakDays, hour, isOverspending, paydayCountdown } = params
  const list: string[] = []

  // Case A: Brand New Account (0-2 transactions)
  if (transactions.length <= 2) {
    list.push(
      "Welcome sa Pawi! 🐢 I-log ang iyong unang gastos para simulan ang iyong financial tracking habit.",
      "Tip: Lahat ng data mo ay private at encrypted. Subukan i-scan ang iyong resibo gamit ang AI button!",
      "Mag-set ng unang Savings Goal sa Plan tab para makita ang progress mo araw-araw."
    )
    return list
  }

  // Case B: Overspending / Budget Alert
  if (isOverspending) {
    list.push(
      "Medyo mataas ang gastos natin today, idol! Essentials muna bago mag-add to cart.",
      "Nasa red zone tayo ngayon. Konting hinay-hinay muna sa cravings para protektado ang ipon!",
      "Double-check natin ang mga binili today, baka may unnecessary expenses na pwedeng iwasan."
    )
  } else {
    list.push(
      "Nasa green zone ka ngayon! Proud ako sa'yo, kontrolado mo ang finances mo.",
      "Ganda ng cashflow natin today! Tuloy-tuloy lang para lumaki pa ang savings mo.",
      "Basta may natitira sa budget, panalo ka! Good job sa disiplina sa paggastos."
    )
  }

  // Case C: Streak Milestones
  if (streakDays >= 7) {
    list.push(`Grabe ang ${streakDays}-day streak mo! Certified disciplined tracker ka na talaga! 🔥`)
  } else if (streakDays >= 3) {
    list.push(`x${streakDays} streak! Tuloy-tuloy lang ang daily tracking habit natin.`)
  }

  // Case D: Goal / Budget Check
  const completedGoals = goals.filter((g) => g.saved >= g.target)
  if (completedGoals.length > 0) {
    list.push(`Naabot mo na ang goal na "${completedGoals[0].name}"! Super proud si Pawi sa'yo! 🏆`)
  }

  // Case E: Time-of-day contextual greeting
  if (hour >= 5 && hour < 12) {
    list.push("Magandang umaga! Simulan ang araw nang may plano sa budget para iwas-overspend.")
  } else if (hour >= 12 && hour < 18) {
    list.push("Kumain ka na ba ng lunch? I-log agad ang resibo gamit ang quick log button!")
  } else {
    list.push("Magandang gabi! Balikan ang mga nagastos today at i-review ang wallet balance bago matulog.")
  }

  return list
}
