import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"

export async function POST(req: Request) {
  const { profile } = await req.json()

  try {
    // Try AI-generated roadmap first
    const aiRoadmap = await generateAIRoadmap(profile)
    if (aiRoadmap) {
      return Response.json({ roadmap: aiRoadmap })
    }
  } catch (error) {
    console.error("AI Roadmap Generation failed, using fallback:", error)
  }

  try {
    const roadmap = generateFallbackRoadmap(profile)
    return Response.json({ roadmap })
  } catch (error) {
    console.error("Roadmap Generation failed:", error)
    return Response.json(
      { error: "Failed to generate roadmap" },
      { status: 500 }
    )
  }
}

async function generateAIRoadmap(profile: any) {
  const goal = profile?.careerGoal || "Software Developer"
  const skillLevel = profile?.currentSkillLevel || "beginner"
  const learningStyle = profile?.learningStyle || "visual"
  const studyTime = profile?.studyTime || "5-10"
  const interests = profile?.interests || "general software"
  const educationLevel = profile?.educationLevel || "self-taught"

  const prompt = `You are an expert learning designer. Create a personalized roadmap for a student.

Student profile:
- Career goal: ${goal}
- Skill level: ${skillLevel}
- Learning style: ${learningStyle}
- Study time: ${studyTime} hours/week
- Interests: ${interests}
- Education level: ${educationLevel}

Requirements:
- Create 4 to 6 steps, each with id (step-1, step-2, ...), title, description, duration, skills (array), resources (array with title, type, url, description), milestones (array).
- Provide a realistic estimatedTimeframe.
- Provide a weeklySchedule object with monday-sunday strings.
- Make the roadmap specific to the career goal (do not reuse generic web/dev steps).

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "careerPath": "...",
  "overview": "...",
  "estimatedTimeframe": "...",
  "steps": [
    {
      "id": "step-1",
      "title": "...",
      "description": "...",
      "duration": "...",
      "skills": ["..."],
      "resources": [
        { "title": "...", "type": "course", "url": "https://...", "description": "..." }
      ],
      "milestones": ["..."]
    }
  ],
  "weeklySchedule": {
    "monday": "...",
    "tuesday": "...",
    "wednesday": "...",
    "thursday": "...",
    "friday": "...",
    "saturday": "...",
    "sunday": "..."
  }
}`

  const { text } = await generateText({
    model: groq("llama-3.3-70b-versatile"),
    prompt,
    temperature: 0.7,
    maxOutputTokens: 1200,
  })

  const cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  const roadmap = JSON.parse(cleanText)

  if (!roadmap?.careerPath || !Array.isArray(roadmap.steps) || roadmap.steps.length < 3) {
    throw new Error("Invalid roadmap structure")
  }

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  for (const day of days) {
    if (!roadmap.weeklySchedule || !roadmap.weeklySchedule[day]) {
      throw new Error("Missing weekly schedule")
    }
  }

  return roadmap
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
  } else if (isDesign) {
    roadmap.steps = [
      {
        id: "step-1",
        title: "Design Fundamentals",
        description: "Build a strong foundation in visual hierarchy, typography, and layout.",
        duration: "4 Weeks",
        resources: [
          { title: "Refactoring UI", type: "book", url: "https://www.refactoringui.com", description: "Practical visual design guidance." },
          { title: "Material Design", type: "documentation", url: "https://m3.material.io", description: "UI patterns and systems." }
        ],
        skills: ["Typography", "Color", "Spacing", "Layout"],
        milestones: ["Redesign a landing page", "Build a type scale and color system"]
      },
      {
        id: "step-2",
        title: "UX Research and Flows",
        description: "Learn how to map user journeys and validate assumptions with research.",
        duration: "5 Weeks",
        resources: [
          { title: "NNGroup Articles", type: "article", url: "https://www.nngroup.com/articles/", description: "Evidence-based UX guidance." }
        ],
        skills: ["User research", "Personas", "Journey mapping", "Information architecture"],
        milestones: ["Create a user journey map", "Run 3 short interviews"]
      },
      {
        id: "step-3",
        title: "UI Systems and Prototyping",
        description: "Design reusable components and test workflows with prototypes.",
        duration: "6 Weeks",
        resources: [
          { title: "Figma Learn", type: "course", url: "https://www.figma.com/resources/learn-design/", description: "Hands-on UI tooling." }
        ],
        skills: ["Component libraries", "Auto-layout", "Prototyping"],
        milestones: ["Design a mini design system", "Prototype a core user flow"]
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
