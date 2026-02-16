"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, BookOpen, Target, Loader2, AlertCircle } from "lucide-react"
import { saveStudyPlan } from "@/lib/actions"
import { useNotifications } from "@/lib/notification-context"
import { NotificationAlert } from "@/components/notification-alert"
import type { Roadmap } from "@/lib/types"

interface StudyPlan {
  weekStart: string
  weekEnd: string
  focusArea: string
  dailyPlans: {
    [key: string]: Array<{
      time: string
      task: string
      duration: string
      type: "learning" | "practice" | "project" | "review"
    }>
  }
  weeklyGoals: string[]
  tips: string[]
}

const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

export default function StudyPlanPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { createNotification } = useNotifications()
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedDay, setSelectedDay] = useState("monday")
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning" | "info"
    title: string
    description?: string
  } | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      const storedRoadmap = localStorage.getItem(`roadmap_${user.id}`)
      if (storedRoadmap) {
        setRoadmap(JSON.parse(storedRoadmap))
      }

      const storedStudyPlan = localStorage.getItem(`studyPlan_${user.id}`)
      if (storedStudyPlan) {
        setStudyPlan(JSON.parse(storedStudyPlan))
      }
    }
  }, [user, authLoading, router])

  const generateStudyPlan = async () => {
    if (!roadmap || !user) return

    setIsGenerating(true)
    try {
      const currentStep = roadmap.steps.find((s) => !s.completed)
      if (!currentStep) {
        setNotification({
          type: "success",
          title: "All Steps Completed!",
          description: "You've completed all steps in your learning roadmap. Great job!",
        })
        return
      }

      const profileData = localStorage.getItem(`profile_${user.id}`)
        ? JSON.parse(localStorage.getItem(`profile_${user.id}`)!)
        : {}

      const response = await fetch("/api/generate-study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            currentSkillLevel: profileData.currentSkillLevel || "beginner",
            learningStyle: profileData.learningStyle || "visual",
            studyTime: profileData.studyTime || "5-10",
          },
          currentStep,
        }),
      })

      const data = await response.json()
      setStudyPlan(data.studyPlan)
      localStorage.setItem(`studyPlan_${user.id}`, JSON.stringify(data.studyPlan))

      // Create a notification for the study plan
      await createNotification({
        type: "study_plan",
        title: `Your Weekly Study Plan is Ready!`,
        message: `AI has created a personalized study plan for "${currentStep.title}". Check your daily schedules to get started!`,
        metadata: {
          focusArea: data.studyPlan.focusArea,
          weekStart: data.studyPlan.weekStart,
        },
      })

      // Show success notification
      setNotification({
        type: "success",
        title: "Study Plan Generated Successfully!",
        description: `Your personalized study plan for "${currentStep.title}" is ready. Follow the daily schedule to stay on track!`,
      })

      // Try to save to database
      try {
        await saveStudyPlan(user.id, roadmap.id || "default", data.studyPlan)
      } catch (dbError) {
        console.warn("Failed to save study plan to database:", dbError)
      }
    } catch (error) {
      console.error("Error generating study plan:", error)
      setNotification({
        type: "error",
        title: "Failed to Generate Study Plan",
        description: "An error occurred while generating your study plan. Please try again.",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  if (authLoading || !user || !roadmap) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const currentStep = roadmap.steps.find((s) => !s.completed)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {notification && (
          <div className="mb-6">
            <NotificationAlert
              type={notification.type}
              title={notification.title}
              description={notification.description}
              onClose={() => setNotification(null)}
              autoClose={true}
              autoCloseDuration={5000}
            />
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-balance mb-2 text-3xl font-bold">Weekly Study Plan</h1>
          <p className="text-balance text-muted-foreground">
            Structured daily schedule to keep you on track and motivated
          </p>
        </div>

        {!currentStep ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <CardTitle>All Steps Completed!</CardTitle>
                  <CardDescription>You've completed all steps in your learning roadmap.</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ) : (
          <>
            {!studyPlan ? (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-balance flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Generate Your Personalized Study Plan
                  </CardTitle>
                  <CardDescription className="text-balance">
                    AI will create a detailed weekly schedule based on your current learning step
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg bg-muted p-4 mb-4">
                    <h4 className="font-medium mb-2">Current Focus</h4>
                    <div className="text-sm">
                      <p className="font-medium">{currentStep.title}</p>
                      <p className="text-muted-foreground mt-1">{currentStep.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">Skills: {currentStep.skills.join(", ")}</p>
                    </div>
                  </div>
                  <Button onClick={generateStudyPlan} disabled={isGenerating} size="lg" className="w-full">
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Your Study Plan...
                      </>
                    ) : (
                      <>
                        <Calendar className="mr-2 h-4 w-4" />
                        Generate Study Plan with AI
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Week Focus</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-balance text-lg font-bold">{studyPlan.focusArea}</div>
                      <p className="text-balance mt-2 text-xs text-muted-foreground">
                        {studyPlan.weekStart} to {studyPlan.weekEnd}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Weekly Goals</CardTitle>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">
                        {studyPlan.weeklyGoals.length} goals to achieve this week
                      </div>
                      <p className="text-balance mt-2 text-xs text-muted-foreground">
                        Stay focused and consistent
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Study Time</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">
                        {daysOfWeek.reduce((total, day) => {
                          return (
                            total +
                            studyPlan.dailyPlans[day].reduce((dayTotal: number, task: any) => {
                              const hours = parseInt(task.duration) || 0
                              return dayTotal + hours
                            }, 0)
                          )
                        }, 0)}{" "}
                        hours/week
                      </div>
                      <p className="text-balance mt-2 text-xs text-muted-foreground">
                        Balanced across the week
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Tabs value={selectedDay} onValueChange={setSelectedDay} className="mb-8">
                  <TabsList className="grid w-full grid-cols-7">
                    {daysOfWeek.map((day) => (
                      <TabsTrigger key={day} value={day} className="text-xs">
                        {day.slice(0, 3)}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {daysOfWeek.map((day) => (
                    <TabsContent key={day} value={day} className="mt-6">
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-balance capitalize">
                                {day} Schedule
                              </CardTitle>
                              <CardDescription>Your daily learning activities</CardDescription>
                            </div>
                            <Badge variant="secondary">
                              {studyPlan.dailyPlans[day].reduce((total: number, task: any) => {
                                const hours = parseInt(task.duration) || 0
                                return total + hours
                              }, 0)}{" "}
                              hours
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {studyPlan.dailyPlans[day].length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-8 text-center">
                                <BookOpen className="mb-2 h-12 w-12 text-muted-foreground" />
                                <p className="text-balance text-sm text-muted-foreground">
                                  Rest day - No scheduled tasks
                                </p>
                              </div>
                            ) : (
                              studyPlan.dailyPlans[day].map((task, index) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex flex-col items-center gap-2">
                                    <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                                      {task.time}
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="text-balance font-medium mb-1">{task.task}</h4>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge variant="outline" className="text-xs">
                                        {task.type}
                                      </Badge>
                                      <span className="text-sm text-muted-foreground">
                                        {task.duration}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-balance">Weekly Goals</CardTitle>
                      <CardDescription className="text-balance">Objectives for this week</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {studyPlan.weeklyGoals.map((goal, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                            <span className="text-balance">{goal}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-balance">Study Tips</CardTitle>
                      <CardDescription className="text-balance">Strategies to stay motivated</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {studyPlan.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                            <span className="text-balance">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-8 flex gap-2">
                  <Button onClick={generateStudyPlan} disabled={isGenerating} variant="outline">
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <Calendar className="mr-2 h-4 w-4" />
                        Regenerate Study Plan
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
