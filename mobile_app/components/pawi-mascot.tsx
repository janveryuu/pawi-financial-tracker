"use client"

import { useState } from "react"
import Image from "next/image"
import { PawiStoryModal } from "./pawi-story-modal"

export function PawiMascot() {
  const [open, setOpen] = useState(false)
  const [bouncing, setBouncing] = useState(false)

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
