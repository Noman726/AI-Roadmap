"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Target, BookOpen, TrendingUp, ArrowRight, Loader2, Trophy, CheckCircle2 } from "lucide-react"
import { getUserRoadmap } from "@/lib/actions"
import type { Profile, Roadmap } from "@/lib/types"

type RoadmapSummary = Omit<Roadmap, "steps"> & { steps?: Roadmap["steps"] }

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [completedRoadmaps, setCompletedRoadmaps] = useState<RoadmapSummary[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [overallProgress, setOverallProgress] = useState(0)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      // Load profile from database first, then fallback to localStorage
      const loadProfile = async () => {
        try {
          // Try to fetch profile from database
          const response = await fetch(`/api/profile?userId=${user.id}`)
          if (response.ok) {
            const { profile } = await response.json()
            if (profile) {
              setProfile(profile)
              // Cache in localStorage for faster subsequent loads
              localStorage.setItem(`profile_${user.id}`, JSON.stringify(profile))
              return true
            }
          }
        } catch (error) {
          console.error("Error fetching profile from API:", error)
        }

        // Fallback to localStorage
        const storedProfile = localStorage.getItem(`profile_${user.id}`)
        if (storedProfile) {
          setProfile(JSON.parse(storedProfile))
          return true
        }

        // No profile found anywhere - redirect to onboarding
        router.push("/onboarding")
        return false
      }

      // Load roadmap from server first, then fallback to localStorage
      const loadRoadmap = async () => {
        try {
          // Fetch all roadmaps (history) from API
          const historyRes = await fetch(`/api/roadmap?userId=${user.id}&email=${encodeURIComponent(user.email || '')}&history=true&includeSteps=false`)
          if (historyRes.ok) {
            const { roadmaps } = await historyRes.json()
            if (roadmaps && roadmaps.length > 0) {
              // Separate completed and active roadmaps
              const completed = roadmaps.filter((r: any) => r.completedAt !== null)
              const active = roadmaps.filter((r: any) => r.completedAt === null)
              setCompletedRoadmaps(completed)

              // Use the latest active roadmap, or the most recent completed one
              const current = active.length > 0
                ? active[active.length - 1]
                : roadmaps[roadmaps.length - 1]

              if (current?.id) {
                const currentResponse = await fetch(
                  `/api/roadmap?userId=${user.id}&email=${encodeURIComponent(user.email || '')}&roadmapId=${current.id}`
                )
                if (currentResponse.ok) {
                  const { roadmap: currentRoadmap } = await currentResponse.json()
                  if (currentRoadmap) {
                    setRoadmap(currentRoadmap)
                    calculateProgress(currentRoadmap)
                    localStorage.setItem(`roadmap_${user.id}`, JSON.stringify(currentRoadmap))
                    return
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Error fetching roadmaps from API:", error)
        }

        // Fallback: try single roadmap API
        try {
          const response = await fetch(`/api/roadmap?userId=${user.id}&email=${encodeURIComponent(user.email || '')}`)
          if (response.ok) {
            const { roadmap: apiRoadmap } = await response.json()
            if (apiRoadmap) {
              setRoadmap(apiRoadmap)
              calculateProgress(apiRoadmap)
              localStorage.setItem(`roadmap_${user.id}`, JSON.stringify(apiRoadmap))
              return
            }
          }
        } catch (error) {
          console.error("Error fetching roadmap from API:", error)
        }

        // Fallback to server action
        try {
          const dbRoadmap = await getUserRoadmap(user.id)
          if (dbRoadmap) {
            setRoadmap(dbRoadmap)
            calculateProgress(dbRoadmap)
            return
          }
        } catch (error) {
          console.error("Error fetching roadmap:", error)
        }

        // Fallback to localStorage
        const storedRoadmap = localStorage.getItem(`roadmap_${user.id}`)
        if (storedRoadmap) {
          const roadmapData = JSON.parse(storedRoadmap)
          // Normalize step progress
          const normalizedRoadmap = {
            ...roadmapData,
            steps: roadmapData.steps.map((step: any) => ({
              ...step,
              progress: step.completed ? 100 : 0
            }))
          }
          setRoadmap(normalizedRoadmap)
          localStorage.setItem(`roadmap_${user.id}`, JSON.stringify(normalizedRoadmap))
          calculateProgress(normalizedRoadmap)
        }
      }

      // Load profile first, then roadmap
      const loadData = async () => {
        const hasProfile = await loadProfile()
        if (hasProfile) {
          await loadRoadmap()
        }
      }

      loadData()
    }
  }, [user, authLoading, router])

  // Periodically refresh roadmap to get latest progress (30s for efficiency)
  useEffect(() => {
    if (!user) return

    const interval = setInterval(async () => {
      if (document.visibilityState !== "visible") return
      try {
        const historyRes = await fetch(`/api/roadmap?userId=${user.id}&email=${encodeURIComponent(user.email || '')}&history=true&includeSteps=false`)
        if (!historyRes.ok) return

        const { roadmaps } = await historyRes.json()
        if (!roadmaps || roadmaps.length === 0) return

        const completed = roadmaps.filter((r: any) => r.completedAt !== null)
        const active = roadmaps.filter((r: any) => r.completedAt === null)
        setCompletedRoadmaps(completed)
        const current = active.length > 0
          ? active[active.length - 1]
          : roadmaps[roadmaps.length - 1]

        if (!current?.id) return

        const currentResponse = await fetch(
          `/api/roadmap?userId=${user.id}&email=${encodeURIComponent(user.email || '')}&roadmapId=${current.id}`
        )
        if (currentResponse.ok) {
          const { roadmap: currentRoadmap } = await currentResponse.json()
          if (currentRoadmap) {
            setRoadmap(currentRoadmap)
            calculateProgress(currentRoadmap)
          }
        }
      } catch (error) {
        console.error("Error refreshing roadmap:", error)
      }
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [user])

  const calculateProgress = (roadmapData: Roadmap | null) => {
    if (!roadmapData || !roadmapData.steps || !roadmapData.steps.length) {
      setOverallProgress(0)
      return
    }

    const completedSteps = roadmapData.steps.filter((step) => step.completed).length
    const progress = (completedSteps / roadmapData.steps.length) * 100
    setOverallProgress(Math.round(progress))
  }

  const generateRoadmap = async () => {
    if (!profile || !user) return

    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      })

      const data = await response.json()
      const roadmapWithProgress = {
        ...data.roadmap,
        steps: data.roadmap.steps.map((step: any) => ({
          ...step,
          completed: false,
          progress: 0,
        })),
      }

      setRoadmap(roadmapWithProgress)
      
      // Save to localStorage for immediate availability
      localStorage.setItem(`roadmap_${user.id}`, JSON.stringify(roadmapWithProgress))
      
      // Try to save to database
      try {
        const { saveRoadmap } = await import("@/lib/actions")
        await saveRoadmap(user.id, roadmapWithProgress)
      } catch (dbError) {
        console.warn("Failed to save roadmap to database, using localStorage:", dbError)
      }
      
      router.push("/roadmap")
    } catch (error) {
      console.error("Error generating roadmap:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  if (authLoading || !user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-balance mb-2 text-3xl font-bold">Welcome back, {user.name}!</h1>
          <p className="text-balance text-muted-foreground">
            Your journey to becoming a {profile.careerGoal} continues here.
          </p>
        </div>

        {!roadmap ? (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-balance flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Generate Your Personalized Roadmap
              </CardTitle>
              <CardDescription className="text-balance">
                Let AI create a customized learning path based on your profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <h4 className="mb-2 font-medium">Your Profile</h4>
                  <div className="grid gap-2 text-sm md:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">Interests:</span> {profile.interests}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Education:</span>{" "}
                      {profile.educationLevel.replace("-", " ")}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Goal:</span> {profile.careerGoal}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Level:</span> {profile.currentSkillLevel}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Style:</span> {profile.learningStyle}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time:</span> {profile.studyTime} hrs/week
                    </div>
                  </div>
                </div>
                <Button onClick={generateRoadmap} disabled={isGenerating} size="lg" className="w-full">
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Your Roadmap...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Roadmap with AI
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-8 grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overallProgress}%</div>
                  <Progress value={overallProgress} className="mt-2" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {roadmap.steps.filter((s) => s.completed).length} of {roadmap.steps.length} steps completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Career Path</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-balance text-2xl font-bold">{roadmap.careerPath}</div>
                  <p className="text-balance mt-2 text-xs text-muted-foreground">{roadmap.estimatedTimeframe}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Focus</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-balance text-2xl font-bold">
                    Step {roadmap.steps.findIndex((s) => !s.completed) + 1 || roadmap.steps.length}
                  </div>
                  <p className="text-balance mt-2 text-xs text-muted-foreground">
                    {roadmap.steps.find((s) => !s.completed)?.title || "All steps completed!"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-balance">Your Learning Path</CardTitle>
                <CardDescription className="text-balance">{roadmap.overview}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roadmap.steps.slice(0, 3).map((step, index) => (
                    <div key={step.id} className="flex items-start gap-4 rounded-lg border p-4">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          step.completed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-balance mb-1 font-medium">{step.title}</h4>
                        <p className="text-balance text-sm text-muted-foreground">{step.description}</p>
                        <p className="mt-2 text-xs text-muted-foreground">Duration: {step.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="mt-6 w-full" asChild>
                  <a href="/roadmap">
                    View Full Roadmap <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Completed Roadmaps History */}
            {completedRoadmaps.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-balance flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Completed Roadmaps
                  </CardTitle>
                  <CardDescription className="text-balance">
                    Your learning journey so far — {completedRoadmaps.length} roadmap{completedRoadmaps.length > 1 ? "s" : ""} completed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {completedRoadmaps.map((cr, idx) => {
                      const stepsCount = Array.isArray(cr.steps) ? cr.steps.length : null

                      return (
                        <div
                          key={cr.id || idx}
                          className="flex items-center gap-4 rounded-lg border border-green-200 bg-green-50 p-4 cursor-pointer hover:bg-green-100 hover:border-green-300 transition-colors"
                          onClick={() => router.push(`/roadmap?viewId=${cr.id}`)}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500 text-white font-bold text-sm">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-balance font-medium">{cr.careerPath}</h4>
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                Roadmap {cr.order || idx + 1}
                              </Badge>
                            </div>
                            <p className="text-balance text-sm text-muted-foreground">
                              {stepsCount !== null
                                ? `${stepsCount} steps completed • ${cr.estimatedTimeframe}`
                                : cr.estimatedTimeframe}
                            </p>
                            {cr.completedAt && (
                              <p className="text-xs text-green-600 mt-1">
                                Completed on {new Date(cr.completedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-500 text-white">100%</Badge>
                            <ArrowRight className="h-4 w-4 text-green-600" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}
