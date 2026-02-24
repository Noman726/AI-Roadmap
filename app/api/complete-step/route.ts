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

    // Find the latest active roadmap for this user
    let roadmapsSnapshot: any
    try {
      // Try to find active roadmaps (where completedAt is null)
      roadmapsSnapshot = await userRef.collection("roadmaps")
        .where("completedAt", "==", null)
        .orderBy("order", "desc")
        .limit(1)
        .get()
      
      if (roadmapsSnapshot.empty) {
        // Fallback: get all roadmaps ordered by order
        roadmapsSnapshot = await userRef.collection("roadmaps")
          .orderBy("order", "desc")
          .limit(1)
          .get()
      }
    } catch (indexError) {
      // If composite index doesn't exist, just get the latest roadmap
      console.warn("[complete-step] Index error, using simple query:", indexError)
      roadmapsSnapshot = await userRef.collection("roadmaps")
        .orderBy("order", "desc")
        .limit(1)
        .get()
    }

    if (roadmapsSnapshot.empty) {
      console.warn(`[complete-step] No roadmap found for user ${userId}`)
      return NextResponse.json(
        { 
          success: true,
          message: "Step marked as complete (no roadmap in database)"
        },
        { status: 200 }
      )
    }

    const roadmapDoc = roadmapsSnapshot.docs[0]
    const roadmapId = roadmapDoc.id
    const roadmapData = roadmapDoc.data()
    console.log(`[complete-step] Found roadmap: ${roadmapId}`)

    // Find the step in this roadmap
    const stepsSnapshot = await roadmapDoc.ref.collection("steps").orderBy("order", "asc").get()
    
    let stepDoc: any = null
    if (stepId) {
      // Try to find by step ID
      stepDoc = stepsSnapshot.docs.find((doc) => doc.data().id === stepId || doc.id === stepId)
    }
    
    if (!stepDoc && stepTitle) {
      // Try to find by title
      stepDoc = stepsSnapshot.docs.find(
        (doc) => String(doc.data().title || "").toLowerCase() === stepTitle.toLowerCase()
      ) || stepsSnapshot.docs.find(
        (doc) => String(doc.data().title || "").toLowerCase().includes(stepTitle.toLowerCase())
      )
    }

    if (!stepDoc) {
      console.warn(`[complete-step] Step not found in roadmap ${roadmapId}`)
      return NextResponse.json(
        { 
          success: true,
          message: "Step marked as complete (not found in database)"
        },
        { status: 200 }
      )
    }

    const stepDocRef = stepDoc.ref
    const stepData = stepDoc.data() || {}
    
    console.log(`[complete-step] Found step: ${stepDoc.id} - ${stepData.title || ""}`)

    try {
      await stepDocRef.update({
        completed: true,
        progress: 100,
        updatedAt: serverTimestamp(),
      })
    } catch (updateError: any) {
      console.error(`[complete-step] Error updating step:`, updateError)
      // If update fails, try set with merge
      await stepDocRef.set({
        ...stepData,
        completed: true,
        progress: 100,
        updatedAt: serverTimestamp(),
      }, { merge: true })
    }

    console.log(`[complete-step] Step marked complete: ${stepDoc.id} - ${stepData.title || ""}`)

    const roadmapRef = userRef.collection("roadmaps").doc(roadmapId)
    const allStepsSnapshot = await roadmapRef.collection("steps").orderBy("order", "asc").get()
    const steps = allStepsSnapshot.docs.map((doc) => doc.data())
    const completedStepsCount = steps.filter((s) => s.completed).length

    try {
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
    } catch (progressError) {
      console.warn(`[complete-step] Failed to update progress:`, progressError)
    }

    console.log(`[complete-step] Progress updated: ${completedStepsCount}/${steps.length}`)

    // Check if all steps are now completed - if so, mark roadmap as complete
    const allStepsCompleted = completedStepsCount === steps.length && steps.length > 0
    if (allStepsCompleted) {
      try {
        await roadmapRef.set(
          {
            completedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )
        console.log(`[complete-step] 🎉 Roadmap ${roadmapId} marked as complete!`)
        
        // Send special notification for roadmap completion
        await userRef.collection("notifications").add({
          userId,
          type: "milestone",
          title: "🎉 Roadmap Completed!",
          message: `Amazing work! You've completed all steps in your "${roadmapData?.careerPath || 'learning path'}" roadmap. Ready for the next challenge?`,
          metadata: {
            roadmapId,
            totalSteps: steps.length,
            timestamp: new Date().toISOString(),
          },
          read: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      } catch (roadmapCompleteError) {
        console.warn(`[complete-step] Failed to mark roadmap complete:`, roadmapCompleteError)
      }
    }

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
        step: { id: stepDoc.id, ...stepData, completed: true, progress: 100 },
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
