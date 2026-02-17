import { NextRequest, NextResponse } from "next/server"
import { requireAdminDb, serverTimestamp } from "@/lib/firestore"

interface TaskCompletionRequest {
  userId: string
  email?: string
  day: string
  taskIndex: number
  stepId?: string
  focusArea: string
  completedTasksCount: number
  totalTasksCount: number
}

export async function POST(request: NextRequest) {
  try {
    const body: TaskCompletionRequest = await request.json()
    const { userId, day, taskIndex, stepId, focusArea, completedTasksCount, totalTasksCount } = body

    if (!userId || !day || taskIndex === undefined || completedTasksCount === undefined || totalTasksCount === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const db = requireAdminDb()
    const userRef = db.collection("users").doc(userId)

    console.log(`[mark-task] userId=${userId}`)

    const roadmapSnapshot = await userRef.collection("roadmaps").orderBy("order", "desc").limit(1).get()

    let notification = null

    if (!roadmapSnapshot.empty) {
      const roadmapDoc = roadmapSnapshot.docs[0]
      const stepsSnapshot = await roadmapDoc.ref.collection("steps").orderBy("order", "asc").get()
      const steps = stepsSnapshot.docs

      const currentStep =
        (stepId
          ? steps.find((doc) => String(doc.data().id || doc.id) === stepId)
          : null) ||
        steps.find((doc) =>
          String(doc.data().title || "").toLowerCase().includes(focusArea.toLowerCase())
        ) ||
        steps.find((doc) =>
          focusArea.toLowerCase().includes(String(doc.data().title || "").toLowerCase())
        )

      if (currentStep) {
        const progressPercentage = Math.round((completedTasksCount / totalTasksCount) * 100)
        console.log(
          `Step "${currentStep.data().title}" progress: ${completedTasksCount}/${totalTasksCount} = ${progressPercentage}%`
        )

        await currentStep.ref.set(
          {
            progress: Math.min(progressPercentage, 100),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )

        const updatedStepsSnapshot = await roadmapDoc.ref.collection("steps").get()
        const updatedSteps = updatedStepsSnapshot.docs.map((doc) => doc.data())
        const completedStepsCount = updatedSteps.filter((s) => s.completed).length

        await userRef.collection("progress").doc(roadmapDoc.id).set(
          {
            roadmapId: roadmapDoc.id,
            totalSteps: updatedSteps.length,
            completedSteps: completedStepsCount,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )
      }
    }

    notification = await userRef.collection("notifications").add({
      userId,
      type: "task_completion",
      title: "Great Job! Task Completed 🎉",
      message: `You've completed a task in your study plan for "${focusArea}". Keep up the momentum!`,
      metadata: {
        day,
        taskIndex,
        focusArea,
        completedCount: completedTasksCount,
        totalCount: totalTasksCount,
        timestamp: new Date().toISOString(),
      },
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return NextResponse.json(
      { 
        success: true,
        message: "Task marked as completed and progress updated",
        notification: { id: notification.id },
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
