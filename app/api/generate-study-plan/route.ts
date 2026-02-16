import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"

export async function POST(req: Request) {
  const { profile, currentStep } = await req.json()

  try {
    // Try AI-generated study plan first
    const aiPlan = await generateAIStudyPlan(profile, currentStep)
    if (aiPlan) {
      return Response.json({ studyPlan: aiPlan })
    }
  } catch (error) {
    console.error("AI Study Plan Generation failed, using fallback:", error)
  }

  // Fallback to template-based plan
  const fallbackPlan = generateFallbackStudyPlan(profile, currentStep)
  return Response.json({ studyPlan: fallbackPlan })
}

async function generateAIStudyPlan(profile: any, currentStep: any) {
  const weekStart = new Date().toLocaleDateString()
  const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
  const skills = Array.isArray(currentStep.skills) ? currentStep.skills.join(", ") : "Core concepts"

  const prompt = `Create a detailed weekly study plan for learning "${currentStep.title}".

Student profile:
- Skill level: ${profile.currentSkillLevel || "beginner"}
- Learning style: ${profile.learningStyle || "visual"}
- Study time: ${profile.studyTime || "5-10"} hours/week

Step details:
- Title: ${currentStep.title}
- Description: ${currentStep.description || ""}
- Duration: ${currentStep.duration || "4-6 weeks"}
- Skills to learn: ${skills}

Generate a JSON study plan with 2-3 tasks per day (Monday-Sunday), varied activities, and specific topics.
Each task should have: time (e.g. "9:00 AM"), task (specific activity description), duration (e.g. "45m"), type (one of: "learning", "practice", "project", "review"), and resources.
For each task, provide learning resources appropriate to the learning style (${profile.learningStyle || "visual"}).

Sunday should be a lighter review/planning day.

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{
  "weekStart": "${weekStart}",
  "weekEnd": "${weekEnd}",
  "focusArea": "${currentStep.title}",
  "dailyPlans": {
    "monday": [{"time": "9:00 AM", "task": "...", "duration": "45m", "type": "learning", "resources": [{"title": "Video Title", "type": "video", "url": "https://youtube.com/...", "platform": "youtube"}, {"title": "Article", "type": "article", "url": "https://..."}]}, ...],
    "tuesday": [...],
    "wednesday": [...],
    "thursday": [...],
    "friday": [...],
    "saturday": [...],
    "sunday": [...]
  },
  "weeklyGoals": ["goal1", "goal2", "goal3", "goal4"],
  "tips": ["tip1", "tip2", "tip3", "tip4", "tip5"]
}`

  const { text } = await generateText({
    model: groq("llama-3.1-8b-instant"),
    prompt,
    temperature: 0.7,
  })

  // Parse and validate the response
  const cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  const plan = JSON.parse(cleanText)

  // Validate required fields
  if (!plan.dailyPlans || !plan.focusArea || !plan.weeklyGoals) {
    throw new Error("Invalid plan structure")
  }

  // Ensure all days exist
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  for (const day of days) {
    if (!plan.dailyPlans[day] || !Array.isArray(plan.dailyPlans[day]) || plan.dailyPlans[day].length === 0) {
      throw new Error(`Missing or empty day: ${day}`)
    }
  }

  return plan
}

// Helper function to generate learning resources for a topic
function generateResourcesForTopic(topic: string, learningStyle: string): any[] {
  const encodedTopic = encodeURIComponent(topic.toLowerCase())
  const resources = []

  // Add video resources (for visual learners)
  if (learningStyle === "visual" || learningStyle === "hands-on") {
    resources.push({
      title: `${topic} Tutorial Videos`,
      type: "video",
      url: `https://www.youtube.com/results?search_query=${encodedTopic}+tutorial`,
      platform: "youtube",
    })
  }

  // Add article/documentation
  resources.push({
    title: `${topic} Complete Guide`,
    type: "article",
    url: `https://www.google.com/search?q=${encodedTopic}+documentation+guide`,
    platform: "google",
  })

  // Add practice resources
  if (topic.toLowerCase().includes("code") || topic.toLowerCase().includes("programming")) {
    resources.push({
      title: `${topic} Practice Exercises`,
      type: "pdf",
      url: `https://www.google.com/search?q=${encodedTopic}+coding+exercises+PDF`,
      platform: "google",
    })
  } else {
    resources.push({
      title: `${topic} Study Materials`,
      type: "pdf",
      url: `https://www.google.com/search?q=${encodedTopic}+PDF+study+materials`,
      platform: "google",
    })
  }

  return resources.slice(0, 2) // Return top 2 resources per task
}

