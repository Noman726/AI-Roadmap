"use server"

import { db } from "@/lib/db"
import { hash } from "bcryptjs"
import { signIn } from "@/auth"
import { AuthError } from "next-auth"

export async function signup(email: string, password: string, name: string) {
  try {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new Error("User already exists")
    }

    // Hash password
    const hashedPassword = await hash(password, 10)

    // Create user
    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    })

    // Sign in the user
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    return { success: true, userId: user.id }
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials" }
        default:
          return { error: "An error occurred" }
      }
    }
    throw error
  }
}

export async function saveProfile(userId: string, profileData: any) {
  try {
    const profile = await db.profile.upsert({
      where: { userId },
      update: profileData,
      create: {
        userId,
        ...profileData,
      },
    })
    return { success: true, profile }
  } catch (error) {
    console.error("Error saving profile:", error)
    throw error
  }
}

export async function saveRoadmap(userId: string, roadmapData: any) {
  try {
    // First, delete existing roadmaps for this user
    await db.roadmap.deleteMany({
      where: { userId },
    })

    // Create new roadmap with steps
    const roadmap = await db.roadmap.create({
      data: {
        userId,
        careerPath: roadmapData.careerPath,
        overview: roadmapData.overview,
        estimatedTimeframe: roadmapData.estimatedTimeframe,
        weeklySchedule: JSON.stringify(roadmapData.weeklySchedule),
        steps: {
          create: roadmapData.steps.map((step: any) => ({
            title: step.title,
            description: step.description,
            duration: step.duration,
            skills: JSON.stringify(step.skills),
            resources: JSON.stringify(step.resources),
            milestones: JSON.stringify(step.milestones),
            completed: step.completed || false,
          })),
        },
      },
      include: {
        steps: true,
      },
    })

    // Create progress tracking
    await db.progress.create({
      data: {
        userId,
        roadmapId: roadmap.id,
        totalSteps: roadmap.steps.length,
      },
    })

    return { success: true, roadmap }
  } catch (error) {
    console.error("Error saving roadmap:", error)
    throw error
  }
}

export async function getUserRoadmap(userId: string) {
  try {
    const roadmap = await db.roadmap.findFirst({
      where: { userId },
      include: {
        steps: true,
      },
    })

    if (!roadmap) return null

    return {
      ...roadmap,
      weeklySchedule: JSON.parse(roadmap.weeklySchedule),
      steps: roadmap.steps.map((step) => ({
        ...step,
        skills: JSON.parse(step.skills),
        resources: JSON.parse(step.resources),
        milestones: JSON.parse(step.milestones),
      })),
    }
  } catch (error) {
    console.error("Error fetching roadmap:", error)
    throw error
  }
}

export async function updateStepCompletion(stepId: string, completed: boolean) {
  try {
    const step = await db.step.update({
      where: { id: stepId },
      data: { completed },
    })
    return { success: true, step }
  } catch (error) {
    console.error("Error updating step:", error)
    throw error
  }
}

export async function saveProgress(userId: string, roadmapId: string, completedSteps: number, feedback?: string) {
  try {
    const progress = await db.progress.upsert({
      where: {
        userId_roadmapId: { userId, roadmapId },
      },
      update: {
        completedSteps,
        feedback: feedback || undefined,
      },
      create: {
        userId,
        roadmapId,
        totalSteps: 0,
        completedSteps,
        feedback,
      },
    })
    return { success: true, progress }
  } catch (error) {
    console.error("Error saving progress:", error)
    throw error
  }
}

export async function saveStudyPlan(userId: string, roadmapId: string, studyPlan: any) {
  try {
    const progress = await db.progress.upsert({
      where: {
        userId_roadmapId: { userId, roadmapId },
      },
      update: {
        studyPlan: JSON.stringify(studyPlan),
      },
      create: {
        userId,
        roadmapId,
        totalSteps: 0,
        studyPlan: JSON.stringify(studyPlan),
      },
    })
    return { success: true, progress }
  } catch (error) {
    console.error("Error saving study plan:", error)
    throw error
  }
}
