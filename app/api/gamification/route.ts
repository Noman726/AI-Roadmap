import { NextRequest, NextResponse } from "next/server"
import { requireAdminDb, serverTimestamp } from "@/lib/firestore"
import type { GamificationStats, ActivityType } from "@/lib/types"

const POINTS: Record<ActivityType, number> = {
  daily_login: 5,
  task_completed: 10,
  step_completed: 50,
  roadmap_completed: 200,
  study_plan_generated: 20,
  chat_interaction: 2,
}

const LEVELS = [
  { level: 1, name: "Beginner", minPoints: 0 },
  { level: 2, name: "Learner", minPoints: 100 },
  { level: 3, name: "Student", minPoints: 300 },
  { level: 4, name: "Scholar", minPoints: 600 },
  { level: 5, name: "Expert", minPoints: 1000 },
  { level: 6, name: "Master", minPoints: 2000 },
  { level: 7, name: "Legend", minPoints: 5000 },
]

function getCurrentLevel(points: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) {
      return LEVELS[i]
    }
  }
  return LEVELS[0]
}

function checkBadges(stats: GamificationStats): string[] {
  const newBadges: string[] = []
  
  // Streak badges
  if (stats.currentStreak >= 7 && !stats.badges.includes("week_warrior")) {
    newBadges.push("week_warrior")
  }
  if (stats.currentStreak >= 30 && !stats.badges.includes("month_master")) {
    newBadges.push("month_master")
  }
  if (stats.currentStreak >= 100 && !stats.badges.includes("century_club")) {
    newBadges.push("century_club")
  }
  
  // Task completion badges
  if (stats.stats.totalTasksCompleted >= 1 && !stats.badges.includes("first_step")) {
    newBadges.push("first_step")
  }
  if (stats.stats.totalTasksCompleted >= 50 && !stats.badges.includes("task_crusher")) {
    newBadges.push("task_crusher")
  }
  
  // Step completion badges
  if (stats.stats.totalStepsCompleted >= 10 && !stats.badges.includes("knowledge_seeker")) {
    newBadges.push("knowledge_seeker")
  }
  
  // Roadmap completion badges
  if (stats.stats.totalRoadmapsCompleted >= 1 && !stats.badges.includes("road_warrior")) {
    newBadges.push("road_warrior")
  }
  
  // Study days badge
  if (stats.stats.totalStudyDays >= 30 && !stats.badges.includes("dedication")) {
    newBadges.push("dedication")
  }
  
  // Points badge
  if (stats.totalPoints >= 1000 && !stats.badges.includes("overachiever")) {
    newBadges.push("overachiever")
  }
  
  return newBadges
}

