import { generateObject } from "ai"
import { z } from "zod"
import { openai } from "@ai-sdk/openai"

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

  try {
    // Attempt to generate with AI
    // Note: This requires OPENAI_API_KEY environment variable to be set
    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: roadmapSchema,
      prompt: `You are an expert career counselor and learning path designer. Create a comprehensive, personalized learning roadmap for a student with the following profile:

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
5. Important: Return valid JSON matching the schema strictly.
6. Make the roadmap practical, achievable, and tailored to their learning style. Include real resources when possible (Coursera, Udemy, YouTube channels, books, documentation).`,
      maxTokens: 3000,
    })

    return Response.json({ roadmap: object })
  } catch (error) {
    console.error("AI Generation failed:", error)
    console.log("Falling back to local template generator")

    // Fallback generation logic
    const fallbackRoadmap = generateFallbackRoadmap(profile)
    return Response.json({ roadmap: fallbackRoadmap })
  }
}

function generateFallbackRoadmap(profile: any) {
  const goal = profile.careerGoal?.toLowerCase() || "general"
  const isWeb = goal.includes("web") || goal.includes("frontend") || goal.includes("backend") || goal.includes("full stack")
  const isData = goal.includes("data") || goal.includes("ai") || goal.includes("learning")
  const isDesign = goal.includes("design") || goal.includes("ux") || goal.includes("ui")

  // Base template
  let roadmap = {
    careerPath: profile.careerGoal || "Software Developer",
    overview: `A personalized robust learning path designed to take you from ${profile.currentSkillLevel} to professional competency in ${profile.careerGoal}.`,
    estimatedTimeframe: "6-8 Months",
    steps: [] as any[],
    weeklySchedule: {
      monday: "Foundational concepts (1h)",
      tuesday: "Practice exercises (1h)",
      wednesday: "Mid-week review (30m)",
      thursday: "New topic exploration (1h)",
      friday: "Mini-project work (2h)",
      saturday: "Deep work session (3h)",
      sunday: "Rest & Planning"
    }
  }

  // Generate steps based on domain
  if (isWeb) {
    roadmap.steps = [
      {
        id: "step-1",
        title: "Web Fundamentals HTML/CSS",
        description: "Master the building blocks of the web. Structure content with HTML5 and style it with modern CSS3.",
        duration: "4 Weeks",
        resources: [
          { title: "MDN Web Docs", type: "documentation", url: "https://developer.mozilla.org", description: "The bible of web development." },
          { title: "FreeCodeCamp Responsive Web Design", type: "course", url: "https://www.freecodecamp.org", description: "Interactive certification course." }
        ],
        skills: ["HTML5", "CSS3", "Flexbox", "Grid"],
        milestones: ["Build a personal portfolio page", "Create a responsive landing page"]
      },
      {
        id: "step-2",
        title: "JavaScript Programming",
        description: "Add interactivity to your sites. Learn DOM manipulation, events, and ES6+ syntax.",
        duration: "6 Weeks",
        resources: [
          { title: "JavaScript.info", type: "documentation", url: "https://javascript.info", description: "Modern JavaScript tutorial." }
        ],
        skills: ["Variables", "Functions", "DOM", "Async/Await"],
        milestones: ["Build a Todo App", "Create a Weather Dashboard"]
      },
      {
        id: "step-3",
        title: "Frontend Frameworks (React)",
        description: "Scale your applications with component-based architecture.",
        duration: "8 Weeks",
        resources: [
          { title: "React Official Docs", type: "documentation", url: "https://react.dev", description: "Learn React by doing." }
        ],
        skills: ["Components", "Hooks", "State Management", "Routing"],
        milestones: ["Build an E-commerce UI", "Create a Task Manager"]
      }
    ]
  } else if (isData) {
    roadmap.steps = [
      {
        id: "step-1",
        title: "Python Fundamentals",
        description: "Learn the primary language of Data Science.",
        duration: "4 Weeks",
        resources: [
          { title: "Automate the Boring Stuff with Python", type: "book", description: "Practical Python programming." }
        ],
        skills: ["Syntax", "Data Structures", "Functions", "Modules"],
        milestones: ["Write a script to automate a daily task"]
      },
      {
        id: "step-2",
        title: "Data Analysis Libraries",
        description: "Master NumPy, Pandas, and Matplotlib for data manipulation.",
        duration: "6 Weeks",
        resources: [
          { title: "Kaggle Learn", type: "course", description: "Interactive data science tutorials." }
        ],
        skills: ["Pandas", "NumPy", "Data Cleaning", "Visualization"],
        milestones: ["Analyze a public dataset", "Create a visualization dashboard"]
      }
    ]
  } else {
    // Generic Software Dev
    roadmap.steps = [
      {
        id: "step-1",
        title: "Computer Science Fundamentals",
        description: "Understand how computers work, algorithms, and data structures.",
        duration: "6 Weeks",
        resources: [
          { title: "CS50 Introduction to Computer Science", type: "course", description: "Harvard's legendary intro course." }
        ],
        skills: ["Algorithms", "Data Structures", "Memory", "Problem Solving"],
        milestones: ["Solve 50 LeetCode easy problems"]
      },
      {
        id: "step-2",
        title: "Programming Core",
        description: "Pick a language and master its depth.",
        duration: "8 Weeks",
        resources: [],
        skills: ["OOP", "Design Patterns", "Testing"],
        milestones: ["Build a CLI tool"]
      }
    ]
  }

  return roadmap
}
