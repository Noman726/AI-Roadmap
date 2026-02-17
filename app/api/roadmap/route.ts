import { NextRequest, NextResponse } from "next/server"
import { requireAdminDb } from "@/lib/firestore"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const history = searchParams.get("history") // If "true", return all roadmaps
    const roadmapId = searchParams.get("roadmapId") // Fetch specific roadmap by ID

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      )
    }

    const db = requireAdminDb()
    const roadmapsRef = db.collection("users").doc(userId).collection("roadmaps")

    if (history === "true") {
      // Return ALL roadmaps for this user (completed + active), ordered by order
      const roadmapsSnapshot = await roadmapsRef.orderBy("order", "asc").get()
      const formattedRoadmaps = await Promise.all(
        roadmapsSnapshot.docs.map(async (doc) => {
          const stepsSnapshot = await doc.ref.collection("steps").orderBy("order", "asc").get()
          const steps = stepsSnapshot.docs.map((stepDoc) => ({
            id: stepDoc.id,
            ...stepDoc.data(),
          }))

          return {
            id: doc.id,
            ...doc.data(),
            steps,
          }
        })
      )

      return NextResponse.json({ roadmaps: formattedRoadmaps }, { status: 200 })
    }

    // Fetch a specific roadmap by ID
    if (roadmapId) {
      const roadmapDoc = await roadmapsRef.doc(roadmapId).get()

      if (!roadmapDoc.exists) {
        return NextResponse.json({ error: "Roadmap not found" }, { status: 404 })
      }

      const stepsSnapshot = await roadmapDoc.ref.collection("steps").orderBy("order", "asc").get()
      const steps = stepsSnapshot.docs.map((stepDoc) => ({
        id: stepDoc.id,
        ...stepDoc.data(),
      }))

      const formatted = {
        id: roadmapDoc.id,
        ...roadmapDoc.data(),
        steps,
      }

      return NextResponse.json({ roadmap: formatted }, { status: 200 })
    }

    // Get user's LATEST ACTIVE (non-completed) roadmap
    const latestSnapshot = await roadmapsRef.orderBy("order", "desc").limit(5).get()

    if (latestSnapshot.empty) {
      return NextResponse.json(
        { error: "Roadmap not found" },
        { status: 404 }
      )
    }

    const roadmapDoc =
      latestSnapshot.docs.find((doc) => doc.data().completedAt == null) || latestSnapshot.docs[0]
    const stepsSnapshot = await roadmapDoc.ref.collection("steps").orderBy("order", "asc").get()
    const steps = stepsSnapshot.docs.map((stepDoc) => ({
      id: stepDoc.id,
      ...stepDoc.data(),
    }))

    const formattedRoadmap = {
      id: roadmapDoc.id,
      ...roadmapDoc.data(),
      steps,
    }

    const response = NextResponse.json(
      { roadmap: formattedRoadmap },
      { status: 200 }
    )
    
    // Cache active roadmaps for 30 seconds, completed roadmaps longer
    const cacheTime = formattedRoadmap.completedAt ? 3600 : 30
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
