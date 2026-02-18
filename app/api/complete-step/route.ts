import { NextRequest, NextResponse } from "next/server"
import { requireAdminDb, serverTimestamp } from "@/lib/firestore"

interface StepCompletionRequest {
  userId: string
  email?: string
  stepId: string
  stepTitle?: string
}

export async function PUT(request: NextRequest) {
  try {
    const body: StepCompletionRequest = await request.json()
    const { userId, stepId, stepTitle } = body

    if (!userId || (!stepId && !stepTitle)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    let db: any
    try {
      db = requireAdminDb()
    } catch (error) {
      console.warn("[complete-step] Firebase Admin not configured:", error)
      // If Firebase Admin is not configured, still return success
      // The client will handle persistence via localStorage
      return NextResponse.json(
        { 
          success: true,
          message: "Step marked as complete (client-side only)"
        },
        { status: 200 }
      )
    }

    const userRef = db.collection("users").doc(userId)

    console.log(`[complete-step] userId=${userId}, stepId=${stepId}, stepTitle=${stepTitle}`)

    let stepDocRef: any = null
    let roadmapId: string | null = null

    if (stepId) {
      const stepSnapshot = await db.collectionGroup("steps").where("userId", "==", userId).get()
      const match = stepSnapshot.docs.find((doc) => doc.data().id === stepId) || null

      if (match) {
        stepDocRef = match.ref
        roadmapId = String(match.data().roadmapId || "")
      }
    }

    if (!stepDocRef && stepTitle) {
      const roadmapSnapshot = await userRef.collection("roadmaps").orderBy("order", "desc").limit(1).get()
      if (!roadmapSnapshot.empty) {
        const roadmapDoc = roadmapSnapshot.docs[0]
        roadmapId = roadmapDoc.id
        const stepsSnapshot = await roadmapDoc.ref.collection("steps").orderBy("order", "asc").get()
        const steps = stepsSnapshot.docs

        const match = steps.find(
          (doc) => String(doc.data().title || "").toLowerCase() === stepTitle.toLowerCase()
        ) || steps.find(
          (doc) => String(doc.data().title || "").toLowerCase().includes(stepTitle.toLowerCase())
        ) || steps.find(
          (doc) => stepTitle.toLowerCase().includes(String(doc.data().title || "").toLowerCase())
        ) || null

        if (match) {
          stepDocRef = match.ref
        }
      }
    }

    if (!stepDocRef || !roadmapId) {
      console.warn(`[complete-step] No uncompleted step found for user ${userId}`)
      return NextResponse.json(
        { error: "No uncompleted step found" },
        { status: 404 }
      )
    }

    const stepSnapshot = await stepDocRef.get()
    const stepData = stepSnapshot.data() || {}

    console.log(`[complete-step] Found step: ${stepSnapshot.id} - ${stepData.title || ""}`)

    await stepDocRef.update({
      completed: true,
      progress: 100,
      updatedAt: serverTimestamp(),
    })

    console.log(`[complete-step] Step marked complete: ${stepSnapshot.id} - ${stepData.title || ""}`)

    const roadmapRef = userRef.collection("roadmaps").doc(roadmapId)
    const stepsSnapshot = await roadmapRef.collection("steps").orderBy("order", "asc").get()
    const steps = stepsSnapshot.docs.map((doc) => doc.data())
    const completedStepsCount = steps.filter((s) => s.completed).length

    const progressRef = userRef.collection("progress").doc(roadmapId)
    await progressRef.set(
      {
        roadmapId,
        completedSteps: completedStepsCount,
        totalSteps: steps.length,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )

    console.log(`[complete-step] Progress updated: ${completedStepsCount}/${steps.length}`)

    try {
      await userRef.collection("notifications").add({
        userId,
        type: "step_completion",
        title: "Step Completed! 🌟",
        message: `Congratulations! You've completed "${stepData.title}". You're making great progress!`,
        metadata: {
          stepId,
          stepTitle: stepData.title,
          progressPercentage: steps.length ? Math.round((completedStepsCount / steps.length) * 100) : 0,
          timestamp: new Date().toISOString(),
        },
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } catch (notifError) {
      console.warn("Failed to create step completion notification:", notifError)
    }

    return NextResponse.json(
      { 
        success: true,
        message: "Step marked as completed",
        step: { id: stepSnapshot.id, ...stepData, completed: true, progress: 100 },
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
