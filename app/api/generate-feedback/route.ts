import { generateText } from "ai"

export async function POST(req: Request) {
  const { profile, completedSteps, currentProgress } = await req.json()

  const prompt = `You are an encouraging AI mentor. Provide personalized feedback and motivation for a student.

Student Profile:
- Career Goal: ${profile.careerGoal}
- Skill Level: ${profile.currentSkillLevel}

Progress:
- Completed Steps: ${completedSteps}
- Current Progress: ${currentProgress}%

Provide:
1. Celebrate their progress (2-3 sentences)
2. Identify their strengths based on completed work
3. Suggest next focus areas
4. Offer 2-3 actionable tips for improvement
5. Motivational message to keep them going

Keep it encouraging, specific, and personal. Use a friendly, supportive tone.`

  const { text } = await generateText({
    model: "openai:gpt-4o-mini",
    prompt,
    maxOutputTokens: 500,
  })

  return Response.json({ feedback: text })
}
