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

export interface DailyTask {
  time: string
  task: string
  duration: string
  type: "learning" | "practice" | "project" | "review"
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
