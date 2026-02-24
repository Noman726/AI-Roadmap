"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useGamification, BADGES } from "@/lib/gamification-context"
import { Flame, Trophy, Target, TrendingUp, Lock } from "lucide-react"

export function GamificationDashboard() {
  const { stats, badges, currentLevel, nextLevel, progressToNextLevel, isLoading } = useGamification()

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const allBadges = Object.values(BADGES)
  const unlockedBadgeIds = new Set(stats.badges)

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Streak Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full -mr-12 -mt-12"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold">{stats.currentStreak}</div>
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Best: {stats.longestStreak} days
            </p>
          </CardContent>
        </Card>

        {/* Points Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <Trophy className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold">{stats.totalPoints.toLocaleString()}</div>
              <span className="text-sm text-muted-foreground">pts</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Level {currentLevel.level} - {currentLevel.name}
            </p>
          </CardContent>
        </Card>

        {/* Achievements Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full -mr-12 -mt-12"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Badges</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold">{badges.length}</div>
              <span className="text-sm text-muted-foreground">/ {allBadges.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((badges.length / allBadges.length) * 100)}% unlocked
            </p>
          </CardContent>
        </Card>

        {/* Study Days Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full -mr-12 -mt-12"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Study Days</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold">{stats.stats.totalStudyDays}</div>
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Keep the momentum going!
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Level Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Level Progress</span>
            <Badge variant="outline" className={currentLevel.color}>
              Level {currentLevel.level} - {currentLevel.name}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {stats.totalPoints} points
            </span>
            {nextLevel && (
              <span className="font-medium">
                {nextLevel.minPoints - stats.totalPoints} points to {nextLevel.name}
              </span>
            )}
          </div>
          <Progress value={progressToNextLevel} className="h-3" />
          {!nextLevel && (
            <p className="text-sm text-center text-muted-foreground mt-2">
              🎊 Maximum level reached! You're a Legend!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Badges Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>Achievement Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <TooltipProvider>
              {allBadges.map((badge) => {
                const isUnlocked = unlockedBadgeIds.has(badge.id)
                return (
                  <Tooltip key={badge.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                          isUnlocked
                            ? "border-primary bg-primary/5 hover:shadow-md"
                            : "border-dashed border-gray-300 opacity-50 grayscale"
                        }`}
                      >
                        <div className="text-4xl relative">
                          {badge.icon}
                          {!isUnlocked && (
                            <Lock className="absolute -bottom-1 -right-1 h-4 w-4 text-gray-400 bg-white rounded-full p-0.5" />
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium line-clamp-1">{badge.name}</p>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-semibold">{badge.icon} {badge.name}</p>
                        <p className="text-sm">{badge.description}</p>
                        <p className="text-xs text-muted-foreground">{badge.requirement}</p>
                        {isUnlocked && (
                          <Badge variant="outline" className="text-xs mt-2">
                            ✓ Unlocked
                          </Badge>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* Activity Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl">
                ✓
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.stats.totalTasksCompleted}</p>
                <p className="text-sm text-muted-foreground">Tasks Completed</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-xl">
                📚
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.stats.totalStepsCompleted}</p>
                <p className="text-sm text-muted-foreground">Steps Completed</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white text-xl">
                🏆
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.stats.totalRoadmapsCompleted}</p>
                <p className="text-sm text-muted-foreground">Roadmaps Completed</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