function generateFallbackStudyPlan(profile: any, currentStep: any) {
  const studyTimeMap: { [key: string]: number } = {
    "1-5": 0.5,
    "5-10": 1.5,
    "10-20": 2.5,
    "20+": 4,
  }

  const hoursPerDay = studyTimeMap[profile.studyTime] || 1.5
  const minutesPerSession = Math.round((hoursPerDay * 60) / 2)

  const isVisual = profile.learningStyle === "visual"
  const isHandsOn = profile.learningStyle === "hands-on"
  const isReading = profile.learningStyle === "reading"

  let learningActivity = "Watch tutorials and video explanations"
  if (isReading) learningActivity = "Read documentation and articles"
  if (isHandsOn) learningActivity = "Build practical examples"

  let practiceActivity = "Complete coding exercises and challenges"
  if (isVisual) practiceActivity = "Work with visual projects and diagrams"
  if (isHandsOn) practiceActivity = "Build small projects and demos"

  const skills = Array.isArray(currentStep.skills) ? currentStep.skills : ["Core Concepts", "Practical Application", "Advanced Techniques"]

  const topicsByDay = [
    skills[0] || currentStep.title,
    skills[1] || skills[0] || currentStep.title,
    skills[0] || currentStep.title,
    skills[2] || skills[1] || currentStep.title,
    skills[1] || currentStep.title,
    skills[2] || skills[0] || currentStep.title,
    currentStep.title, // Sunday review
  ]

  const generateDailyTasks = (dayIndex: number) => {
    const topic = topicsByDay[dayIndex]
    const resources = generateResourcesForTopic(topic, profile.learningStyle)

    if (dayIndex === 6) {
      // Sunday - lighter review & planning day
      return [
        { 
          time: "10:00 AM", 
          task: `Review all ${currentStep.title} concepts from the week`, 
          duration: "45m", 
          type: "review" as const,
          resources: generateResourcesForTopic(`${currentStep.title} summary notes`, profile.learningStyle)
        },
        { 
          time: "11:00 AM", 
          task: `Practice challenging problems from the week`, 
          duration: "45m", 
          type: "practice" as const,
          resources: generateResourcesForTopic(`${topic} practice problems`, profile.learningStyle)
        },
        { 
          time: "12:00 PM", 
          task: `Create summary notes and flashcards`, 
          duration: "30m", 
          type: "review" as const,
          resources: generateResourcesForTopic(`${currentStep.title} flashcards templates`, profile.learningStyle)
        },
      ]
    }

    if (dayIndex === 5) {
      // Saturday - project day
      return [
        { 
          time: "9:00 AM", 
          task: `${learningActivity} on ${topic}`, 
          duration: `${minutesPerSession}m`, 
          type: "learning" as const,
          resources
        },
        { 
          time: "10:30 AM", 
          task: `Build a mini-project applying ${topic} concepts`, 
          duration: "60m", 
          type: "project" as const,
          resources: generateResourcesForTopic(`${topic} project ideas examples`, profile.learningStyle)
        },
        { 
          time: "12:00 PM", 
          task: `${practiceActivity} for ${topic}`, 
          duration: `${minutesPerSession}m`, 
          type: "practice" as const,
          resources: generateResourcesForTopic(`${topic} hands-on exercises`, profile.learningStyle)
        },
        { 
          time: "2:00 PM", 
          task: `Review and document what you built today`, 
          duration: "30m", 
          type: "review" as const,
          resources: generateResourcesForTopic(`${topic} best practices documentation`, profile.learningStyle)
        },
      ]
    }

    // Monday-Friday: 3-4 varied tasks per day
    const tasks = [
      { 
        time: "9:00 AM", 
        task: `${learningActivity} on ${topic}`, 
        duration: `${minutesPerSession}m`, 
        type: "learning" as const,
        resources
      },
      { 
        time: "10:30 AM", 
        task: `${practiceActivity} for ${topic}`, 
        duration: `${minutesPerSession}m`, 
        type: "practice" as const,
        resources: generateResourcesForTopic(`${topic} practice exercises`, profile.learningStyle)
      },
      { 
        time: "12:00 PM", 
        task: `Solve ${topic} exercises and challenges`, 
        duration: "45m", 
        type: "practice" as const,
        resources: generateResourcesForTopic(`${topic} challenge problems solutions`, profile.learningStyle)
      },
    ]

    // Add a 4th task on alternate days
    if (dayIndex % 2 === 0) {
      tasks.push({ 
        time: "2:00 PM", 
        task: `Build a small demo applying ${topic}`, 
        duration: "45m", 
        type: "project" as const,
        resources: generateResourcesForTopic(`${topic} project examples code`, profile.learningStyle)
      })
    } else {
      tasks.push({ 
        time: "2:00 PM", 
        task: `Review notes and revisit difficult ${topic} concepts`, 
        duration: "30m", 
        type: "review" as const,
        resources: generateResourcesForTopic(`${topic} common mistakes clarification`, profile.learningStyle)
      })
    }

    return tasks
  }

  return {
    weekStart: new Date().toLocaleDateString(),
    weekEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    focusArea: currentStep.title,
    dailyPlans: {
      monday: generateDailyTasks(0),
      tuesday: generateDailyTasks(1),
      wednesday: generateDailyTasks(2),
      thursday: generateDailyTasks(3),
      friday: generateDailyTasks(4),
      saturday: generateDailyTasks(5),
      sunday: generateDailyTasks(6),
    },
    weeklyGoals: [
      `Master the fundamentals of ${currentStep.title}`,
      `Complete at least 5 practice exercises`,
      `Build a small project demonstrating your understanding`,
      `Review and consolidate your learning`,
    ],
    tips: [
      "💡 Start each session by reviewing previous day's notes",
      isVisual
        ? "🎨 Use diagrams and visual tools to understand concepts"
        : isHandsOn
          ? "🛠️ Learn by building - don't just read, code along"
          : "📚 Take detailed notes and create study summaries",
      "⏰ Stick to consistent time slots for better habit formation",
      "🎯 Focus on understanding, not just memorizing",
      "🔄 Review and reinforce at the end of each week",
    ],
  }
}
