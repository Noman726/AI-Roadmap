import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { prisma, resolveDbUserId } from "@/lib/db"

export async function POST(req: Request) {
  const { profile, completedRoadmap, userId, email } = await req.json()

  const completedTopics = completedRoadmap.steps
    .map((s: any) => s.title)
    .join(", ")

  const completedSkills = completedRoadmap.steps
    .flatMap((s: any) => (Array.isArray(s.skills) ? s.skills : []))
    .join(", ")

  let roadmapData: any

  try {
    // Try AI-generated next roadmap first
    const aiRoadmap = await generateAINextRoadmap(profile, completedRoadmap, completedTopics, completedSkills)
    if (aiRoadmap) {
      roadmapData = aiRoadmap
    }
  } catch (error) {
    console.error("AI Next Roadmap Generation failed, using fallback:", error)
  }

  if (!roadmapData) {
    // Fallback to template-based next roadmap
    roadmapData = generateFallbackNextRoadmap(profile, completedRoadmap, completedTopics, completedSkills)
  }

  // Save to database if userId is provided
  if (userId) {
    try {
      const dbUserId = await resolveDbUserId(userId, email)
      if (dbUserId) {
        // Mark the completed roadmap as done in DB
        if (completedRoadmap.id) {
          await prisma.roadmap.update({
            where: { id: completedRoadmap.id },
            data: { completedAt: new Date() },
          })
        } else {
          // Find the latest active roadmap and mark it completed
          const activeRoadmap = await prisma.roadmap.findFirst({
            where: { userId: dbUserId, completedAt: null },
            orderBy: { order: "desc" },
          })
          if (activeRoadmap) {
            await prisma.roadmap.update({
              where: { id: activeRoadmap.id },
              data: { completedAt: new Date() },
            })
          }
        }

        // Get next order number
        const lastRoadmap = await prisma.roadmap.findFirst({
          where: { userId: dbUserId },
          orderBy: { order: "desc" },
        })
        const nextOrder = (lastRoadmap?.order || 0) + 1

        // Save the new roadmap
        const newRoadmap = await prisma.roadmap.create({
          data: {
            userId: dbUserId,
            careerPath: roadmapData.careerPath,
            overview: roadmapData.overview,
            estimatedTimeframe: roadmapData.estimatedTimeframe,
            weeklySchedule: JSON.stringify(roadmapData.weeklySchedule),
            order: nextOrder,
            steps: {
              create: roadmapData.steps.map((step: any) => ({
                title: step.title,
                description: step.description,
                duration: step.duration,
                skills: JSON.stringify(step.skills || []),
                resources: JSON.stringify(step.resources || []),
                milestones: JSON.stringify(step.milestones || []),
                completed: false,
              })),
            },
          },
          include: { steps: true },
        })

        // Create progress tracking for the new roadmap
        await prisma.progress.create({
          data: {
            userId: dbUserId,
            roadmapId: newRoadmap.id,
            totalSteps: newRoadmap.steps.length,
          },
        })

        // Create a notification
        await prisma.notification.create({
          data: {
            userId: dbUserId,
            type: "milestone",
            title: "🎉 New Roadmap Unlocked!",
            message: `Congratulations on completing "${completedRoadmap.careerPath}"! Your next roadmap "${roadmapData.careerPath}" is ready.`,
          },
        })

        // Return the formatted roadmap with parsed JSON fields
        const formattedRoadmap = {
          ...roadmapData,
          id: newRoadmap.id,
          order: nextOrder,
          completedAt: null,
          steps: newRoadmap.steps.map((step: any) => ({
            ...step,
            completed: false,
            progress: 0,
            skills: JSON.parse(step.skills),
            resources: JSON.parse(step.resources),
            milestones: JSON.parse(step.milestones),
          })),
        }

        return Response.json({ roadmap: formattedRoadmap, saved: true })
      }
    } catch (dbError) {
      console.error("Failed to save next roadmap to DB:", dbError)
    }
  }

  // Ensure steps are marked as not completed in the fallback response
  const cleanRoadmap = {
    ...roadmapData,
    completedAt: null,
    steps: roadmapData.steps.map((step: any) => ({
      ...step,
      completed: false,
      progress: 0,
    })),
  }

  return Response.json({ roadmap: cleanRoadmap, saved: false })
}

