import { adminDb } from "@/lib/firebase-admin"

export async function POST(req: Request) {
  try {
    if (!adminDb) {
      return Response.json(
        { error: "Firebase Admin SDK not configured. Please add credentials to .env.local" },
        { status: 500 }
      )
    }

    const { uid, email, name } = await req.json()

    if (!uid || !email) {
      return Response.json(
        { error: "Missing uid or email" },
        { status: 400 }
      )
    }

    // Create user document in Firestore
    await adminDb.collection("users").doc(uid).set(
      {
        email,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    )

    return Response.json({
      success: true,
      message: "User created successfully",
      uid,
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return Response.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
}
