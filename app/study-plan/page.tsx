"use client"

import { Suspense, useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, BookOpen, Target, Loader2, AlertCircle, CheckCircle2, Circle, Youtube, FileText, ExternalLink } from "lucide-react"
import { saveStudyPlan } from "@/lib/actions"
import { useNotifications } from "@/lib/notification-context"
import { NotificationAlert } from "@/components/notification-alert"
import type { Roadmap } from "@/lib/types"

interface StudyResource {
  title: string
  type: "video" | "article" | "pdf" | "documentation"
  url: string
  platform?: "youtube" | "medium" | "opensource" | "google"
}

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
      resources?: StudyResource[]
    }>
  }
  weeklyGoals: string[]
  tips: string[]
}

const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

export default function StudyPlanPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <StudyPlanContent />
    </Suspense>
  )
}

function StudyPlanContent() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const stepIdParam = searchParams.get("stepId")
  const { createNotification } = useNotifications()
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedDay, setSelectedDay] = useState("monday")
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set())
  const [isMarkingComplete, setIsMarkingComplete] = useState<string | null>(null)
  const [isMarkingStepComplete, setIsMarkingStepComplete] = useState(false)
  const [targetStepId, setTargetStepId] = useState<string | null>(stepIdParam)
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning" | "info"
    title: string
    description?: string
  } | null>(null)

  const markTaskAsCompleted = async (day: string, taskIndex: number) => {
    if (!user || !studyPlan) return

    const taskId = `${day}-${taskIndex}`
    
    // Optimistic update
    setCompletedTasks(prev => new Set([...prev, taskId]))
    setIsMarkingComplete(taskId)

    try {
      // Calculate total tasks across all days
      const totalTasks = daysOfWeek.reduce((total, d) => total + (studyPlan.dailyPlans[d]?.length || 0), 0)
      const newCompletedCount = completedTasks.size + 1

      const response = await fetch("/api/mark-task-completed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          day,
          taskIndex,
          focusArea: studyPlan.focusArea,
          completedTasksCount: newCompletedCount,
          totalTasksCount: totalTasks,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to mark task as completed")
      }

      const data = await response.json()

      // Show success notification
      setNotification({
        type: "success",
        title: "Task Completed! 🎉",
        description: `Great job! Task at ${studyPlan.dailyPlans[day][taskIndex].time} is marked as done. Progress: ${data.progress.percentage}%`,
      })

      // Persist to localStorage
      const studyPlanData = localStorage.getItem(`studyPlan_${user.id}`)
      if (studyPlanData) {
        const updatedPlan = JSON.parse(studyPlanData)
        localStorage.setItem(`studyPlan_${user.id}`, JSON.stringify(updatedPlan))
      }

      // Refresh roadmap from server to get updated progress
      try {
        const roadmapResponse = await fetch(`/api/roadmap?userId=${user.id}&email=${encodeURIComponent(user.email || '')}`)
        if (roadmapResponse.ok) {
          const { roadmap: updatedRoadmap } = await roadmapResponse.json()
          if (updatedRoadmap) {
            setRoadmap(updatedRoadmap)
            localStorage.setItem(`roadmap_${user.id}`, JSON.stringify(updatedRoadmap))
          }
        }
      } catch (error) {
        console.warn("Failed to refresh roadmap:", error)
      }
    } catch (error) {
      console.error("Error marking task as completed:", error)
      // Revert on error
      setCompletedTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
      setNotification({
        type: "error",
        title: "Error",
        description: "Failed to mark task as completed. Please try again.",
      })
    } finally {
      setIsMarkingComplete(null)
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      // Fetch roadmap from server for latest progress
      const fetchRoadmap = async () => {
        try {
          const response = await fetch(`/api/roadmap?userId=${user.id}&email=${encodeURIComponent(user.email || '')}`)
          if (response.ok) {
            const { roadmap } = await response.json()
            setRoadmap(roadmap)
            localStorage.setItem(`roadmap_${user.id}`, JSON.stringify(roadmap))
          } else {
            // Fallback to localStorage
            const storedRoadmap = localStorage.getItem(`roadmap_${user.id}`)
            if (storedRoadmap) {
              setRoadmap(JSON.parse(storedRoadmap))
            }
          }
        } catch (error) {
          console.error("Error fetching roadmap:", error)
          const storedRoadmap = localStorage.getItem(`roadmap_${user.id}`)
          if (storedRoadmap) {
            setRoadmap(JSON.parse(storedRoadmap))
          }
        }
      }

      fetchRoadmap()
    }
  }, [user, authLoading, router])

  // Load study plan and completed tasks when roadmap or targetStepId changes
  useEffect(() => {
    if (!user || !roadmap) return

    // Determine which step to work with
    const activeStep = targetStepId
      ? roadmap.steps.find((s) => s.id === targetStepId)
      : roadmap.steps.find((s) => !s.completed)

    const activeStepId = activeStep?.id || ""

    // Try loading the step-specific study plan first, then the general one
    const stepPlan = localStorage.getItem(`studyPlan_${user.id}_${activeStepId}`)
    const generalPlan = localStorage.getItem(`studyPlan_${user.id}`)
    const storedStudyPlan = stepPlan || generalPlan

    if (storedStudyPlan) {
      const parsed = JSON.parse(storedStudyPlan)

      // Verify this plan belongs to the current roadmap's career path
      const currentCareerPath = roadmap.careerPath?.toLowerCase() || ""
      const planFocus = parsed.focusArea?.toLowerCase() || ""

      // Check if this plan's focus area matches any step in the current roadmap
      const matchesCurrentRoadmap = roadmap.steps.some((s: any) =>
        planFocus.includes(s.title.toLowerCase()) ||
        s.title.toLowerCase().includes(planFocus)
      )

      if (matchesCurrentRoadmap) {
        // Plan belongs to current roadmap
        if (activeStep && parsed.focusArea &&
            (parsed.focusArea.toLowerCase().includes(activeStep.title.toLowerCase()) ||
             activeStep.title.toLowerCase().includes(parsed.focusArea.toLowerCase()) ||
             !targetStepId)) {
          setStudyPlan(parsed)
        } else if (stepPlan) {
          setStudyPlan(parsed)
        } else {
          setStudyPlan(null)
        }
      } else {
        // Stale plan from a different career path — discard it
        setStudyPlan(null)
      }
    } else {
      setStudyPlan(null)
    }

    // Load completed tasks for this step
    const storedCompletedTasks = localStorage.getItem(`completedTasks_${user.id}`)
    if (storedCompletedTasks) {
      try {
        setCompletedTasks(new Set(JSON.parse(storedCompletedTasks)))
      } catch (error) {
        console.error("Failed to load completed tasks:", error)
      }
    } else {
      setCompletedTasks(new Set())
    }
  }, [user, roadmap, targetStepId])

  useEffect(() => {
    if (user && completedTasks.size > 0) {
      localStorage.setItem(
        `completedTasks_${user.id}`,
        JSON.stringify(Array.from(completedTasks))
      )
    }
  }, [user, completedTasks])

  const markStepAsComplete = async () => {
    if (!user || !roadmap || !studyPlan) return

    setIsMarkingStepComplete(true)
    try {
      // Use the target step, or match by focus area, or first uncompleted
      const currentStep = targetStepId
        ? roadmap.steps.find((s) => s.id === targetStepId)
        : roadmap.steps.find((s) => !s.completed && s.title.toLowerCase().includes(studyPlan.focusArea.toLowerCase()))
      
      if (!currentStep) {
        setNotification({
          type: "warning",
          title: "No Active Step",
          description: "Could not find an active step matching your study plan.",
        })
        setIsMarkingStepComplete(false)
        return
      }

      console.log(`Marking step complete: ${currentStep.id} - ${currentStep.title}`)

      const response = await fetch("/api/complete-step", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          stepId: currentStep.id,
          stepTitle: currentStep.title,
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to mark step as complete")
      }

      // Show success notification
      setNotification({
        type: "success",
        title: "Step Completed! 🎉",
        description: `Great job! The step "${currentStep.title}" has been marked as complete. Your progress has been updated!`,
      })

      // Locally update the roadmap
      const updatedRoadmap = {
        ...roadmap,
        steps: roadmap.steps.map((step) =>
          step.id === currentStep.id
            ? { ...step, completed: true, progress: 100 }
            : step
        ),
      }
      setRoadmap(updatedRoadmap)
      localStorage.setItem(`roadmap_${user.id}`, JSON.stringify(updatedRoadmap))

      // Refresh roadmap
      try {
        const roadmapResponse = await fetch(`/api/roadmap?userId=${user.id}&email=${encodeURIComponent(user.email || '')}`)
        if (roadmapResponse.ok) {
          const { roadmap: updatedRoadmap } = await roadmapResponse.json()
          if (updatedRoadmap) {
            setRoadmap(updatedRoadmap)
            localStorage.setItem(`roadmap_${user.id}`, JSON.stringify(updatedRoadmap))
          }
        }
      } catch (error) {
        console.warn("Failed to refresh roadmap:", error)
      }
    } catch (error) {
      console.error("Error marking step as complete:", error)
      setNotification({
        type: "error",
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : "Failed to mark step as complete. Please try again.",
      })
    } finally {
      setIsMarkingStepComplete(false)
    }
  }

  const generateStudyPlan = async () => {
    if (!roadmap || !user) return

    setIsGenerating(true)
    try {
      // Use the target step from URL param, or fall back to first uncompleted step
      const currentStep = targetStepId
        ? roadmap.steps.find((s) => s.id === targetStepId)
        : roadmap.steps.find((s) => !s.completed)
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
      // Save both the general key and the step-specific key
      localStorage.setItem(`studyPlan_${user.id}`, JSON.stringify(data.studyPlan))
      localStorage.setItem(`studyPlan_${user.id}_${currentStep.id}`, JSON.stringify(data.studyPlan))

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

  // Use the target step from URL param, or fall back to first uncompleted step
  const currentStep = targetStepId
    ? roadmap.steps.find((s) => s.id === targetStepId)
    : roadmap.steps.find((s) => !s.completed)

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
                              studyPlan.dailyPlans[day].map((task, index) => {
                                const taskId = `${day}-${index}`
                                const isCompleted = completedTasks.has(taskId)
                                const isMarking = isMarkingComplete === taskId

                                return (
                                  <div
                                    key={index}
                                    className={`flex items-start gap-4 rounded-lg border p-4 transition-all ${
                                      isCompleted
                                        ? "bg-emerald-50 border-emerald-200"
                                        : "hover:bg-muted/50"
                                    }`}
                                  >
                                    <div className="flex flex-col items-center gap-2">
                                      <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                                        {task.time}
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <h4 className={`text-balance font-medium mb-2 ${
                                        isCompleted ? "line-through text-muted-foreground" : ""
                                      }`}>
                                        {task.task}
                                      </h4>
                                      <div className="flex items-center gap-2 flex-wrap mb-3">
                                        <Badge variant="outline" className="text-xs">
                                          {task.type}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground">
                                          {task.duration}
                                        </span>
                                        {isCompleted && (
                                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                                            Completed
                                          </Badge>
                                        )}
                                      </div>
                                      
                                      {/* Study Resources Section */}
                                      {task.resources && task.resources.length > 0 && (
                                        <div className="mt-3 pt-3 border-t">
                                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Learning Resources</p>
                                          <div className="flex flex-wrap gap-2">
                                            {task.resources.map((resource, resIndex) => (
                                              <a
                                                key={resIndex}
                                                href={resource.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
                                              >
                                                {resource.type === "video" || resource.platform === "youtube" ? (
                                                  <Youtube className="h-3 w-3" />
                                                ) : (
                                                  <FileText className="h-3 w-3" />
                                                )}
                                                <span>{resource.title}</span>
                                                <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                                              </a>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant={isCompleted ? "default" : "outline"}
                                      onClick={() => markTaskAsCompleted(day, index)}
                                      disabled={isMarking}
                                      className={isCompleted ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                                    >
                                      {isMarking ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : isCompleted ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                      ) : (
                                        <Circle className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>

                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Study Progress</h3>
                    <p className="text-sm text-muted-foreground">
                      {completedTasks.size} out of {daysOfWeek.reduce((total, day) => total + (studyPlan.dailyPlans[day]?.length || 0), 0)} tasks completed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-600">
                      {Math.round((completedTasks.size / Math.max(1, daysOfWeek.reduce((total, day) => total + (studyPlan.dailyPlans[day]?.length || 0), 0))) * 100)}%
                    </p>
                  </div>
                </div>

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
                  <Button 
                    onClick={markStepAsComplete} 
                    disabled={isMarkingStepComplete}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isMarkingStepComplete ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Marking Complete...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Mark Step as Complete
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
