"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { PawiStoryModal } from "./pawi-story-modal"

export function PawiMascot({ hidden }: { hidden?: boolean } = {}) {
  const [open, setOpen] = useState(false)
  const [bouncing, setBouncing] = useState(false)
  const [isChatActive, setIsChatActive] = useState(false)

  useEffect(() => {
    const checkChat = () => {
      const chatEl = document.getElementById("chat-screen-container")
      setIsChatActive(!!chatEl)
    }
    checkChat()
    const observer = new MutationObserver(checkChat)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  if (hidden || isChatActive) return null

  const handleClick = () => {
    setBouncing(true)
    setTimeout(() => {
      setBouncing(false)
      setOpen(true)
    }, 400)
  }

  return (
    <>
      <button
        id="pawi-mascot-btn"
        onClick={handleClick}
        className={`fixed bottom-24 left-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 shadow-lg backdrop-blur-sm transition-transform ${bouncing ? "scale-125 rotate-12" : "hover:scale-110"}`}
        style={{
          animation: !bouncing ? "mascotFloat 4s ease-in-out infinite" : "none"
        }}
      >
        <Image 
          src="/pawi-happy.png" 
          alt="Pawi" 
          width={40} 
          height={40} 
          className="object-contain"
        />
      </button>

      <PawiStoryModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
