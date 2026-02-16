import { NextRequest, NextResponse } from "next/server"
import { prisma, resolveDbUserId } from "@/lib/db"

interface StepCompletionRequest {
  userId: string
  email?: string
  stepId: string
  stepTitle?: string
}

export async function PUT(request: NextRequest) {
  try {
    const body: StepCompletionRequest = await request.json()
    const { userId, email, stepId, stepTitle } = body

    if (!userId || (!stepId && !stepTitle)) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    console.log(`[complete-step] Resolved userId ${userId} → dbUserId ${dbUserId}, stepId=${stepId}, stepTitle=${stepTitle}`)

    // First try to find by ID
    let existingStep = await prisma.step.findUnique({
      where: { id: stepId },
    })

    // If not found by ID, find by exact title match in the user's roadmap
    if (!existingStep && stepTitle) {
      const roadmap = await prisma.roadmap.findFirst({
        where: { userId: dbUserId },
        include: { steps: true },
      })

      if (roadmap) {
        existingStep = roadmap.steps.find(
          (s) => s.title.toLowerCase() === stepTitle.toLowerCase()
        ) || roadmap.steps.find(
          (s) => s.title.toLowerCase().includes(stepTitle.toLowerCase())
        ) || roadmap.steps.find(
          (s) => stepTitle.toLowerCase().includes(s.title.toLowerCase())
        ) || null
      }
    }

    if (!existingStep) {
      console.warn(`[complete-step] No uncompleted step found for user ${userId}`)
      return NextResponse.json(
        { error: "No uncompleted step found" },
        { status: 404 }
      )
    }

    console.log(`[complete-step] Found step: ${existingStep.id} - ${existingStep.title}`)

    // Update step to completed
    const step = await prisma.step.update({
      where: { id: existingStep.id },
      data: {
        completed: true,
        progress: 100,
      },
    })

    console.log(`[complete-step] Step marked complete: ${step.id} - ${step.title}`)

    // Get the roadmap to update progress
    const roadmap = await prisma.roadmap.findUnique({
      where: { id: step.roadmapId },
      include: { steps: true },
    })

    if (roadmap) {
      const completedStepsCount = roadmap.steps.filter((s) => s.completed || s.id === stepId).length

      // Update overall progress
      const existing = await prisma.progress.findFirst({
        where: {
          userId: dbUserId,
          roadmapId: roadmap.id,
        },
      })

      if (existing) {
        await prisma.progress.update({
          where: { id: existing.id },
          data: { 
            completedSteps: completedStepsCount,
            updatedAt: new Date(),
          },
        })
      } else {
        await prisma.progress.create({
          data: {
            userId: dbUserId,
            roadmapId: roadmap.id,
            totalSteps: roadmap.steps.length,
            completedSteps: completedStepsCount,
          },
        })
      }

      console.log(`[complete-step] Progress updated: ${completedStepsCount}/${roadmap.steps.length}`)

      // Create a milestone notification
      try {
        await prisma.notification.create({
          data: {
            userId: dbUserId,
            type: "step_completion",
            title: "Step Completed! 🌟",
            message: `Congratulations! You've completed "${step.title}". You're making great progress!`,
            metadata: JSON.stringify({
              stepId,
              stepTitle: step.title,
              progressPercentage: Math.round((completedStepsCount / roadmap.steps.length) * 100),
              timestamp: new Date().toISOString(),
            }),
          },
        })
      } catch (notifError) {
        console.warn("Failed to create step completion notification:", notifError)
      }
    }

    return NextResponse.json(
      { 
        success: true,
        message: "Step marked as completed",
        step,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error completing step:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete step" },
      { status: 500 }
    )
  }
}
