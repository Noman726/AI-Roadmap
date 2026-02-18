"use server"

import { requireAdminDb, serverTimestamp } from "@/lib/firestore"

export async function saveProfile(userId: string, profileData: any) {
  try {
    const db = requireAdminDb()
    const userRef = db.collection("users").doc(userId)
    await userRef.set(
      {
        profile: profileData,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
    return { success: true }
  } catch (error) {
    console.warn("Error saving profile (Firebase Admin not configured):", error)
    // Return success anyway - client will use localStorage
    return { success: true, clientOnly: true }
  }
}

export async function saveRoadmap(userId: string, roadmapData: any) {
  try {
    const db = requireAdminDb()
    const roadmapsRef = db.collection("users").doc(userId).collection("roadmaps")
    const lastSnapshot = await roadmapsRef.orderBy("order", "desc").limit(1).get()
    const lastOrder = lastSnapshot.empty ? 0 : Number(lastSnapshot.docs[0].data().order || 0)
    const nextOrder = lastOrder + 1

    const roadmapRef = roadmapsRef.doc()
    await roadmapRef.set({
      userId,
      careerPath: roadmapData.careerPath,
      overview: roadmapData.overview,
      estimatedTimeframe: roadmapData.estimatedTimeframe,
      weeklySchedule: roadmapData.weeklySchedule,
      order: nextOrder,
      completedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    const stepsRef = roadmapRef.collection("steps")
    await Promise.all(
      (roadmapData.steps || []).map((step: any, index: number) => {
        const stepId = step.id || `step-${index + 1}`
        return stepsRef.doc(stepId).set({
          id: stepId,
          userId,
          roadmapId: roadmapRef.id,
          title: step.title,
          description: step.description,
          duration: step.duration,
          skills: Array.isArray(step.skills) ? step.skills : [],
          resources: Array.isArray(step.resources) ? step.resources : [],
          milestones: Array.isArray(step.milestones) ? step.milestones : [],
          completed: Boolean(step.completed),
          progress: step.progress ?? 0,
          order: index + 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      })
    )

    await db.collection("users").doc(userId).collection("progress").doc(roadmapRef.id).set({
      roadmapId: roadmapRef.id,
      completedSteps: 0,
      totalSteps: Array.isArray(roadmapData.steps) ? roadmapData.steps.length : 0,
      updatedAt: serverTimestamp(),
    })

    return { success: true, roadmapId: roadmapRef.id }
  } catch (error) {
    console.warn("Error saving roadmap (Firebase Admin not configured):", error)
    // Return success anyway - client will use localStorage
    return { success: true, clientOnly: true }
  }
}

export async function getUserRoadmap(userId: string) {
  try {
    const db = requireAdminDb()
    const roadmapsRef = db.collection("users").doc(userId).collection("roadmaps")
    const latestSnapshot = await roadmapsRef.orderBy("order", "desc").limit(5).get()
    if (latestSnapshot.empty) return null

    const roadmapDoc =
      latestSnapshot.docs.find((doc) => doc.data().completedAt == null) || latestSnapshot.docs[0]
    const roadmapData = roadmapDoc.data()
    const stepsSnapshot = await roadmapDoc.ref.collection("steps").orderBy("order", "asc").get()
    const steps = stepsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return {
      id: roadmapDoc.id,
      ...roadmapData,
      steps,
    }
  } catch (error) {
    console.warn("Error fetching roadmap (Firebase Admin not configured):", error)
    return null
  }
}

export async function updateStepCompletion(userId: string, stepId: string, completed: boolean) {
  let db: any
  try {
    db = requireAdminDb()
  } catch (error) {
    console.warn("Firebase Admin not configured, step completion will be stored locally only")
    return { success: true, clientOnly: true }
  }

  try {
    const stepsSnapshot = await db.collectionGroup("steps").where("userId", "==", userId).get()
    const stepDoc = stepsSnapshot.docs.find((doc) => doc.data().id === stepId) || null

    if (!stepDoc) {
      throw new Error("Step not found")
    }

    await stepDoc.ref.update({
      completed,
      progress: completed ? 100 : 0,
      updatedAt: serverTimestamp(),
    })

    return { success: true, step: { id: stepDoc.id, ...stepDoc.data(), completed } }
  } catch (error) {
    console.warn("Error updating step:", error)
    return { success: true, clientOnly: true }
  }
}

export async function saveProgress(userId: string, roadmapId: string, completedSteps: number, feedback?: string) {
  try {
    const db = requireAdminDb()
    const progressRef = db.collection("users").doc(userId).collection("progress").doc(roadmapId)
    await progressRef.set(
      {
        roadmapId,
        completedSteps,
        feedback: feedback ?? null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
    return { success: true }
  } catch (error) {
    console.warn("Error saving progress (Firebase Admin not configured):", error)
    return { success: true, clientOnly: true }
  }
}

export async function saveStudyPlan(userId: string, roadmapId: string, studyPlan: any) {
  try {
    const db = requireAdminDb()
    const progressRef = db.collection("users").doc(userId).collection("progress").doc(roadmapId)
    await progressRef.set(
      {
        roadmapId,
        studyPlan,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
    return { success: true }
  } catch (error) {
    console.warn("Error saving study plan (Firebase Admin not configured):", error)
    return { success: true, clientOnly: true }
  }
}
