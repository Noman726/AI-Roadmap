import { generateObject } from "ai"
import { z } from "zod"
import { openai } from "@ai-sdk/openai"

const dailyTaskSchema = z.object({
  time: z.string(),
  task: z.string(),
  duration: z.string(),
  type: z.enum(["learning", "practice", "project", "review"]),
})

const studyPlanSchema = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
  focusArea: z.string(),
  dailyPlans: z.object({
    monday: z.array(dailyTaskSchema),
    tuesday: z.array(dailyTaskSchema),
    wednesday: z.array(dailyTaskSchema),
    thursday: z.array(dailyTaskSchema),
    friday: z.array(dailyTaskSchema),
    saturday: z.array(dailyTaskSchema),
    sunday: z.array(dailyTaskSchema),
  }),
  weeklyGoals: z.array(z.string()),
  tips: z.array(z.string()),
})

export async function POST(req: Request) {
  const { profile, currentStep } = await req.json()

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: studyPlanSchema,
      prompt: `Create a detailed weekly study plan for a student working on: ${currentStep.title}

Student Profile:
- Skill Level: ${profile.currentSkillLevel}
- Learning Style: ${profile.learningStyle}
- Available Time: ${profile.studyTime} hours per week

Current Learning Focus: ${currentStep.description}
Skills to Learn: ${currentStep.skills.join(", ")}

Generate a specific, day-by-day study plan with:
1. Concrete daily tasks with time allocations
2. Mix of learning, practice, and project work based on their learning style
3. Realistic time estimates
4. Weekly goals to achieve
5. Study tips for staying motivated

Make sure the total weekly hours match their available study time.`,
      maxTokens: 2000,
    })

    return Response.json({ studyPlan: object })
  } catch (error) {
    console.error("AI Study Plan Generation failed:", error)
    console.log("Falling back to local template generator")

    // Fallback generation logic
    const fallbackPlan = generateFallbackStudyPlan(profile, currentStep)
    return Response.json({ studyPlan: fallbackPlan })
  }
}

function generateFallbackStudyPlan(profile: any, currentStep: any) {
  // Determine hours per day based on studyTime range
  let hoursPerDay = 1
  if (profile.studyTime === "5-10") hoursPerDay = 1.5
  if (profile.studyTime === "10-20") hoursPerDay = 2.5
  if (profile.studyTime === "20+") hoursPerDay = 4

  const isVisual = profile.learningStyle === "visual"
  const isHandsOn = profile.learningStyle === "hands-on"

  const learningTask = isVisual ? `Watch tutorials on ${currentStep.title}` : `Read documentation about ${currentStep.title}`
  const practiceTask = isHandsOn ? `Build a small demo using ${currentStep.title}` : `Complete coding exercises for ${currentStep.title}`

  const generateDailyTasks = (day: string) => {
    // Rest days
    if (day === "sunday") {
      return [
        { time: "Morning", task: "Review week's progress", duration: "30m", type: "review" },
        { time: "Afternoon", task: "Plan for next week", duration: "15m", type: "review" }
      ]
    }

    const tasks = []

    // Core Learning
    tasks.push({
      time: "Session 1",
      task: learningTask,
      duration: `${Math.round(hoursPerDay * 30)}m`,
      type: "learning"
    })

    // Practice (every other day or if hands-on)
    if (["tuesday", "thursday", "saturday"].includes(day) || isHandsOn) {
      tasks.push({
        time: "Session 2",
        task: practiceTask,
        duration: `${Math.round(hoursPerDay * 30)}m`,
        type: "practice"
      })
    }

    return tasks
  }

  return {
    weekStart: "Monday",
    weekEnd: "Sunday",
    focusArea: currentStep.title,
    dailyPlans: {
      monday: generateDailyTasks("monday"),
      tuesday: generateDailyTasks("tuesday"),
      wednesday: generateDailyTasks("wednesday"),
      thursday: generateDailyTasks("thursday"),
      friday: generateDailyTasks("friday"),
      saturday: generateDailyTasks("saturday"),
      sunday: generateDailyTasks("sunday"),
    },
    weeklyGoals: [
      `Understand core concepts of ${currentStep.title}`,
      `Complete 3 practice exercises`,
      `Build a mini-project`
    ],
    tips: [
      "Consistency is key! Stick to your daily schedule.",
      isVisual ? "Watch diagrams and visual explanations." : "Take detailed notes as you read.",
      "Don't get stuck on one problem for too long."
    ]
  }
}
