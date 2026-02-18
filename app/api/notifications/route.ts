import { NextRequest, NextResponse } from "next/server"
import { requireAdminDb, serverTimestamp } from "@/lib/firestore"

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

// GET all notifications for the current user
export async function GET(req: NextRequest) {
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
      // Firebase Admin not configured - return empty notifications
      return NextResponse.json({ notifications: [] })
    }

    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("notifications")
      .orderBy("createdAt", "desc")
      .get()

    const notifications = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }))

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
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    
    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      )
    }

    const { type, title, message, metadata } = await req.json()

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields: type, title, message" },
        { status: 400 }
      )
    }

    let db: any
    try {
      db = requireAdminDb()
    } catch (error) {
      // Firebase Admin not configured - return success without saving
      console.warn("Notifications API: Firebase Admin not configured")
      return NextResponse.json(
        { notification: { id: 'local-' + Date.now(), type, title, message, metadata, read: false, createdAt: new Date() } },
        { status: 201 }
      )
    }
    const notificationRef = await db
      .collection("users")
      .doc(userId)
      .collection("notifications")
      .add({
        userId: userId,
        type,
        title,
        message,
        metadata: metadata ?? null,
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

    const notificationDoc = await notificationRef.get()
    return NextResponse.json(
      { notification: { id: notificationDoc.id, ...notificationDoc.data() } },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating notification:", error)
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    )
  }
}