async function generateAINextRoadmap(
  profile: any,
  completedRoadmap: any,
  completedTopics: string,
  completedSkills: string
) {
  const prompt = `You are an expert career coach. A student has just completed a learning roadmap and needs the next one.

Student profile:
- Career goal: ${profile.careerGoal || "Software Developer"}
- Skill level: ${profile.currentSkillLevel || "beginner"}
- Learning style: ${profile.learningStyle || "visual"}
- Study time: ${profile.studyTime || "5-10"} hours/week

Completed roadmap: "${completedRoadmap.careerPath}"
Topics already mastered: ${completedTopics}
Skills already learned: ${completedSkills}

Generate the NEXT advanced roadmap that builds on what they've learned. Include 3-4 steps with more advanced topics.
Each step needs: id (step-1, step-2, etc.), title, description, duration, skills (array), resources (array with title, type, description), milestones (array).

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
      "skills": ["...", "..."],
      "resources": [{"title": "...", "type": "course", "description": "..."}],
      "milestones": ["...", "..."]
    }
  ],
  "weeklySchedule": {
    "monday": "...", "tuesday": "...", "wednesday": "...",
    "thursday": "...", "friday": "...", "saturday": "...", "sunday": "..."
  }
}`

  const { text } = await generateText({
    model: groq("llama-3.1-8b-instant"),
    prompt,
    temperature: 0.7,
  })

  const cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  const roadmap = JSON.parse(cleanText)

  if (!roadmap.steps || !Array.isArray(roadmap.steps) || roadmap.steps.length === 0) {
    throw new Error("Invalid roadmap structure")
  }

  return roadmap
}

function generateFallbackNextRoadmap(
  profile: any,
  completedRoadmap: any,
  completedTopics: string,
  completedSkills: string
) {
  const goal = profile.careerGoal?.toLowerCase() || "general"
  const isWeb =
    goal.includes("web") ||
    goal.includes("frontend") ||
    goal.includes("backend") ||
    goal.includes("full stack")
  const isData =
    goal.includes("data") || goal.includes("ai") || goal.includes("learning")

  const completedOrder = completedRoadmap.order || 1

  // Build advanced roadmaps that progress based on order
  if (isWeb) {
    return getWebNextRoadmap(completedOrder, profile)
  } else if (isData) {
    return getDataNextRoadmap(completedOrder, profile)
  } else {
    return getGenericNextRoadmap(completedOrder, profile)
  }
}

