"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, TrendingUp, Calendar, Sparkles, Loader2, Award, Target, BookOpen } from "lucide-react"
import type { Profile, Roadmap } from "@/lib/types"

export default function ProgressPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [feedback, setFeedback] = useState<string>("")
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      const storedProfile = localStorage.getItem(`profile_${user.id}`)
      if (storedProfile) {
        setProfile(JSON.parse(storedProfile))
      }

      const storedRoadmap = localStorage.getItem(`roadmap_${user.id}`)
      if (storedRoadmap) {
        setRoadmap(JSON.parse(storedRoadmap))
      }
    }
  }, [user, authLoading, router])

  const getAIFeedback = async () => {
    if (!profile || !roadmap) return

    setIsLoadingFeedback(true)
    try {
      const completedSteps = roadmap.steps.filter((s) => s.completed).length
      const currentProgress = Math.round((completedSteps / roadmap.steps.length) * 100)

      const response = await fetch("/api/generate-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          completedSteps,
          currentProgress,
        }),
      })

      const data = await response.json()
      setFeedback(data.feedback)
    } catch (error) {
      console.error("Error generating feedback:", error)
    } finally {
      setIsLoadingFeedback(false)
    }
  }

  if (authLoading || !user || !roadmap) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const completedSteps = roadmap.steps.filter((s) => s.completed).length
  const totalSteps = roadmap.steps.length
  const overallProgress = Math.round((completedSteps / totalSteps) * 100)

  const completedSkills = roadmap.steps
    .filter((s) => s.completed)
    .flatMap((s) => s.skills)
    .filter((skill, index, self) => self.indexOf(skill) === index)

  const upcomingMilestones = roadmap.steps
    .filter((s) => !s.completed)
    .slice(0, 3)
    .flatMap((s) => s.milestones.slice(0, 2))

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-balance mb-2 text-3xl font-bold">Your Progress</h1>
          <p className="text-balance text-muted-foreground">Track your learning journey and celebrate milestones</p>
        </div>

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
                {completedSteps} of {totalSteps} steps completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Skills Acquired</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedSkills.length}</div>
              <p className="mt-2 text-xs text-muted-foreground">New skills learned so far</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedSteps}</div>
              <p className="mt-2 text-xs text-muted-foreground">Steps completed</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-balance">AI Feedback & Motivation</CardTitle>
              <CardDescription className="text-balance">Get personalized insights on your progress</CardDescription>
            </CardHeader>
            <CardContent>
              {!feedback ? (
                <Button onClick={getAIFeedback} disabled={isLoadingFeedback} className="w-full">
                  {isLoadingFeedback ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Feedback...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Get AI Feedback
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="whitespace-pre-wrap rounded-lg bg-primary/10 p-4 text-sm leading-relaxed">
                    {feedback}
                  </div>
                  <Button
                    onClick={getAIFeedback}
                    disabled={isLoadingFeedback}
                    variant="outline"
                    className="w-full bg-transparent"
                  >
                    Refresh Feedback
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-balance">Skills Learned</CardTitle>
              <CardDescription className="text-balance">Your growing skill set</CardDescription>
            </CardHeader>
            <CardContent>
              {completedSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {completedSkills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="bg-primary/10 text-primary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <BookOpen className="mb-2 h-12 w-12 text-muted-foreground" />
                  <p className="text-balance text-sm text-muted-foreground">
                    Complete your first step to start building your skill set
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-balance">Learning Timeline</CardTitle>
            <CardDescription className="text-balance">Your journey so far</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {roadmap.steps.map((step, index) => (
                <div key={step.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        step.completed
                          ? "bg-primary text-primary-foreground"
                          : index === completedSteps
                            ? "border-2 border-primary bg-background"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step.completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    </div>
                    {index < roadmap.steps.length - 1 && (
                      <div className={`h-12 w-0.5 ${step.completed ? "bg-primary" : "bg-muted"}`} />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      <h4 className="text-balance font-medium">{step.title}</h4>
                      {step.completed && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                          Completed
                        </Badge>
                      )}
                      {index === completedSteps && !step.completed && (
                        <Badge variant="secondary" className="text-xs">
                          In Progress
                        </Badge>
                      )}
                    </div>
                    <p className="text-balance text-sm text-muted-foreground">{step.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Duration: {step.duration}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {upcomingMilestones.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-balance flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Upcoming Milestones
              </CardTitle>
              <CardDescription className="text-balance">What you'll achieve next</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {upcomingMilestones.map((milestone, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-balance">{milestone}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
