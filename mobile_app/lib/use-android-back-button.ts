"use client"

import { useEffect, useRef } from "react"

interface BackButtonHandlers {
  isModalOpen?: boolean
  onCloseModal?: () => void
  currentTab?: string
  onNavigateHome?: () => void
}

/**
 * useAndroidBackButton
 *
 * Intercepts Android hardware back button and swipe-back gestures.
 * 1. If any modal is open, pressing back closes the modal instead of exiting the app.
 * 2. If user is on a non-home tab and no modal is open, navigates back to Home tab.
 * 3. Keeps native back-button experience natural and predictable inside TWA / APK wrapper.
 */
export function useAndroidBackButton({
  isModalOpen = false,
  onCloseModal,
  currentTab,
  onNavigateHome,
}: BackButtonHandlers) {
  const modalOpenRef = useRef(isModalOpen)
  const closeModalRef = useRef(onCloseModal)
  const tabRef = useRef(currentTab)
  const navHomeRef = useRef(onNavigateHome)

  useEffect(() => {
    modalOpenRef.current = isModalOpen
    closeModalRef.current = onCloseModal
    tabRef.current = currentTab
    navHomeRef.current = onNavigateHome
  }, [isModalOpen, onCloseModal, currentTab, onNavigateHome])

  // Manage history state when modal opens
  useEffect(() => {
    if (typeof window === "undefined") return

    if (isModalOpen) {
      window.history.pushState({ pawiModal: true }, "")

      const handlePopState = (e: PopStateEvent) => {
        if (modalOpenRef.current && closeModalRef.current) {
          closeModalRef.current()
        }
      }

      window.addEventListener("popstate", handlePopState)
      return () => {
        window.removeEventListener("popstate", handlePopState)
      }
    }
  }, [isModalOpen])

  // Handle tab back navigation
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleTabPopState = (e: PopStateEvent) => {
      // If no modal was open, check if we should return to home tab
      if (!modalOpenRef.current && tabRef.current && tabRef.current !== "home" && navHomeRef.current) {
        navHomeRef.current()
      }
    }

    window.addEventListener("popstate", handleTabPopState)
    return () => {
      window.removeEventListener("popstate", handleTabPopState)
    }
  }, [])
}
