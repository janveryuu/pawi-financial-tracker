"use client"

import { useState } from "react"
import { ChevronLeft, Plus, Tag as TagIcon, Trash2, X } from "lucide-react"
import { Tag } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"

interface PlanTagsScreenProps {
  onBack: () => void
}

const COLOR_PRESETS = ["#E53E3E", "#3D784E", "#1A73E8", "#D97706", "#8B5CF6", "#0D9488", "#EC4899"]

export function PlanTagsScreen({ onBack }: PlanTagsScreenProps) {
  const { tags, addTag, deleteTag } = useStore()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [label, setLabel] = useState("")
  const [color, setColor] = useState(COLOR_PRESETS[0])

  const handleAddTag = () => {
    if (!label.trim()) return
    addTag({
      label: label.trim(),
      color,
      count: 0,
    })
    setLabel("")
    setIsAddOpen(false)
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-2 pb-28 min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-card text-foreground hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-black text-foreground">Tags Manager</h2>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#3D784E]/30 bg-[#3D784E]/10 text-[#3D784E] hover:bg-[#3D784E]/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Tags grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {tags.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-2xl border border-border/70 bg-card p-3.5 shadow-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: t.color || "#3D784E" }}
              />
              <div className="min-w-0">
                <p className="text-xs font-black text-foreground truncate">{t.label}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{t.count || 0} uses</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => deleteTag(t.id)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold text-foreground">Add Custom Tag</h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Tag Label
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Work, Groceries, Date Night"
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#3D784E]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Color Accent
                </label>
                <div className="mt-2 flex gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="h-7 w-7 rounded-full transition-transform active:scale-90"
                      style={{
                        backgroundColor: c,
                        border: color === c ? "2.5px solid #fff" : "none",
                        boxShadow: color === c ? "0 0 0 2px #3D784E" : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddTag}
                className="flex-1 rounded-xl bg-[#3D784E] py-2.5 text-xs font-black text-white hover:bg-[#356B46]"
              >
                Create Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
