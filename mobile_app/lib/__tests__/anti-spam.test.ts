import {
  hasConsecutiveSpam,
  sanitizeSpam,
  sanitizeNumericInput,
  isValidPositiveAmount,
  MAX_LENGTH,
} from "../anti-spam"

describe("Anti-Spam & Input Validation Utilities", () => {
  describe("hasConsecutiveSpam", () => {
    it("returns false for normal text with <= 3 consecutive identical characters", () => {
      expect(hasConsecutiveSpam("Janver")).toBe(false)
      expect(hasConsecutiveSpam("Coffee")).toBe(false)
      expect(hasConsecutiveSpam("aaa")).toBe(false)
      expect(hasConsecutiveSpam("111")).toBe(false)
      expect(hasConsecutiveSpam("")).toBe(false)
      expect(hasConsecutiveSpam(null)).toBe(false)
    })

    it("returns true when >= 4 consecutive identical characters appear", () => {
      expect(hasConsecutiveSpam("Jay jjjjjjjjj")).toBe(true)
      expect(hasConsecutiveSpam("eeeeeeee")).toBe(true)
      expect(hasConsecutiveSpam("aaaa")).toBe(true)
      expect(hasConsecutiveSpam("P -----------------")).toBe(true)
      expect(hasConsecutiveSpam("3333")).toBe(true)
      expect(hasConsecutiveSpam("1111000")).toBe(true)
      expect(hasConsecutiveSpam("🐢🐢🐢🐢")).toBe(true)
      expect(hasConsecutiveSpam("\n\n\n\n")).toBe(true)
    })
  })

  describe("sanitizeSpam", () => {
    it("collapses >= 4 identical consecutive characters to 3", () => {
      expect(sanitizeSpam("aaaa")).toBe("aaa")
      expect(sanitizeSpam("Jay jjjjjjjjj")).toBe("Jay jjj")
      expect(sanitizeSpam("11111")).toBe("111")
      expect(sanitizeSpam("🐢🐢🐢🐢")).toBe("🐢🐢🐢")
    })

    it("enforces maxLength", () => {
      expect(sanitizeSpam("1234567890", 5)).toBe("12345")
      expect(sanitizeSpam("Janver", MAX_LENGTH.NAME)).toBe("Janver")
    })
  })

  describe("sanitizeNumericInput", () => {
    it("strips negative signs and invalid symbols", () => {
      expect(sanitizeNumericInput("-500")).toBe("500")
      expect(sanitizeNumericInput("-₱1,200.50")).toBe("1200.50")
    })

    it("collapses consecutive repeating digits >= 4 to 3", () => {
      expect(sanitizeNumericInput("333333")).toBe("333")
    })

    it("caps integer part to maxDigits (default 10)", () => {
      expect(sanitizeNumericInput("123456789012345")).toBe("1234567890")
      expect(sanitizeNumericInput("123456789012345.99")).toBe("1234567890.99")
    })
  })

  describe("isValidPositiveAmount", () => {
    it("returns true for valid positive numbers", () => {
      expect(isValidPositiveAmount("1500")).toBe(true)
      expect(isValidPositiveAmount(250)).toBe(true)
      expect(isValidPositiveAmount("0.50")).toBe(true)
      expect(isValidPositiveAmount("98765432")).toBe(true)
    })

    it("returns false for zero, negative numbers, empty strings, or NaN", () => {
      expect(isValidPositiveAmount("0")).toBe(false)
      expect(isValidPositiveAmount(0)).toBe(false)
      expect(isValidPositiveAmount("-100")).toBe(false)
      expect(isValidPositiveAmount(-50)).toBe(false)
      expect(isValidPositiveAmount("")).toBe(false)
      expect(isValidPositiveAmount("abc")).toBe(false)
      expect(isValidPositiveAmount(null)).toBe(false)
    })

    it("returns false for spamming amounts", () => {
      expect(isValidPositiveAmount("3333")).toBe(false)
      expect(isValidPositiveAmount("111111")).toBe(false)
    })

    it("returns false when exceeding max amount", () => {
      expect(isValidPositiveAmount("100000000000")).toBe(false)
    })
  })
})
