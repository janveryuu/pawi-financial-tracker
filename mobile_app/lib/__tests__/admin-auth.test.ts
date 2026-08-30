import { AUTHORIZED_ADMIN_EMAIL, verifyAdminAuth } from "../admin-auth"

// Mock supabase client
jest.mock("../supabase", () => {
  return {
    createAdminClient: jest.fn(() => ({
      auth: {
        getUser: jest.fn((token: string) => {
          if (token === "valid_admin_token") {
            return Promise.resolve({
              data: {
                user: {
                  id: "admin-uuid-123",
                  email: "janvermanlapaz@gmail.com",
                },
              },
              error: null,
            })
          }
          if (token === "valid_regular_user_token") {
            return Promise.resolve({
              data: {
                user: {
                  id: "user-uuid-456",
                  email: "hacker@example.com",
                },
              },
              error: null,
            })
          }
          return Promise.resolve({
            data: { user: null },
            error: { message: "Invalid session" },
          })
        }),
      },
      from: jest.fn((table: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { user_id: "admin-uuid-123", email: "janvermanlapaz@gmail.com" },
          error: null,
        }),
        upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
        update: jest.fn().mockReturnThis(),
      })),
    })),
  }
})

describe("Admin Access Control Security Layer", () => {
  it("should have authorized admin email set strictly to janvermanlapaz@gmail.com", () => {
    expect(AUTHORIZED_ADMIN_EMAIL).toBe("janvermanlapaz@gmail.com")
  })

  it("should deny access with 401 when no token is supplied", async () => {
    const req = new Request("http://localhost:3000/api/admin/metrics", {
      headers: {},
    })

    const result = await verifyAdminAuth(req)
    expect(result.authorized).toBe(false)
    expect(result.status).toBe(401)
    expect(result.error).toContain("Missing authorization token")
  })

  it("should deny access with 401 when token is invalid or expired", async () => {
    const req = new Request("http://localhost:3000/api/admin/metrics", {
      headers: {
        authorization: "Bearer invalid_expired_token",
      },
    })

    const result = await verifyAdminAuth(req)
    expect(result.authorized).toBe(false)
    expect(result.status).toBe(401)
    expect(result.error).toContain("Invalid or expired session")
  })

  it("should deny access with 403 Forbidden when token belongs to another authenticated user", async () => {
    const req = new Request("http://localhost:3000/api/admin/metrics", {
      headers: {
        authorization: "Bearer valid_regular_user_token",
      },
    })

    const result = await verifyAdminAuth(req)
    expect(result.authorized).toBe(false)
    expect(result.status).toBe(403)
    expect(result.error).toContain("Forbidden")
  })

  it("should successfully grant access when authenticated as janvermanlapaz@gmail.com", async () => {
    const req = new Request("http://localhost:3000/api/admin/metrics", {
      headers: {
        authorization: "Bearer valid_admin_token",
      },
    })

    const result = await verifyAdminAuth(req)
    expect(result.authorized).toBe(true)
    expect(result.email).toBe("janvermanlapaz@gmail.com")
    expect(result.userId).toBe("admin-uuid-123")
  })
})