// GET - Fetch gamification stats
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    
    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 })
    }

    let db: any
    try {
      db = requireAdminDb()
    } catch (error) {
      // Firebase not configured - return default stats
      return NextResponse.json({
        stats: {
          userId,
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: "",
          totalPoints: 0,
          level: 1,
          badges: [],
          stats: {
            totalTasksCompleted: 0,
            totalStepsCompleted: 0,
            totalRoadmapsCompleted: 0,
            totalStudyDays: 0,
          },
          updatedAt: new Date().toISOString(),
        },
      })
    }

    const statsRef = db.collection("users").doc(userId).collection("gamification").doc("stats")
    const statsDoc = await statsRef.get()

    if (!statsDoc.exists) {
      // Create initial stats
      const initialStats: GamificationStats = {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: "",
        totalPoints: 0,
        level: 1,
        badges: [],
        stats: {
          totalTasksCompleted: 0,
          totalStepsCompleted: 0,
          totalRoadmapsCompleted: 0,
          totalStudyDays: 0,
        },
        updatedAt: new Date().toISOString(),
      }

      await statsRef.set({
        ...initialStats,
        updatedAt: serverTimestamp(),
      })

      return NextResponse.json({ stats: initialStats })
    }

    const stats = statsDoc.data() as GamificationStats
    return NextResponse.json({ stats })
  } catch (error) {
    console.error("Error fetching gamification stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}

// POST - Record activity and update stats
export async function POST(req: NextRequest) {
  try {
    const { userId, activity, metadata } = await req.json()
    
    if (!userId || !activity) {
      return NextResponse.json({ error: "Missing userId or activity" }, { status: 400 })
    }

    let db: any
    try {
      db = requireAdminDb()
    } catch (error) {
      // Firebase not configured
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const statsRef = db.collection("users").doc(userId).collection("gamification").doc("stats")
    const statsDoc = await statsRef.get()

    let stats: GamificationStats

    if (!statsDoc.exists) {
      // Create initial stats
      stats = {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: "",
        totalPoints: 0,
        level: 1,
        badges: [],
        stats: {
          totalTasksCompleted: 0,
          totalStepsCompleted: 0,
          totalRoadmapsCompleted: 0,
          totalStudyDays: 0,
        },
        updatedAt: new Date().toISOString(),
      }
    } else {
      stats = statsDoc.data() as GamificationStats
    }

    // Update stats based on activity
    const pointsEarned = POINTS[activity as ActivityType] || 0
    const oldPoints = stats.totalPoints
    stats.totalPoints += pointsEarned

    // Update streak for daily login
    if (activity === "daily_login") {
      const today = new Date().toISOString().split('T')[0]
      const lastActivity = stats.lastActivityDate ? new Date(stats.lastActivityDate).toISOString().split('T')[0] : ""
      
      if (lastActivity !== today) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        
        if (lastActivity === yesterdayStr) {
          // Continue streak
          stats.currentStreak += 1
          stats.stats.totalStudyDays += 1
        } else if (lastActivity === "") {
          // First day
          stats.currentStreak = 1
          stats.stats.totalStudyDays = 1
        } else {
          // Streak broken
          stats.currentStreak = 1
          stats.stats.totalStudyDays += 1
        }
        
        stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak)
        stats.lastActivityDate = today
      }
    }

    // Update activity-specific stats
    switch (activity) {
      case "task_completed":
        stats.stats.totalTasksCompleted += 1
        break
      case "step_completed":
        stats.stats.totalStepsCompleted += 1
        break
      case "roadmap_completed":
        stats.stats.totalRoadmapsCompleted += 1
        break
    }

    // Check for level up
    const oldLevel = getCurrentLevel(oldPoints)
    const newLevel = getCurrentLevel(stats.totalPoints)
    const leveledUp = newLevel.level > oldLevel.level
    stats.level = newLevel.level

    // Check for new badges
    const newBadges = checkBadges(stats)
    if (newBadges.length > 0) {
      stats.badges = [...stats.badges, ...newBadges]
      
      // Create notification for each new badge
      const userRef = db.collection("users").doc(userId)
      for (const badgeId of newBadges) {
        const badgeNames: Record<string, string> = {
          first_step: "First Step 🎯",
          week_warrior: "Week Warrior 🔥",
          month_master: "Month Master ⚡",
          century_club: "Century Club 💯",
          task_crusher: "Task Crusher 💪",
          road_warrior: "Road Warrior 🏆",
          knowledge_seeker: "Knowledge Seeker 📚",
          dedication: "Dedication 🌟",
          overachiever: "Overachiever 🚀",
        }
        
        try {
          await userRef.collection("notifications").add({
            userId,
            type: "achievement",
            title: `🎉 Badge Unlocked: ${badgeNames[badgeId] || badgeId}`,
            message: "You've earned a new achievement badge! Keep up the great work!",
            metadata: {
              badgeId,
              timestamp: new Date().toISOString(),
            },
            read: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        } catch (err) {
          console.warn("Failed to create badge notification:", err)
        }
      }
    }

    // Create notification for level up
    if (leveledUp) {
      try {
        const userRef = db.collection("users").doc(userId)
        await userRef.collection("notifications").add({
          userId,
          type: "achievement",
          title: `🎊 Level Up! You're now a ${newLevel.name}!`,
          message: `Congratulations! You've reached level ${newLevel.level}. Keep learning and growing!`,
          metadata: {
            oldLevel: oldLevel.level,
            newLevel: newLevel.level,
            timestamp: new Date().toISOString(),
          },
          read: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      } catch (err) {
        console.warn("Failed to create level up notification:", err)
      }
    }

    // Save updated stats
    stats.updatedAt = new Date().toISOString()
    await statsRef.set({
      ...stats,
      updatedAt: serverTimestamp(),
    })

    return NextResponse.json({
      stats,
      pointsEarned,
      newBadges,
      levelUp: leveledUp,
      newLevel: leveledUp ? newLevel : null,
    })
  } catch (error) {
    console.error("Error recording activity:", error)
    return NextResponse.json({ error: "Failed to record activity" }, { status: 500 })
  }
}
