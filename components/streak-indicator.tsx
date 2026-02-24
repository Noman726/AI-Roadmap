"use client"

import { Flame } from "lucide-react"
import { useGamification } from "@/lib/gamification-context"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function StreakIndicator() {
  const { stats, isLoading } = useGamification()

  if (isLoading || !stats) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">
              {stats.currentStreak}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">🔥 Learning Streak</p>
            <p className="text-sm">Current: {stats.currentStreak} days</p>
            <p className="text-sm">Best: {stats.longestStreak} days</p>
            <p className="text-xs text-muted-foreground mt-2">
              Keep learning daily to maintain your streak!
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
