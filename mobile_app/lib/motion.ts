/**
 * iOS-Grade Motion & Physics Tokens for Pawi
 * Built to match native Apple iOS fluid springs, responsive sheets, and tactile interactions.
 */

export const IOS_SPRING = {
  // Standard sheet presentation & modal popup
  sheet: {
    type: "spring",
    stiffness: 380,
    damping: 30,
    mass: 0.8,
  },
  // Snappy button / card press feedback
  tactile: {
    type: "spring",
    stiffness: 500,
    damping: 28,
  },
  // Smooth tab bar cross-fade and indicator slide
  tab: {
    type: "spring",
    stiffness: 450,
    damping: 32,
  },
  // Bouncy mascot & tip banner reactions
  bouncy: {
    type: "spring",
    stiffness: 400,
    damping: 18,
  },
  // Gentle list item cascade
  stagger: {
    type: "spring",
    stiffness: 300,
    damping: 24,
  },
} as const

// Standard Apple iOS cubic bezier easing curves
export const IOS_EASING = {
  standard: [0.32, 0.72, 0, 1], // iOS primary decelerate curve
  enter: [0.16, 1, 0.3, 1],      // Quick fluid entrance
  exit: [0.7, 0, 0.84, 0],       // Fast exit
} as const

export const IOS_VARIANTS = {
  // Bottom sheet slide up with backdrop
  bottomSheet: {
    hidden: { y: "100%", opacity: 0.6 },
    visible: {
      y: 0,
      opacity: 1,
      transition: IOS_SPRING.sheet,
    },
    exit: {
      y: "100%",
      opacity: 0,
      transition: { duration: 0.22, ease: IOS_EASING.exit },
    },
  },
  // Dialog zoom & fade
  dialog: {
    hidden: { scale: 0.94, opacity: 0, y: 10 },
    visible: {
      scale: 1,
      opacity: 1,
      y: 0,
      transition: IOS_SPRING.sheet,
    },
    exit: {
      scale: 0.95,
      opacity: 0,
      y: 8,
      transition: { duration: 0.18, ease: IOS_EASING.exit },
    },
  },
  // Card / button tap scale
  tapFeedback: {
    scale: 0.97,
    opacity: 0.92,
    transition: { duration: 0.1 },
  },
} as const
