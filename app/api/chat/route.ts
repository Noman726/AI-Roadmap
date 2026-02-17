import { NextRequest, NextResponse } from "next/server"
import { requireAdminDb, serverTimestamp } from "@/lib/firestore"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

function getUserIdFromRequest(req: NextRequest) {
  return req.headers.get("x-user-id")
}

// Helper to get user from request
async function getUserFromRequest(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req)
    
    if (!userId) {
      return null
    }

    const db = requireAdminDb()
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return {
        id: userId,
        name: "Student",
        email: "",
        profile: null,
        roadmaps: [],
      }
    }

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
    console.warn("Falling back to lightweight chat context:", error)
    const userId = getUserIdFromRequest(req)
    if (!userId) return null
    return {
      id: userId,
      name: "Student",
      email: "",
      profile: null,
      roadmaps: [],
    }
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
    const { message, profile, roadmap, history } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    let db: any = null
    let chatHistory: Array<{ role: "user" | "assistant"; content: string }> = []

    try {
      db = requireAdminDb()
    } catch {
      db = null
    }

    if (db) {
      await db.collection("users").doc(user.id).collection("chatMessages").add({
        userId: user.id,
        role: "user",
        content: message,
        createdAt: serverTimestamp(),
      })

      const chatHistorySnapshot = await db
        .collection("users")
        .doc(user.id)
        .collection("chatMessages")
        .orderBy("createdAt", "asc")
        .limit(10)
        .get()

      chatHistory = chatHistorySnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          role: data.role as "user" | "assistant",
          content: String(data.content || ""),
        }
      })
    } else if (Array.isArray(history)) {
      chatHistory = history
        .filter((msg: any) => msg && (msg.role === "user" || msg.role === "assistant") && typeof msg.content === "string")
        .slice(-8)
    }

    // Prepare context from user's roadmap and profile
    const currentRoadmap = user.roadmaps[0] || roadmap || null
    const userProfile = user.profile || profile || null
    const currentSteps = Array.isArray(currentRoadmap?.steps) ? currentRoadmap.steps : []
    const completedStepsFromProgress = Array.isArray(currentRoadmap?.progress)
      ? Number(currentRoadmap.progress[0]?.completedSteps || 0)
      : Number(currentRoadmap?.completedSteps || 0)

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
- Total Steps: ${currentSteps.length}
- Status: ${completedStepsFromProgress} / ${currentSteps.length} steps completed

Current Focus Step:
${
  currentSteps.find((s) => Array.isArray(s.milestones) && s.milestones.length > 0)?.title || "Starting the journey"
}
`
    : ""
}

Be conversational, helpful, and encourage the student to keep learning. Ask clarifying questions if needed. Provide actionable advice.`

    const messages = chatHistory

    // Generate response using Groq
    let assistantText = ""

    try {
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
        maxOutputTokens: 500,
      })
      assistantText = assistantResponse.text
    } catch (aiError) {
      console.warn("AI generation failed, using fallback response:", aiError)
      assistantText = "I’m here to help. I couldn’t reach the AI model right now, but you can tell me your current step and I’ll suggest a simple next action plan."
    }

    // Save assistant response to database
    let savedMessageId: string | null = null
    if (db) {
      const savedMessage = await db
        .collection("users")
        .doc(user.id)
        .collection("chatMessages")
        .add({
          userId: user.id,
          role: "assistant",
          content: assistantText,
          createdAt: serverTimestamp(),
        })
      savedMessageId = savedMessage.id
    }

    return NextResponse.json({
      message: assistantText,
      id: savedMessageId,
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
    const userId = getUserIdFromRequest(req)

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    let db: any = null
    try {
      db = requireAdminDb()
    } catch {
      db = null
    }

    if (!db) {
      return NextResponse.json({ messages: [] })
    }

    const messagesSnapshot = await db
      .collection("users")
      .doc(userId)
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

