import { NextRequest, NextResponse } from "next/server"
import { prisma, resolveDbUserId } from "@/lib/db"

interface TaskCompletionRequest {
  userId: string
  email?: string
  day: string
  taskIndex: number
  focusArea: string
  completedTasksCount: number
  totalTasksCount: number
}

export async function POST(request: NextRequest) {
  try {
    const body: TaskCompletionRequest = await request.json()
    const { userId, email, day, taskIndex, focusArea, completedTasksCount, totalTasksCount } = body

    if (!userId || !day || taskIndex === undefined || completedTasksCount === undefined || totalTasksCount === undefined) {
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

    console.log(`[mark-task] Resolved userId ${userId} → dbUserId ${dbUserId}`)

    // Get user's roadmap to find and update the current step
    const roadmap = await prisma.roadmap.findFirst({
      where: { userId: dbUserId },
      include: { steps: true },
    })

    if (roadmap) {
      // Find the step matching the focus area (don't fall back to random uncompleted steps)
      let currentStep = roadmap.steps.find(
        (step) => step.title.toLowerCase().includes(focusArea.toLowerCase())
      ) || roadmap.steps.find(
        (step) => focusArea.toLowerCase().includes(step.title.toLowerCase())
      )

      if (currentStep) {
        // Calculate progress percentage
        const progressPercentage = Math.round(
          (completedTasksCount / totalTasksCount) * 100
        )

        console.log(`Step "${currentStep.title}" progress: ${completedTasksCount}/${totalTasksCount} = ${progressPercentage}%`)

        // Update step progress (but don't auto-complete — user must click "Mark Step as Complete")
        await prisma.step.update({
          where: { id: currentStep.id },
          data: {
            progress: Math.min(progressPercentage, 100),
          },
        })

        // Update overall progress record
        const updatedSteps = await prisma.step.findMany({
          where: { roadmapId: roadmap.id },
        })

        const completedStepsCount = updatedSteps.filter((s) => s.completed).length

        // Find existing progress or create new one
        const existing = await prisma.progress.findFirst({
          where: {
            userId: dbUserId,
            roadmapId: roadmap.id,
          },
        })

        if (existing) {
          await prisma.progress.update({
            where: { id: existing.id },
            data: { completedSteps: completedStepsCount },
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
      }
    }

    // Create a notification for task completion directly using Prisma
    const notification = await prisma.notification.create({
      data: {
        userId: dbUserId,
        type: "task_completion",
        title: "Great Job! Task Completed 🎉",
        message: `You've completed a task in your study plan for "${focusArea}". Keep up the momentum!`,
        metadata: JSON.stringify({
          day,
          taskIndex,
          focusArea,
          completedCount: completedTasksCount,
          totalCount: totalTasksCount,
          timestamp: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json(
      { 
        success: true,
        message: "Task marked as completed and progress updated",
        notification,
        progress: {
          completedTasks: completedTasksCount,
          totalTasks: totalTasksCount,
          percentage: Math.round((completedTasksCount / totalTasksCount) * 100),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error marking task as completed:", error)
    return NextResponse.json(
      { error: "Failed to mark task as completed" },
      { status: 500 }
    )
  }
}