function getWebNextRoadmap(completedOrder: number, profile: any) {
  const levels = [
    // Level 2: Intermediate Web
    {
      careerPath: `${profile.careerGoal || "Web Developer"} - Intermediate`,
      overview:
        "Build on your foundations with backend development, databases, and API design to become a full-stack developer.",
      estimatedTimeframe: "3-4 Months",
      steps: [
        {
          id: "step-1",
          title: "Node.js & Express Backend",
          description:
            "Build server-side applications with Node.js and Express. Learn REST API design, middleware, and authentication.",
          duration: "5 Weeks",
          skills: ["Node.js", "Express", "REST APIs", "Authentication"],
          resources: [
            {
              title: "Node.js Official Docs",
              type: "documentation",
              description: "Complete Node.js guide.",
            },
            {
              title: "The Odin Project - NodeJS",
              type: "course",
              description: "Full-stack JavaScript curriculum.",
            },
          ],
          milestones: [
            "Build a REST API with CRUD operations",
            "Implement JWT authentication",
          ],
        },
        {
          id: "step-2",
          title: "Databases & ORM",
          description:
            "Master relational and NoSQL databases. Learn SQL, PostgreSQL, MongoDB, and ORMs like Prisma.",
          duration: "4 Weeks",
          skills: ["SQL", "PostgreSQL", "MongoDB", "Prisma ORM"],
          resources: [
            {
              title: "SQLBolt",
              type: "tutorial",
              description: "Interactive SQL lessons.",
            },
            {
              title: "Prisma Documentation",
              type: "documentation",
              description: "Modern database toolkit.",
            },
          ],
          milestones: [
            "Design a normalized database schema",
            "Build a full-stack app with Prisma",
          ],
        },
        {
          id: "step-3",
          title: "Full-Stack Project & Deployment",
          description:
            "Combine frontend and backend skills to build and deploy a production-ready full-stack application.",
          duration: "6 Weeks",
          skills: ["Next.js", "Deployment", "CI/CD", "Docker Basics"],
          resources: [
            {
              title: "Vercel Deployment Guide",
              type: "documentation",
              description: "Deploy Next.js apps.",
            },
          ],
          milestones: [
            "Deploy a full-stack app to production",
            "Set up CI/CD pipeline",
          ],
        },
      ],
    },
    // Level 3: Advanced Web
    {
      careerPath: `${profile.careerGoal || "Web Developer"} - Advanced`,
      overview:
        "Master advanced topics like system design, performance optimization, testing strategies, and cloud infrastructure.",
      estimatedTimeframe: "4-5 Months",
      steps: [
        {
          id: "step-1",
          title: "System Design & Architecture",
          description:
            "Learn to design scalable systems. Study microservices, caching, load balancing, and message queues.",
          duration: "6 Weeks",
          skills: [
            "System Design",
            "Microservices",
            "Caching",
            "Message Queues",
          ],
          resources: [
            {
              title: "System Design Primer",
              type: "documentation",
              description: "Learn system design concepts.",
            },
          ],
          milestones: [
            "Design a scalable e-commerce system",
            "Implement a caching layer",
          ],
        },
        {
          id: "step-2",
          title: "Testing & Quality Assurance",
          description:
            "Master testing strategies including unit tests, integration tests, E2E tests, and TDD.",
          duration: "4 Weeks",
          skills: ["Jest", "Cypress", "TDD", "Integration Testing"],
          resources: [
            {
              title: "Testing JavaScript",
              type: "course",
              description: "Comprehensive testing guide.",
            },
          ],
          milestones: [
            "Achieve 80%+ test coverage on a project",
            "Implement E2E tests",
          ],
        },
        {
          id: "step-3",
          title: "Cloud & DevOps Essentials",
          description:
            "Deploy and manage applications on cloud platforms. Learn AWS/GCP basics, Docker, and Kubernetes.",
          duration: "6 Weeks",
          skills: ["AWS", "Docker", "Kubernetes", "Monitoring"],
          resources: [
            {
              title: "AWS Free Tier",
              type: "documentation",
              description: "Hands-on cloud experience.",
            },
          ],
          milestones: [
            "Deploy a containerized application",
            "Set up monitoring and alerting",
          ],
        },
        {
          id: "step-4",
          title: "Portfolio & Interview Prep",
          description:
            "Build an impressive portfolio, practice system design interviews, and prepare for technical assessments.",
          duration: "4 Weeks",
          skills: [
            "Portfolio",
            "Interview Prep",
            "DSA Review",
            "Behavioral",
          ],
          resources: [
            {
              title: "LeetCode",
              type: "tutorial",
              description: "Practice coding problems.",
            },
          ],
          milestones: [
            "Complete portfolio website",
            "Solve 100 LeetCode problems",
          ],
        },
      ],
    },
  ]

  const levelIndex = Math.min(completedOrder - 1, levels.length - 1)
  const roadmap = levels[levelIndex]

  return {
    ...roadmap,
    weeklySchedule: {
      monday: "Theory & concepts (1.5h)",
      tuesday: "Hands-on coding (2h)",
      wednesday: "Practice problems (1h)",
      thursday: "Project work (2h)",
      friday: "Code review & refactoring (1.5h)",
      saturday: "Deep project work (3h)",
      sunday: "Rest & planning",
    },
  }
}

