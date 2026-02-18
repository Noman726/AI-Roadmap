import { NextRequest, NextResponse } from "next/server"
import { requireAdminDb } from "@/lib/firestore"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const history = searchParams.get("history") // If "true", return all roadmaps
    const roadmapId = searchParams.get("roadmapId") // Fetch specific roadmap by ID
    const includeSteps = searchParams.get("includeSteps") !== "false"

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      )
    }

    let db: any
    try {
      db = requireAdminDb()
    } catch (error) {
      // Firebase Admin not configured - client will use localStorage
      return NextResponse.json(
        { roadmap: null, message: "Using local storage" },
        { status: 200 }
      )
    }

    const roadmapsRef = db.collection("users").doc(userId).collection("roadmaps")

    if (history === "true") {
      // Return ALL roadmaps for this user (completed + active), ordered by order
      const roadmapsSnapshot = await roadmapsRef.orderBy("order", "asc").get()

      if (!includeSteps) {
        const formattedRoadmaps = roadmapsSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        }))

        const response = NextResponse.json({ roadmaps: formattedRoadmaps }, { status: 200 })
        response.headers.set("Cache-Control", "private, max-age=30, s-maxage=30")
        return response
      }

      const formattedRoadmaps = await Promise.all(
        roadmapsSnapshot.docs.map(async (doc: any) => {
          const stepsSnapshot = await doc.ref.collection("steps").orderBy("order", "asc").get()
          const steps = stepsSnapshot.docs.map((stepDoc: any) => ({
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

      const response = NextResponse.json({ roadmaps: formattedRoadmaps }, { status: 200 })
      response.headers.set("Cache-Control", "private, max-age=30, s-maxage=30")
      return response
    }

    // Fetch a specific roadmap by ID
    if (roadmapId) {
      const roadmapDoc = await roadmapsRef.doc(roadmapId).get()

      if (!roadmapDoc.exists) {
        return NextResponse.json({ error: "Roadmap not found" }, { status: 404 })
      }

      const stepsSnapshot = await roadmapDoc.ref.collection("steps").orderBy("order", "asc").get()
      const steps = stepsSnapshot.docs.map((stepDoc: any) => ({
        id: stepDoc.id,
        ...stepDoc.data(),
      }))

      const formatted = {
        id: roadmapDoc.id,
        ...roadmapDoc.data(),
        steps,
      }

      const response = NextResponse.json({ roadmap: formatted }, { status: 200 })
      const cacheTime = formatted.completedAt ? 300 : 30
      response.headers.set("Cache-Control", `private, max-age=${cacheTime}, s-maxage=${cacheTime}`)
      return response
    }

    // Get user's LATEST ACTIVE (non-completed) roadmap
    const latestSnapshot = await roadmapsRef.orderBy("order", "desc").limit(5).get()

    if (latestSnapshot.empty) {
      // No roadmap in database - client will use localStorage
      return NextResponse.json(
        { roadmap: null, message: "No roadmap found in database" },
        { status: 200 }
      )
    }

    const roadmapDoc =
      latestSnapshot.docs.find((doc: any) => doc.data().completedAt == null) || latestSnapshot.docs[0]
    const stepsSnapshot = await roadmapDoc.ref.collection("steps").orderBy("order", "asc").get()
    const steps = stepsSnapshot.docs.map((stepDoc: any) => ({
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
    response.headers.set("Cache-Control", `private, max-age=${cacheTime}, s-maxage=${cacheTime}`)

    return response
  } catch (error) {
    console.error("Error fetching roadmap:", error)
    return NextResponse.json(
      { error: "Failed to fetch roadmap" },
      { status: 500 }
    )
  }
}
