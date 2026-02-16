import { NextRequest, NextResponse } from "next/server"
import { prisma, resolveDbUserId } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const email = searchParams.get("email")
    const history = searchParams.get("history") // If "true", return all roadmaps
    const roadmapId = searchParams.get("roadmapId") // Fetch specific roadmap by ID

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
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

    if (history === "true") {
      // Return ALL roadmaps for this user (completed + active), ordered by order
      const roadmaps = await prisma.roadmap.findMany({
        where: { userId: dbUserId },
        include: { steps: true },
        orderBy: { order: "asc" },
      })

      const formattedRoadmaps = roadmaps.map((roadmap) => ({
        ...roadmap,
        weeklySchedule: JSON.parse(roadmap.weeklySchedule),
        steps: roadmap.steps.map((step) => ({
          ...step,
          skills: JSON.parse(step.skills),
          resources: JSON.parse(step.resources),
          milestones: JSON.parse(step.milestones),
        })),
      }))

      return NextResponse.json({ roadmaps: formattedRoadmaps }, { status: 200 })
    }

    // Fetch a specific roadmap by ID
    if (roadmapId) {
      const specificRoadmap = await prisma.roadmap.findFirst({
        where: { id: roadmapId, userId: dbUserId },
        include: { steps: true },
      })

      if (!specificRoadmap) {
        return NextResponse.json({ error: "Roadmap not found" }, { status: 404 })
      }

      const formatted = {
        ...specificRoadmap,
        weeklySchedule: JSON.parse(specificRoadmap.weeklySchedule),
        steps: specificRoadmap.steps.map((step) => ({
          ...step,
          skills: JSON.parse(step.skills),
          resources: JSON.parse(step.resources),
          milestones: JSON.parse(step.milestones),
        })),
      }

      return NextResponse.json({ roadmap: formatted }, { status: 200 })
    }

    // Get user's LATEST ACTIVE (non-completed) roadmap
    let roadmap = await prisma.roadmap.findFirst({
      where: { userId: dbUserId, completedAt: null },
      orderBy: { order: "desc" },
      include: { steps: true },
    })

    // If no active roadmap, get the most recent one (even if completed)
    if (!roadmap) {
      roadmap = await prisma.roadmap.findFirst({
        where: { userId: dbUserId },
        orderBy: { order: "desc" },
        include: { steps: true },
      })
    }

    if (!roadmap) {
      return NextResponse.json(
        { error: "Roadmap not found" },
        { status: 404 }
      )
    }

    // Parse the JSON fields
    const formattedRoadmap = {
      ...roadmap,
      weeklySchedule: JSON.parse(roadmap.weeklySchedule),
      steps: roadmap.steps.map((step) => ({
        ...step,
        skills: JSON.parse(step.skills),
        resources: JSON.parse(step.resources),
        milestones: JSON.parse(step.milestones),
      })),
    }

    const response = NextResponse.json(
      { roadmap: formattedRoadmap },
      { status: 200 }
    )
    
    // Cache active roadmaps for 30 seconds, completed roadmaps longer
    const cacheTime = roadmap.completedAt ? 3600 : 30
    response.headers.set('Cache-Control', `public, max-age=${cacheTime}, s-maxage=${cacheTime}`)
    
    return response
  } catch (error) {
    console.error("Error fetching roadmap:", error)
    return NextResponse.json(
      { error: "Failed to fetch roadmap" },
      { status: 500 }
    )
  }
}
