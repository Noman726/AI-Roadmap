import { NextRequest, NextResponse } from "next/server"
import { requireAdminDb, serverTimestamp } from "@/lib/firestore"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

// Helper to get user from request
async function getUserFromRequest(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id")
    
    if (!userId) {
      return null
    }

    const db = requireAdminDb()
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) return null

    const roadmapsSnapshot = await userDoc.ref
      .collection("roadmaps")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get()

    let roadmaps: any[] = []
    if (!roadmapsSnapshot.empty) {
      const roadmapDoc = roadmapsSnapshot.docs[0]
      const stepsSnapshot = await roadmapDoc.ref.collection("steps").orderBy("order", "asc").get()
      const steps = stepsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      const progressDoc = await userDoc.ref.collection("progress").doc(roadmapDoc.id).get()
      const progress = progressDoc.exists ? [{ id: progressDoc.id, ...progressDoc.data() }] : []

      roadmaps = [
        {
          id: roadmapDoc.id,
          ...roadmapDoc.data(),
          steps,
          progress,
        },
      ]
    }

    return {
      id: userId,
      ...userDoc.data(),
      profile: (userDoc.data() || {}).profile || null,
      roadmaps,
    }
  } catch (error) {
    console.error("Error getting user from request:", error)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { message } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    const db = requireAdminDb()

    // Save user message to database
    await db.collection("users").doc(user.id).collection("chatMessages").add({
      userId: user.id,
      role: "user",
      content: message,
      createdAt: serverTimestamp(),
    })

    // Get previous chat history for context
    const chatHistorySnapshot = await db
      .collection("users")
      .doc(user.id)
      .collection("chatMessages")
      .orderBy("createdAt", "asc")
      .limit(10)
      .get()

    const chatHistory = chatHistorySnapshot.docs.map((doc) => doc.data())

    // Prepare context from user's roadmap and profile
    const currentRoadmap = user.roadmaps[0]
    const userProfile = user.profile

    const systemPrompt = `You are a helpful and supportive AI learning assistant for students. Your role is to:
1. Help students understand their learning roadmap and study plans
2. Provide personalized learning advice and motivation
3. Answer questions about specific learning topics and resources
4. Offer tips for effective studying based on their learning style
5. Help track progress and celebrate achievements
6. Be encouraging, supportive, and adaptive to each student's needs

Student Profile:
- Name: ${user.name}
- Learning Style: ${userProfile?.learningStyle || "not specified"}
- Skill Level: ${userProfile?.currentSkillLevel || "not specified"}
- Career Goal: ${userProfile?.careerGoal || "not specified"}
- Available Study Time: ${userProfile?.studyTime || "not specified"} hours/week

${
  currentRoadmap
    ? `Current Learning Path:
- Career Path: ${currentRoadmap.careerPath}
- Overview: ${currentRoadmap.overview}
- Total Steps: ${currentRoadmap.steps.length}
- Status: ${currentRoadmap.progress[0]?.completedSteps || 0} / ${currentRoadmap.steps.length} steps completed

Current Focus Step:
${
  currentRoadmap.steps.find((s) => Array.isArray(s.milestones) && s.milestones.length > 0)?.title || "Starting the journey"
}
`
    : ""
}

Be conversational, helpful, and encourage the student to keep learning. Ask clarifying questions if needed. Provide actionable advice.`

    const messages = [
      ...chatHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    ]

    // Generate response using Groq
    const assistantResponse = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: systemPrompt,
      messages: [
        ...messages,
        {
          role: "user" as const,
          content: message,
        },
      ],
      maxTokens: 500,
    })

    // Save assistant response to database
    const savedMessage = await db
      .collection("users")
      .doc(user.id)
      .collection("chatMessages")
      .add({
        userId: user.id,
        role: "assistant",
        content: assistantResponse.text,
        createdAt: serverTimestamp(),
      })

    return NextResponse.json({
      message: assistantResponse.text,
      id: savedMessage.id,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Chat error details:", {
      message: errorMessage,
      error,
    })
    return NextResponse.json(
      { 
        error: "Failed to process chat message",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

// GET chat history
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const db = requireAdminDb()
    const messagesSnapshot = await db
      .collection("users")
      .doc(user.id)
      .collection("chatMessages")
      .orderBy("createdAt", "asc")
      .get()

    const messages = messagesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Error fetching chat history:", error)
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    )
  }
}

