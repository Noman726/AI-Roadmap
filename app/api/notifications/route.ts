import { NextRequest, NextResponse } from "next/server"
import { prisma, resolveDbUserId } from "@/lib/db"

// Helper to get user from request
async function getUserFromRequest(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id")
    const email = req.headers.get("x-user-email")
    
    if (!userId) {
      return null
    }

    // Resolve the actual Prisma user ID (handles Firebase UID → Prisma CUID mapping)
    const dbUserId = await resolveDbUserId(userId, email)
    if (!dbUserId) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: dbUserId },
    })

    return user
  } catch (error) {
    console.error("Error getting user from request:", error)
    return null
  }
}

// GET all notifications for the current user
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    )
  }
}

// POST create a new notification
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { type, title, message, metadata } = await req.json()

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields: type, title, message" },
        { status: 400 }
      )
    }

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type,
        title,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    console.error("Error creating notification:", error)
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    )
  }
}