function getDataNextRoadmap(completedOrder: number, profile: any) {
  const levels = [
    // Level 2: Intermediate Data Science
    {
      careerPath: `${profile.careerGoal || "Data Scientist"} - Intermediate`,
      overview:
        "Advance your data science skills with machine learning, statistical modeling, and real-world data projects.",
      estimatedTimeframe: "3-4 Months",
      steps: [
        {
          id: "step-1",
          title: "Machine Learning Fundamentals",
          description:
            "Learn supervised and unsupervised learning algorithms, model evaluation, and scikit-learn.",
          duration: "6 Weeks",
          skills: [
            "Scikit-learn",
            "Regression",
            "Classification",
            "Clustering",
          ],
          resources: [
            {
              title: "Andrew Ng's ML Course",
              type: "course",
              description: "Stanford's legendary ML course.",
            },
          ],
          milestones: [
            "Build 3 ML models on real datasets",
            "Achieve 90%+ accuracy on a classification task",
          ],
        },
        {
          id: "step-2",
          title: "Deep Learning & Neural Networks",
          description:
            "Explore deep learning with TensorFlow/PyTorch. Build CNNs, RNNs, and transformers.",
          duration: "8 Weeks",
          skills: ["PyTorch", "CNNs", "RNNs", "Transfer Learning"],
          resources: [
            {
              title: "Fast.ai",
              type: "course",
              description: "Practical deep learning for coders.",
            },
          ],
          milestones: [
            "Build an image classifier",
            "Train a text generation model",
          ],
        },
        {
          id: "step-3",
          title: "Data Engineering & MLOps",
          description:
            "Learn to deploy ML models, build data pipelines, and manage ML workflows in production.",
          duration: "5 Weeks",
          skills: ["MLOps", "Data Pipelines", "Model Deployment", "MLflow"],
          resources: [
            {
              title: "Made With ML",
              type: "course",
              description: "MLOps best practices.",
            },
          ],
          milestones: [
            "Deploy an ML model as an API",
            "Build an automated data pipeline",
          ],
        },
      ],
    },
    // Level 3: Advanced
    {
      careerPath: `${profile.careerGoal || "Data Scientist"} - Advanced`,
      overview:
        "Master advanced AI topics including NLP, computer vision, reinforcement learning, and production ML systems.",
      estimatedTimeframe: "4-5 Months",
      steps: [
        {
          id: "step-1",
          title: "Natural Language Processing",
          description:
            "Master NLP with transformers, BERT, GPT, and build real-world text applications.",
          duration: "6 Weeks",
          skills: ["NLP", "Transformers", "Hugging Face", "Text Classification"],
          resources: [
            {
              title: "Hugging Face Course",
              type: "course",
              description: "NLP with transformers.",
            },
          ],
          milestones: [
            "Build a sentiment analyzer",
            "Fine-tune a language model",
          ],
        },
        {
          id: "step-2",
          title: "Computer Vision",
          description:
            "Learn image processing, object detection, segmentation, and generative models.",
          duration: "6 Weeks",
          skills: ["OpenCV", "YOLO", "GANs", "Image Segmentation"],
          resources: [
            {
              title: "PyImageSearch",
              type: "tutorial",
              description: "Computer vision tutorials.",
            },
          ],
          milestones: [
            "Build an object detection system",
            "Create a style transfer application",
          ],
        },
        {
          id: "step-3",
          title: "Portfolio & Kaggle Competitions",
          description:
            "Build your data science portfolio and compete in Kaggle to sharpen your skills.",
          duration: "6 Weeks",
          skills: ["Kaggle", "Portfolio", "Feature Engineering", "Ensemble Methods"],
          resources: [
            {
              title: "Kaggle",
              type: "tutorial",
              description: "Data science competitions.",
            },
          ],
          milestones: [
            "Complete 3 Kaggle competitions",
            "Publish portfolio with 5+ projects",
          ],
        },
      ],
    },
  ]

  const levelIndex = Math.min(completedOrder - 1, levels.length - 1)
  const roadmap = levels[levelIndex]

  return {
    ...roadmap,
    weeklySchedule: {
      monday: "Theory & math foundations (1.5h)",
      tuesday: "Hands-on coding with datasets (2h)",
      wednesday: "Paper reading & research (1h)",
      thursday: "Project work (2h)",
      friday: "Model experimentation (1.5h)",
      saturday: "Deep project work (3h)",
      sunday: "Rest & planning",
    },
  }
}

