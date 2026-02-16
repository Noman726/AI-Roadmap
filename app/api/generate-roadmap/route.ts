import { groq } from "@ai-sdk/groq"

export async function POST(req: Request) {
  const { profile } = await req.json()

  try {
    // Use fast local generator instead of slow AI generateObject
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
