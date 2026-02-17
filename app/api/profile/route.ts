import { NextResponse } from "next/server"
import { requireAdminDb, serverTimestamp } from "@/lib/firestore"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, email, name, profileData } = body ?? {}

    if (!userId || !profileData || typeof profileData !== "object") {
      return NextResponse.json({ error: "Missing profile data." }, { status: 400 })
    }

    const db = requireAdminDb()
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
