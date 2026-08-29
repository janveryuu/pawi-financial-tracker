/**
 * pawi-tutorial-modal.tsx — Compatibility shim
 *
 * The full interactive spotlight tutorial is now handled by PawiSpotlightTour.
 * This file is kept so any imports continue to work without changes.
 */
"use client"

export interface PawiTutorialModalProps {
  open: boolean
  onClose: () => void
}

/**
 * @deprecated Use PawiSpotlightTour directly via page.tsx.
 * This shim renders nothing; the spotlight tour is managed at the page level.
 */
export function PawiTutorialModal(_props: PawiTutorialModalProps) {
  return null
}
