import { useEffect, useState } from "react"
import { Moon, Sun, Sunrise } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export function GreetingCard() {
  const { user } = useAuth()
  const [greeting, setGreeting] = useState("Hello, Night Owl")
  const [Icon, setIcon] = useState(Moon)
  
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) {
      setGreeting("Good Morning, Early Bird")
      setIcon(Sunrise)
    } else if (hour >= 12 && hour < 18) {
      setGreeting("Good Afternoon")
      setIcon(Sun)
    } else {
      setGreeting("Hello, Night Owl")
      setIcon(Moon)
    }
  }, [])

  const name = user?.displayName || user?.email?.split('@')[0] || "Janveryu"

  return (
    <div className="flex items-start gap-3 rounded-3xl bg-accent/60 p-4">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0">
        <h1 className="text-balance text-base font-semibold leading-snug text-foreground capitalize">
          {greeting}, {name}!
        </h1>
        <p className="mt-0.5 text-pretty text-sm leading-relaxed text-muted-foreground">
          Your finances are looking steady. Keep tracking, keep growing.
        </p>
      </div>
    </div>
  )
}
