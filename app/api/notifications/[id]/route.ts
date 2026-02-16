import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

interface RouteParams {
  params: {
    id: string
  }
}

// Helper to get user from request
async function getUserFromRequest(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id")
    
    if (!userId) {
      return null
    }

    // Try to find user in database
    let user = await prisma.user.findUnique({
      where: { id: userId },
    })

    // If user doesn't exist in DB (localStorage user), create a minimal record
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: `user_${userId}@localhost`,
          name: `User ${userId.substring(0, 8)}`,
          password: "", // Empty password since this is a placeholder user
        },
      }).catch(() => null) // Ignore if user already exists (race condition)

      // If creation failed, try to fetch again
      if (!user) {
        user = await prisma.user.findUnique({
          where: { id: userId },
        })
      }
    }

    return user
  } catch (error) {
    console.error("Error getting user from request:", error)
    return null
  }
}

// PUT mark notification as read
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUserFromRequest(req)
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Verify the notification belongs to the user
    const notification = await prisma.notification.findUnique({
      where: { id: params.id },
    })

    if (!notification || notification.userId !== user.id) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      )
    }

    const { read } = await req.json()

    const updatedNotification = await prisma.notification.update({
      where: { id: params.id },
      data: { read: read ?? true },
    })

    return NextResponse.json({ notification: updatedNotification })
  } catch (error) {
    console.error("Error updating notification:", error)
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    )
  }
}

// DELETE notification
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUserFromRequest(req)
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Verify the notification belongs to the user
    const notification = await prisma.notification.findUnique({
      where: { id: params.id },
    })

    if (!notification || notification.userId !== user.id) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      )
    }

    await prisma.notification.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    )
  }
}