function getGenericNextRoadmap(completedOrder: number, profile: any) {
  const levels = [
    // Level 2: Intermediate
    {
      careerPath: `${profile.careerGoal || "Software Developer"} - Intermediate`,
      overview:
        "Level up with advanced programming concepts, software engineering practices, and real-world application development.",
      estimatedTimeframe: "3-4 Months",
      steps: [
        {
          id: "step-1",
          title: "Advanced Programming & Design Patterns",
          description:
            "Master advanced OOP, functional programming, SOLID principles, and common design patterns.",
          duration: "5 Weeks",
          skills: [
            "Design Patterns",
            "SOLID",
            "Functional Programming",
            "Clean Code",
          ],
          resources: [
            {
              title: "Refactoring Guru",
              type: "documentation",
              description: "Design patterns explained visually.",
            },
          ],
          milestones: [
            "Implement 5 design patterns",
            "Refactor a codebase using SOLID principles",
          ],
        },
        {
          id: "step-2",
          title: "Web Development & APIs",
          description:
            "Build full-stack web applications with modern frameworks, REST APIs, and databases.",
          duration: "6 Weeks",
          skills: ["React", "Node.js", "REST APIs", "SQL"],
          resources: [
            {
              title: "Full Stack Open",
              type: "course",
              description: "University of Helsinki's full-stack course.",
            },
          ],
          milestones: [
            "Build a full-stack CRUD app",
            "Design and document a REST API",
          ],
        },
        {
          id: "step-3",
          title: "Version Control & Collaboration",
          description:
            "Master Git workflows, code review, open source contribution, and team collaboration practices.",
          duration: "3 Weeks",
          skills: ["Git", "GitHub", "Code Review", "Open Source"],
          resources: [
            {
              title: "Pro Git Book",
              type: "book",
              description: "Complete Git reference.",
            },
          ],
          milestones: [
            "Contribute to an open source project",
            "Master Git branching strategies",
          ],
        },
      ],
    },
    // Level 3: Advanced
    {
      careerPath: `${profile.careerGoal || "Software Developer"} - Advanced`,
      overview:
        "Prepare for senior-level roles with system design, cloud infrastructure, and interview preparation.",
      estimatedTimeframe: "4-5 Months",
      steps: [
        {
          id: "step-1",
          title: "System Design & Architecture",
          description:
            "Learn to design large-scale distributed systems, microservices, and cloud-native applications.",
          duration: "6 Weeks",
          skills: [
            "System Design",
            "Distributed Systems",
            "Microservices",
            "Cloud Architecture",
          ],
          resources: [
            {
              title: "Designing Data-Intensive Applications",
              type: "book",
              description: "The definitive guide to system design.",
            },
          ],
          milestones: [
            "Design 5 system architectures",
            "Build a microservices application",
          ],
        },
        {
          id: "step-2",
          title: "DevOps & Cloud",
          description:
            "Master CI/CD, Docker, Kubernetes, and cloud platforms for production deployment.",
          duration: "5 Weeks",
          skills: ["Docker", "Kubernetes", "CI/CD", "AWS/GCP"],
          resources: [
            {
              title: "Docker Documentation",
              type: "documentation",
              description: "Container fundamentals.",
            },
          ],
          milestones: [
            "Containerize and deploy an application",
            "Set up a CI/CD pipeline",
          ],
        },
        {
          id: "step-3",
          title: "DSA & Interview Preparation",
          description:
            "Master data structures, algorithms, and practice for technical interviews at top companies.",
          duration: "8 Weeks",
          skills: [
            "Data Structures",
            "Algorithms",
            "Dynamic Programming",
            "System Design Interviews",
          ],
          resources: [
            {
              title: "NeetCode",
              type: "tutorial",
              description: "Curated coding interview prep.",
            },
          ],
          milestones: [
            "Solve 150 LeetCode problems",
            "Complete 5 mock interviews",
          ],
        },
        {
          id: "step-4",
          title: "Portfolio & Career Launch",
          description:
            "Build a professional portfolio, optimize your resume, and apply for dream roles.",
          duration: "4 Weeks",
          skills: ["Portfolio", "Resume", "Networking", "Personal Brand"],
          resources: [
            {
              title: "Tech Interview Handbook",
              type: "documentation",
              description: "Complete interview guide.",
            },
          ],
          milestones: [
            "Launch portfolio website",
            "Apply to 20+ positions",
          ],
        },
      ],
    },
  ]

  const levelIndex = Math.min(completedOrder - 1, levels.length - 1)
  const roadmap = levels[levelIndex]

  return {
    ...roadmap,
    weeklySchedule: {
      monday: "Theory & concepts (1.5h)",
      tuesday: "Hands-on coding (2h)",
      wednesday: "Practice problems (1h)",
      thursday: "Project work (2h)",
      friday: "Code review & learning (1.5h)",
      saturday: "Deep work session (3h)",
      sunday: "Rest & planning",
    },
  }
}
