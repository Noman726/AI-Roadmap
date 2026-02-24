export interface User {
  id: string
  email: string
  name: string
}

export interface Profile {
  userId: string
  interests: string
  educationLevel: string
  careerGoal: string
  currentSkillLevel: string
  learningStyle: string
  studyTime: string
  createdAt: string
}

export interface Resource {
  title: string
  type: "course" | "book" | "tutorial" | "project" | "documentation"
  url?: string
  description: string
}

export interface RoadmapStep {
  id: string
  title: string
  description: string
  duration: string
  resources: Resource[]
  skills: string[]
  milestones: string[]
  completed?: boolean
  progress?: number
}

export interface Roadmap {
  id?: string
  careerPath: string
  overview: string
  estimatedTimeframe: string
  order?: number
  completedAt?: string | null
  createdAt?: string
  steps: RoadmapStep[]
  weeklySchedule: {
    monday: string
    tuesday: string
    wednesday: string
    thursday: string
    friday: string
    saturday: string
    sunday: string
  }
}

export interface StudyResource {
  title: string
  type: "video" | "article" | "pdf" | "documentation"
  url: string
  platform?: "youtube" | "medium" | "opensource" | "google"
}

export interface DailyTask {
  id?: string
  time: string
  task: string
  duration: string
  type: "learning" | "practice" | "project" | "review"
  completed?: boolean
  resources?: StudyResource[]
}

export interface StudyPlan {
  weekStart: string
  weekEnd: string
  focusArea: string
  dailyPlans: {
    monday: DailyTask[]
    tuesday: DailyTask[]
    wednesday: DailyTask[]
    thursday: DailyTask[]
    friday: DailyTask[]
    saturday: DailyTask[]
    sunday: DailyTask[]
  }
  weeklyGoals: string[]
  tips: string[]
}
export interface ChatMessage {
  id: string
  userId: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  updatedAt: string
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  requirement: string
  earnedAt?: string
}

export interface GamificationStats {
  userId: string
  currentStreak: number
  longestStreak: number
  lastActivityDate: string
  totalPoints: number
  level: number
  badges: string[] // Array of badge IDs
  stats: {
    totalTasksCompleted: number
    totalStepsCompleted: number
    totalRoadmapsCompleted: number
    totalStudyDays: number
  }
  updatedAt: string
}

export type ActivityType = 
  | "daily_login"
  | "task_completed"
  | "step_completed"
  | "roadmap_completed"
  | "study_plan_generated"
  | "chat_interaction"