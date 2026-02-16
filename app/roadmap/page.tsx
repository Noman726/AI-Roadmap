"use client"

import { Suspense, useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { BookOpen, CheckCircle2, Clock, ExternalLink, Loader2, Sparkles, Trophy, Rocket, PartyPopper, ArrowLeft } from "lucide-react"
import { updateStepCompletion } from "@/lib/actions"
import type { Roadmap } from "@/lib/types"

export default function RoadmapPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <RoadmapContent />
    </Suspense>
  )
}

function RoadmapContent() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewId = searchParams.get("viewId")
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [expandedStep, setExpandedStep] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState<string | null>(null)
  const [isGeneratingNext, setIsGeneratingNext] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [isViewingCompleted, setIsViewingCompleted] = useState(false)

  const generateStudyPlan = async (step: any) => {
    if (!user || !roadmap) return
    setIsGenerating(step.id)
    try {
      const response = await fetch("/api/generate-study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: JSON.parse(localStorage.getItem(`profile_${user.id}`) || "{}"),
          currentStep: step
        }),
      })
      const data = await response.json()

      // Save to local storage with both step-specific and general keys
      localStorage.setItem(`studyPlan_${user.id}_${step.id}`, JSON.stringify(data.studyPlan))
      localStorage.setItem(`studyPlan_${user.id}`, JSON.stringify(data.studyPlan))

      router.push(`/study-plan?stepId=${step.id}`)
    } catch (e) {
      console.error(e)
    } finally {
      setIsGenerating(null)
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      // If viewing a specific completed roadmap by ID
      if (viewId) {
        const fetchRoadmap = async () => {
          try {
            const response = await fetch(`/api/roadmap?userId=${user.id}&email=${encodeURIComponent(user.email || '')}&roadmapId=${viewId}`)
            if (response.ok) {
              const data = await response.json()
              if (data.roadmap) {
                setRoadmap(data.roadmap)
                setIsViewingCompleted(!!data.roadmap.completedAt)
                return
              }
            }
          } catch (error) {
            console.error("Error fetching roadmap by ID:", error)
          }
          // Fallback to dashboard
          router.push("/dashboard")
        }
        fetchRoadmap()
      } else {
        // Fetch the latest active roadmap from the API
        const fetchLatest = async () => {
          try {
            const response = await fetch(`/api/roadmap?userId=${user.id}&email=${encodeURIComponent(user.email || '')}`)
            if (response.ok) {
              const data = await response.json()
              if (data.roadmap) {
                setRoadmap(data.roadmap)
                localStorage.setItem(`roadmap_${user.id}`, JSON.stringify(data.roadmap))
                if (data.roadmap.steps?.length > 0 && data.roadmap.steps.every((s: any) => s.completed)) {
                  setShowCelebration(true)
                }
                return
              }
            }
          } catch (error) {
            console.error("Error fetching roadmap from API:", error)
          }
          // Fallback to localStorage
          const storedRoadmap = localStorage.getItem(`roadmap_${user.id}`)
          if (storedRoadmap) {
            const parsed = JSON.parse(storedRoadmap)
            setRoadmap(parsed)
            if (parsed.steps?.length > 0 && parsed.steps.every((s: any) => s.completed)) {
              setShowCelebration(true)
            }
          } else {
            router.push("/dashboard")
          }
        }
        fetchLatest()
      }
    }
  }, [user, authLoading, router, viewId])

  const toggleStepCompletion = async (stepId: string) => {
    if (!roadmap || !user) return

    const updatedSteps = roadmap.steps.map((step) =>
      step.id === stepId ? { ...step, completed: !step.completed } : step,
    )

    const updatedRoadmap = { ...roadmap, steps: updatedSteps }
    setRoadmap(updatedRoadmap)
    localStorage.setItem(`roadmap_${user.id}`, JSON.stringify(updatedRoadmap))

    // Check if all steps are now completed
    const allCompleted = updatedSteps.every((s) => s.completed)
    if (allCompleted) {
      setShowCelebration(true)
    }

    // Try to save to database
    try {
      const step = updatedSteps.find(s => s.id === stepId)
      if (step) {
        await updateStepCompletion(stepId, step.completed)
      }
    } catch (error) {
      console.warn("Failed to save step completion to database:", error)
    }
  }

  const generateNextRoadmap = async () => {
    if (!user || !roadmap) return
    setIsGeneratingNext(true)
    try {
      const profile = JSON.parse(localStorage.getItem(`profile_${user.id}`) || "{}")
      const response = await fetch("/api/generate-next-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          completedRoadmap: roadmap,
          userId: user.id,
          email: user.email,
        }),
      })
      const data = await response.json()

      if (data.roadmap) {
        const nextRoadmap = {
          ...data.roadmap,
          completedAt: null,
          steps: data.roadmap.steps.map((step: any) => ({
            ...step,
            completed: false,
            progress: 0,
            skills: Array.isArray(step.skills) ? step.skills : [],
            resources: Array.isArray(step.resources) ? step.resources : [],
            milestones: Array.isArray(step.milestones) ? step.milestones : [],
          })),
        }

        setRoadmap(nextRoadmap)
        setShowCelebration(false)
        localStorage.setItem(`roadmap_${user.id}`, JSON.stringify(nextRoadmap))
      }
    } catch (error) {
      console.error("Error generating next roadmap:", error)
    } finally {
      setIsGeneratingNext(false)
    }
  }

  if (authLoading || !user || !roadmap) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const overallProgress =
    Math.round((roadmap.steps.filter((s) => s.completed).length / roadmap.steps.length) * 100) || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {/* Viewing Completed Roadmap Banner */}
        {isViewingCompleted && (
          <div className="mb-6 flex items-center gap-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")} className="shrink-0">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">Viewing Completed Roadmap</span>
              {roadmap.completedAt && (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Completed {new Date(roadmap.completedAt).toLocaleDateString()}
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-balance mb-2 text-3xl font-bold">{roadmap.careerPath} Roadmap</h1>
          <p className="text-balance text-muted-foreground">{roadmap.overview}</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {roadmap.estimatedTimeframe}
            </div>
            <div className="flex items-center gap-2 text-sm font-medium">
              {overallProgress}% Complete
              <Progress value={overallProgress} className="w-24" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {roadmap.steps.map((step, index) => (
            <Card key={step.id} className={step.completed ? "border-primary/50 bg-primary/5" : ""}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${step.completed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {step.completed ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-balance">{step.title}</CardTitle>
                      <Badge variant="secondary">{step.duration}</Badge>
                    </div>
                    <CardDescription className="text-balance mt-1">{step.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isViewingCompleted && (
                      <Checkbox checked={step.completed} onCheckedChange={() => toggleStepCompletion(step.id)} />
                    )}
                    {isViewingCompleted && step.completed && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                  >
                    {expandedStep === step.id ? "Hide Details" : "Show Details"}
                  </Button>
                  {!isViewingCompleted && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateStudyPlan(step)}
                      disabled={isGenerating === step.id}
                    >
                      {isGenerating === step.id ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-3 w-3" />
                          Generate Study Plan
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {expandedStep === step.id && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="mb-2 font-medium">Skills to Learn</h4>
                      <div className="flex flex-wrap gap-2">
                        {step.skills.map((skill, i) => (
                          <Badge key={i} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 font-medium">Learning Resources</h4>
                      <div className="space-y-2">
                        {step.resources.map((resource, i) => (
                          <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-balance font-medium">{resource.title}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {resource.type}
                                </Badge>
                              </div>
                              <p className="text-balance text-sm text-muted-foreground">{resource.description}</p>
                              {resource.url && (
                                <a
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  Visit Resource <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 font-medium">Milestones</h4>
                      <ul className="space-y-1 text-sm">
                        {step.milestones.map((milestone, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span className="text-balance">{milestone}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Celebration & Next Roadmap Section */}
        {!isViewingCompleted && (overallProgress === 100 || showCelebration) && (
          <Card className="mt-8 border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50">
            <CardHeader className="text-center">
              <div className="flex justify-center gap-3 text-4xl mb-4">
                <PartyPopper className="h-10 w-10 text-yellow-500" />
                <Trophy className="h-10 w-10 text-yellow-500" />
                <PartyPopper className="h-10 w-10 text-yellow-500" />
              </div>
              <CardTitle className="text-2xl text-yellow-800">
                🎉 Congratulations! Roadmap Completed!
              </CardTitle>
              <CardDescription className="text-yellow-700 text-base mt-2">
                You&apos;ve completed all steps in your <strong>{roadmap.careerPath}</strong> roadmap! 
                Ready to take your skills to the next level?
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="flex items-center justify-center gap-6 text-sm text-yellow-700">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{roadmap.steps.length} steps completed</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Roadmap {roadmap.order || 1}</span>
                </div>
              </div>
              <Button
                size="lg"
                onClick={generateNextRoadmap}
                disabled={isGeneratingNext}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg"
              >
                {isGeneratingNext ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Next Roadmap...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-5 w-5" />
                    Generate Next Roadmap
                  </>
                )}
              </Button>
              <p className="text-xs text-yellow-600">
                Your next roadmap will build on what you&apos;ve already learned with more advanced topics
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-balance">Weekly Study Schedule</CardTitle>
            <CardDescription className="text-balance">Suggested time allocation for each day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(roadmap.weeklySchedule).map(([day, schedule]) => (
                <div key={day} className="rounded-lg border p-3">
                  <div className="mb-1 font-medium capitalize">{day}</div>
                  <div className="text-balance text-sm text-muted-foreground">{schedule}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
