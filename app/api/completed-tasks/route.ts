import { NextRequest, NextResponse } from "next/server"
import { requireAdminDb } from "@/lib/firestore"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const stepId = searchParams.get("stepId")

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
      console.warn("[completed-tasks] Firebase Admin not configured:", error)
      // If Firebase Admin is not configured, return empty array
      // Client will use localStorage
      return NextResponse.json(
        { tasks: [], message: "Using local storage" },
        { status: 200 }
      )
    }

    const userRef = db.collection("users").doc(userId)
    
    // If stepId provided, get tasks for that step
    const tasksKey = stepId || 'general'
    const tasksDoc = await userRef.collection("completedTasks").doc(tasksKey).get()

    if (!tasksDoc.exists) {
      return NextResponse.json(
        { tasks: [] },
        { status: 200 }
      )
    }

    const tasksData = tasksDoc.data()
    const tasks = tasksData?.tasks || []

    return NextResponse.json(
      { 
        tasks,
        stepId: tasksData?.stepId,
        stepTitle: tasksData?.stepTitle
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error fetching completed tasks:", error)
    return NextResponse.json(
      { error: "Failed to fetch completed tasks", tasks: [] },
      { status: 500 }
    )
  }
}
