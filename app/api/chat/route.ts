import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

// Helper to get user from request
async function getUserFromRequest(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id")
    
    if (!userId) {
      return null
    }

    // Try to find user in database
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        roadmaps: {
          include: {
            steps: true,
            progress: true,
          },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    })

    // If user doesn't exist in DB (localStorage user), create a minimal record
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: `user_${userId}@localhost`,
          name: `User ${userId.substring(0, 8)}`,
          password: "", // Empty password since this is a placeholder user
        },
        include: {
          profile: true,
          roadmaps: {},
        },
      }).catch(() => null) // Ignore if user already exists (race condition)

      // If creation failed, try to fetch again
      if (!user) {
        user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            profile: true,
            roadmaps: {
              include: {
                steps: true,
                progress: true,
              },
              take: 1,
              orderBy: { createdAt: "desc" },
            },
          },
        })
      }
    }

    return user
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

    // Save user message to database
    await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: "user",
        content: message,
      },
    })

    // Get previous chat history for context
    const chatHistory = await prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      take: 10, // Last 10 messages for context
    })

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
  currentRoadmap.steps.find((s) => !JSON.parse(s.milestones || "[]")[0])?.title || "Starting the journey"
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
    const savedMessage = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: "assistant",
        content: assistantResponse.text,
      },
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

    const messages = await prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Error fetching chat history:", error)
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    )
  }
}

