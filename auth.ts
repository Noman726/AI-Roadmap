import NextAuth from "next-auth"

// This is a placeholder auth configuration
// The app uses custom auth via auth-context.tsx for client-side auth
export const handlers = {
  GET: async () => new Response("Auth not configured", { status: 404 }),
  POST: async () => new Response("Auth not configured", { status: 404 }),
}
