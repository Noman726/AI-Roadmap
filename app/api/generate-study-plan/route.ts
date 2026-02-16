import { groq } from "@ai-sdk/groq"

export async function POST(req: Request) {
  const { profile, currentStep } = await req.json()

  try {
    // Generate a fast, reliable study plan using the fallback generator
    const fallbackPlan = generateFallbackStudyPlan(profile, currentStep)
    return Response.json({ studyPlan: fallbackPlan })
  } catch (error) {
    console.error("Study Plan Generation failed:", error)
    return Response.json(
      { error: "Failed to generate study plan" },
      { status: 500 }
    )
  }
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

  const generateDailyTasks = (dayIndex: number) => {
    const daysWithoutPractice = [0, 2, 4] // Mon, Wed, Fri (lighter days)
    const hasPractice = !daysWithoutPractice.includes(dayIndex)
    const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

    if (dayIndex === 6) {
      // Sunday - review day
      return [
        {
          time: "10:00 AM",
          task: "Review the week's concepts and take notes",
          duration: "45m",
          type: "review" as const,
        },
        {
          time: "11:00 AM",
          task: "Practice difficult topics from the week",
          duration: "45m",
          type: "practice" as const,
        },
        {
          time: "12:00 PM",
          task: "Plan next week's focus areas",
          duration: "30m",
          type: "review" as const,
        },
      ]
    }

    const tasks = [
      {
        time: "9:00 AM",
        task: `${learningActivity} on ${currentStep.title}`,
        duration: `${minutesPerSession}m`,
        type: "learning" as const,
      },
    ]

    if (hasPractice) {
      tasks.push({
        time: "11:00 AM",
        task: `${practiceActivity} for ${currentStep.title}`,
        duration: `${minutesPerSession}m`,
        type: "practice" as const,
      })
    }

    if (isHandsOn && dayIndex % 2 === 0) {
      tasks.push({
        time: "1:00 PM",
        task: `Build a mini-project applying today's learnings`,
        duration: "60m",
        type: "project" as const,
      })
    }

    return tasks
  }

  const skillsList = Array.isArray(currentStep.skills)
    ? currentStep.skills.slice(0, 3)
    : ["Core Concepts", "Practical Application", "Advanced Techniques"]

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
