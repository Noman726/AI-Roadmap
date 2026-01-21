import { generateObject } from "ai"
import { z } from "zod"

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

  const prompt = `Create a detailed weekly study plan for a student working on: ${currentStep.title}

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

Make sure the total weekly hours match their available study time.`

  const { object } = await generateObject({
    model: "openai/gpt-5-mini",
    schema: studyPlanSchema,
    prompt,
    maxOutputTokens: 2000,
  })

  return Response.json({ studyPlan: object })
}
