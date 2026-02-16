import { NextRequest, NextResponse } from "next/server"
import { prisma, resolveDbUserId } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const email = searchParams.get("email")
    const roadmapId = searchParams.get("roadmapId")

    if (!userId || !roadmapId) {
      return NextResponse.json(
        { error: "Missing userId or roadmapId parameter" },
        { status: 400 }
      )
    }

    // Resolve the actual Prisma user ID (Firebase UID → Prisma CUID)
    const dbUserId = await resolveDbUserId(userId, email)
    if (!dbUserId) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      )
    }

    // Get progress record from database
    const progress = await prisma.progress.findFirst({
      where: {
        userId: dbUserId,
        roadmapId,
      },
    })

    if (!progress) {
      return NextResponse.json(
        { error: "Progress record not found" },
        { status: 404 }
      )
    }

    // Calculate percentage
    const percentage = progress.totalSteps > 0 
      ? Math.round((progress.completedSteps / progress.totalSteps) * 100)
      : 0

    const response = NextResponse.json(
      { 
        progress: {
          ...progress,
          percentage,
        },
      },
      { status: 200 }
    )
    
    // Cache progress data for 10 seconds
    response.headers.set('Cache-Control', 'public, max-age=10, s-maxage=10')
    
    return response
  } catch (error) {
    console.error("Error fetching progress:", error)
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    )
  }
}
