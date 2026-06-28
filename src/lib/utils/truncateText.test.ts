import { truncateText } from "../utils"

describe("truncateText", () => {
  it("returns full text when shorter than maxLength", () => {
    expect(truncateText("Hello", 10)).toBe("Hello")
    expect(truncateText("Hello", 5)).toBe("Hello")
  })

  it("returns truncated text with ellipsis when longer than maxLength", () => {
    expect(truncateText("HelloWorld", 5)).toBe("Hello...")
    expect(truncateText("こんにちは世界", 3)).toBe("こんにち...")
  })

  it("returns empty string when maxLength is less than or equal to 0", () => {
    expect(truncateText("Hello", 0)).toBe("")
    expect(truncateText("Hello", -1)).toBe("")
    expect(truncateText("", 0)).toBe("")
  })

  it("handles empty string input", () => {
    expect(truncateText("", 5)).toBe("")
  })

  it("handles boundary values", () => {
    expect(truncateText("A", 1)).toBe("A")
    expect(truncateText("AB", 1)).toBe("A...")
    expect(truncateText("Test", 100)).toBe("Test")
  })
})
