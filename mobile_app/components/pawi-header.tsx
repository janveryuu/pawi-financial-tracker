"use client"

import { useState } from "react"
import Image from "next/image"
import { Bell } from "lucide-react"
import { NotificationsPanel, useSmartNotifications } from "./notifications-panel"

export function PawiHeader() {
  const [notifOpen, setNotifOpen] = useState(false)
  const notifications = useSmartNotifications()
  
  const unreadCount = notifications.filter(n => n.id !== "all-good").length

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/80 px-5 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary/15 ring-1 ring-primary/20">
            <Image
              src="/pawikan-logo.png"
              alt="Pawi the turtle mascot"
              width={32}
              height={32}
              className="h-8 w-8 object-contain drop-shadow-sm"
            />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Pawi
          </span>
        </div>
        <button
          type="button"
          aria-label="Notifications"
          onClick={() => setNotifOpen(true)}
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-accent"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute right-0 top-0 flex h-3 w-3 items-center justify-center rounded-full bg-destructive ring-2 ring-background">
            </span>
          )}
        </button>
      </header>

      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  )
}
