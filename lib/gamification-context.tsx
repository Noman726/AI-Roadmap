"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import type { GamificationStats, Badge, ActivityType } from "@/lib/types"

// Badge definitions
export const BADGES: Record<string, Badge> = {
  first_step: {
    id: "first_step",
    name: "First Step",
    description: "Complete your first learning step",
    icon: "🎯",
    requirement: "Complete 1 step",
  },
  week_warrior: {
    id: "week_warrior",
    name: "Week Warrior",
    description: "Maintain a 7-day learning streak",
    icon: "🔥",
    requirement: "7-day streak",
  },
  month_master: {
    id: "month_master",
    name: "Month Master",
    description: "Maintain a 30-day learning streak",
    icon: "⚡",
    requirement: "30-day streak",
  },
  century_club: {
    id: "century_club",
    name: "Century Club",
    description: "Maintain a 100-day learning streak",
    icon: "💯",
    requirement: "100-day streak",
  },
  task_crusher: {
    id: "task_crusher",
    name: "Task Crusher",
    description: "Complete 50 learning tasks",
    icon: "💪",
    requirement: "50 tasks completed",
  },
  road_warrior: {
    id: "road_warrior",
    name: "Road Warrior",
    description: "Complete your first roadmap",
    icon: "🏆",
    requirement: "Complete 1 roadmap",
  },
  knowledge_seeker: {
    id: "knowledge_seeker",
    name: "Knowledge Seeker",
    description: "Complete 10 learning steps",
    icon: "📚",
    requirement: "10 steps completed",
  },
  dedication: {
    id: "dedication",
    name: "Dedication",
    description: "Study for 30 different days",
    icon: "🌟",
    requirement: "30 study days",
  },
  overachiever: {
    id: "overachiever",
    name: "Overachiever",
    description: "Reach 1000 points",
    icon: "🚀",
    requirement: "1000 points",
  },
}

// Points for each activity
const POINTS: Record<ActivityType, number> = {
  daily_login: 5,
  task_completed: 10,
  step_completed: 50,
  roadmap_completed: 200,
  study_plan_generated: 20,
  chat_interaction: 2,
}

// Level thresholds
const LEVELS = [
  { level: 1, name: "Beginner", minPoints: 0, color: "text-gray-600" },
  { level: 2, name: "Learner", minPoints: 100, color: "text-blue-600" },
  { level: 3, name: "Student", minPoints: 300, color: "text-green-600" },
  { level: 4, name: "Scholar", minPoints: 600, color: "text-purple-600" },
  { level: 5, name: "Expert", minPoints: 1000, color: "text-orange-600" },
  { level: 6, name: "Master", minPoints: 2000, color: "text-red-600" },
  { level: 7, name: "Legend", minPoints: 5000, color: "text-yellow-600" },
]

interface GamificationContextType {
  stats: GamificationStats | null
  badges: Badge[]
  currentLevel: { level: number; name: string; minPoints: number; color: string }
  nextLevel: { level: number; name: string; minPoints: number; color: string } | null
  progressToNextLevel: number
  isLoading: boolean
  recordActivity: (activity: ActivityType, metadata?: any) => Promise<void>
  refreshStats: () => Promise<void>
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined)

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [stats, setStats] = useState<GamificationStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const getCurrentLevel = useCallback((points: number) => {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (points >= LEVELS[i].minPoints) {
        return LEVELS[i]
      }
    }
    return LEVELS[0]
  }, [])

  const getNextLevel = useCallback((currentLevel: number) => {
    return LEVELS.find(l => l.level === currentLevel + 1) || null
  }, [])

  const calculateProgressToNextLevel = useCallback((points: number, currentLevel: any, nextLevel: any) => {
    if (!nextLevel) return 100
    const pointsInCurrentLevel = points - currentLevel.minPoints
    const pointsNeededForNextLevel = nextLevel.minPoints - currentLevel.minPoints
    return Math.min(100, Math.round((pointsInCurrentLevel / pointsNeededForNextLevel) * 100))
  }, [])

  const refreshStats = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/gamification?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Failed to fetch gamification stats:", error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  const recordActivity = useCallback(async (activity: ActivityType, metadata?: any) => {
    if (!user?.id) return

    try {
      const response = await fetch("/api/gamification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          activity,
          metadata,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        
        // Check for new badges and show notifications
        if (data.newBadges && data.newBadges.length > 0) {
          // You can trigger a notification here
          console.log("New badges earned:", data.newBadges)
        }
        
        if (data.levelUp) {
          console.log("Level up!", data.newLevel)
        }
      }
    } catch (error) {
      console.error("Failed to record activity:", error)
    }
  }, [user?.id])

  // Fetch stats on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      refreshStats()
    }
  }, [user?.id, refreshStats])

  // Record daily login
  useEffect(() => {
    if (user?.id && stats) {
      const today = new Date().toISOString().split('T')[0]
      if (stats.lastActivityDate !== today) {
        recordActivity("daily_login")
      }
    }
  }, [user?.id, stats, recordActivity])

  const currentLevel = stats ? getCurrentLevel(stats.totalPoints) : LEVELS[0]
  const nextLevel = getNextLevel(currentLevel.level)
  const progressToNextLevel = stats 
    ? calculateProgressToNextLevel(stats.totalPoints, currentLevel, nextLevel)
    : 0

  const earnedBadges = stats?.badges.map(badgeId => BADGES[badgeId]).filter(Boolean) || []

  return (
    <GamificationContext.Provider
      value={{
        stats,
        badges: earnedBadges,
        currentLevel,
        nextLevel,
        progressToNextLevel,
        isLoading,
        recordActivity,
        refreshStats,
      }}
    >
      {children}
    </GamificationContext.Provider>
  )
}

export function useGamification() {
  const context = useContext(GamificationContext)
  if (!context) {
    throw new Error("useGamification must be used within a GamificationProvider")
  }
  return context
}
