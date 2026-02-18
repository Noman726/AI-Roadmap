import { NextRequest, NextResponse } from "next/server"
import { requireAdminDb } from "@/lib/firestore"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const roadmapId = searchParams.get("roadmapId")

    if (!userId || !roadmapId) {
      return NextResponse.json(
        { error: "Missing userId or roadmapId parameter" },
        { status: 400 }
      )
    }

    let db: any
    try {
      db = requireAdminDb()
    } catch (error) {
      return NextResponse.json(
        { progress: null, message: "Using local storage" },
        { status: 200 }
      )
    }
    const progressDoc = await db
      .collection("users")
      .doc(userId)
      .collection("progress")
      .doc(roadmapId)
      .get()

    if (!progressDoc.exists) {
      return NextResponse.json(
        { error: "Progress record not found" },
        { status: 404 }
      )
    }

    const progress = progressDoc.data() || {}

    // Calculate percentage
    const percentage = progress.totalSteps > 0 
      ? Math.round((progress.completedSteps / progress.totalSteps) * 100)
      : 0

    const response = NextResponse.json(
      {
        progress: {
          id: progressDoc.id,
          ...progress,
          percentage,
        },
      },
      { status: 200 }
    )

    // Cache progress data for 10 seconds
    response.headers.set("Cache-Control", "private, max-age=10, s-maxage=10")

    return response
  } catch (error) {
    console.error("Error fetching progress:", error)
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    )
  }
}
