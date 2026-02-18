import { NextResponse } from "next/server"
import { requireAdminDb, serverTimestamp } from "@/lib/firestore"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter." }, { status: 400 })
    }

    let db: any
    try {
      db = requireAdminDb()
    } catch (error) {
      console.warn("[profile GET] Firebase Admin not configured:", error)
      // Return null profile - client will use localStorage
      return NextResponse.json({ profile: null }, { status: 200 })
    }

    const userRef = db.collection("users").doc(userId)
    const userSnap = await userRef.get()

    if (!userSnap.exists) {
      return NextResponse.json({ profile: null }, { status: 200 })
    }

    const userData = userSnap.data()
    const profile = userData?.profile || null

    return NextResponse.json({ profile }, { status: 200 })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ profile: null }, { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, email, name, profileData } = body ?? {}

    if (!userId || !profileData || typeof profileData !== "object") {
      return NextResponse.json({ error: "Missing profile data." }, { status: 400 })
    }

    let db: any
    try {
      db = requireAdminDb()
    } catch (error) {
      console.warn("[profile] Firebase Admin not configured:", error)
      // If Firebase Admin is not configured, still return success
      // The client will handle persistence via localStorage
      return NextResponse.json({ 
        success: true,
        message: "Profile saved (client-side only)" 
      })
    }

    const userRef = db.collection("users").doc(userId)
    const userSnap = await userRef.get()

    const userPayload = {
      email: email || null,
      name: name || null,
      updatedAt: serverTimestamp(),
      ...(userSnap.exists ? {} : { createdAt: serverTimestamp() }),
    }

    await userRef.set(userPayload, { merge: true })
    await userRef.set(
      {
        profile: profileData,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving profile:", error)
    return NextResponse.json({ error: "Failed to save profile." }, { status: 500 })
  }
}
