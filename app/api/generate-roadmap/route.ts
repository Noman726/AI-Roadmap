import { generateObject } from "ai"
import { z } from "zod"

const roadmapStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  duration: z.string(),
  resources: z.array(
    z.object({
      title: z.string(),
      type: z.enum(["course", "book", "tutorial", "project", "documentation"]),
      url: z.string().optional(),
      description: z.string(),
    }),
  ),
  skills: z.array(z.string()),
  milestones: z.array(z.string()),
})

const roadmapSchema = z.object({
  careerPath: z.string(),
  overview: z.string(),
  estimatedTimeframe: z.string(),
  steps: z.array(roadmapStepSchema),
  weeklySchedule: z.object({
    monday: z.string(),
    tuesday: z.string(),
    wednesday: z.string(),
    thursday: z.string(),
    friday: z.string(),
    saturday: z.string(),
    sunday: z.string(),
  }),
})

export async function POST(req: Request) {
  const { profile } = await req.json()

  const prompt = `You are an expert career counselor and learning path designer. Create a comprehensive, personalized learning roadmap for a student with the following profile:

Interests: ${profile.interests}
Education Level: ${profile.educationLevel}
Career Goal: ${profile.careerGoal}
Current Skill Level: ${profile.currentSkillLevel}
Learning Style: ${profile.learningStyle}
Available Study Time: ${profile.studyTime} hours per week

Generate a detailed step-by-step roadmap that:
1. Maps their interests to the career goal
2. Breaks down the learning path into 5-8 major steps/phases
3. For each step, provide:
   - Clear title and description
   - Realistic duration based on their skill level and study time
   - 3-5 specific learning resources (courses, books, tutorials, projects)
   - Key skills to acquire
   - Milestones to track progress
4. Create a weekly study schedule that fits their available time

Make the roadmap practical, achievable, and tailored to their learning style. Include real resources when possible (Coursera, Udemy, YouTube channels, books, documentation).`

  const { object } = await generateObject({
    model: "openai/gpt-5-mini",
    schema: roadmapSchema,
    prompt,
    maxOutputTokens: 3000,
  })

  return Response.json({ roadmap: object })
}
