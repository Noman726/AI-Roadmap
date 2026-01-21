"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { BookOpen, CheckCircle2, Clock, ExternalLink, Loader2 } from "lucide-react"
import type { Roadmap } from "@/lib/types"

export default function RoadmapPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [expandedStep, setExpandedStep] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      const storedRoadmap = localStorage.getItem(`roadmap_${user.id}`)
      if (storedRoadmap) {
        setRoadmap(JSON.parse(storedRoadmap))
      } else {
        router.push("/dashboard")
      }
    }
  }, [user, authLoading, router])

  const toggleStepCompletion = (stepId: string) => {
    if (!roadmap || !user) return

    const updatedSteps = roadmap.steps.map((step) =>
      step.id === stepId ? { ...step, completed: !step.completed } : step,
    )

    const updatedRoadmap = { ...roadmap, steps: updatedSteps }
    setRoadmap(updatedRoadmap)
    localStorage.setItem(`roadmap_${user.id}`, JSON.stringify(updatedRoadmap))
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
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      step.completed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
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
                    <Checkbox checked={step.completed} onCheckedChange={() => toggleStepCompletion(step.id)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                  className="mb-4"
                >
                  {expandedStep === step.id ? "Hide Details" : "Show Details"}
                </Button>

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
