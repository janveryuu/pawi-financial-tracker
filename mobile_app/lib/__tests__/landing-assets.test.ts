import fs from "fs"
import path from "path"

describe("Landing Screen Assets & Brand Verification", () => {
  const publicDir = path.resolve(__dirname, "../../public")

  it("verifies pawi-mascot-jumping.png exists and is non-empty", () => {
    const mascotPath = path.join(publicDir, "pawi-mascot-jumping.png")
    expect(fs.existsSync(mascotPath)).toBe(true)
    const stat = fs.statSync(mascotPath)
    expect(stat.size).toBeGreaterThan(100000)
  })

  it("verifies landing-bg-mangrove.jpg exists and is non-empty", () => {
    const bgPath = path.join(publicDir, "landing-bg-mangrove.jpg")
    expect(fs.existsSync(bgPath)).toBe(true)
    const stat = fs.statSync(bgPath)
    expect(stat.size).toBeGreaterThan(100000)
  })

  it("verifies root assets directory also contains the backup files", () => {
    const rootAssetsDir = path.resolve(__dirname, "../../../assets")
    const mascotPath = path.join(rootAssetsDir, "pawi-mascot-jumping.png")
    const bgPath = path.join(rootAssetsDir, "landing-bg-mangrove.jpg")

    expect(fs.existsSync(mascotPath)).toBe(true)
    expect(fs.existsSync(bgPath)).toBe(true)
  })
})
