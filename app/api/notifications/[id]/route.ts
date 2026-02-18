import { NextRequest, NextResponse } from "next/server"
import { requireAdminDb, serverTimestamp } from "@/lib/firestore"

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

    const db = requireAdminDb()
    const userDoc = await db.collection("users").doc(userId).get()
    return { id: userId, ...(userDoc.data() || {}) }
  } catch (error) {
    console.error("Error getting user from request:", error)
    return null
  }
}

// PUT mark notification as read
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    
    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      )
    }

    let db: any
    try {
      db = requireAdminDb()
    } catch (error) {
      // Firebase Admin not configured - return success without saving
      console.warn("Notifications API: Firebase Admin not configured")
      return NextResponse.json({ notification: { id: params.id, read: true, updatedAt: new Date() } })
    }

    const notificationRef = db
      .collection("users")
      .doc(userId)
      .collection("notifications")
      .doc(params.id)

    const notification = await notificationRef.get()

    if (!notification.exists) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    const { read } = await req.json()

    await notificationRef.set(
      {
        read: read ?? true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )

    const updated = await notificationRef.get()
    return NextResponse.json({ notification: { id: updated.id, ...updated.data() } })
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
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    
    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      )
    }

    let db: any
    try {
      db = requireAdminDb()
    } catch (error) {
      // Firebase Admin not configured - return success without saving
      console.warn("Notifications API: Firebase Admin not configured")
      return NextResponse.json({ success: true })
    }

    const notificationRef = db
      .collection("users")
      .doc(userId)
      .collection("notifications")
      .doc(params.id)

    const notification = await notificationRef.get()
    if (!notification.exists) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    await notificationRef.delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    )
  }
}
