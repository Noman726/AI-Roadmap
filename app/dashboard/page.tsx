"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Sparkles, Target, BookOpen, TrendingUp, ArrowRight, Loader2 } from "lucide-react"
import { getUserRoadmap } from "@/lib/actions"
import type { Profile, Roadmap } from "@/lib/types"

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [overallProgress, setOverallProgress] = useState(0)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      // Load profile from localStorage (or database via server actions)
      const storedProfile = localStorage.getItem(`profile_${user.id}`)
      if (storedProfile) {
        setProfile(JSON.parse(storedProfile))
      } else {
        router.push("/onboarding")
        return
      }

      // Load roadmap
      const loadRoadmap = async () => {
        try {
          const dbRoadmap = await getUserRoadmap(user.id)
          if (dbRoadmap) {
            setRoadmap(dbRoadmap)
            calculateProgress(dbRoadmap)
          } else {
            const storedRoadmap = localStorage.getItem(`roadmap_${user.id}`)
            if (storedRoadmap) {
              const roadmapData = JSON.parse(storedRoadmap)
              setRoadmap(roadmapData)
              calculateProgress(roadmapData)
            }
          }
        } catch (error) {
          // Fallback to localStorage
          const storedRoadmap = localStorage.getItem(`roadmap_${user.id}`)
          if (storedRoadmap) {
            const roadmapData = JSON.parse(storedRoadmap)
            setRoadmap(roadmapData)
            calculateProgress(roadmapData)
          }
        }
      }

      loadRoadmap()
    }
  }, [user, authLoading, router])

  const calculateProgress = (roadmapData: Roadmap) => {
    if (!roadmapData.steps.length) return

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
          </>
        )}
      </main>
    </div>
  )
}
