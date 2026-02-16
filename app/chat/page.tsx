"use client"

import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Chatbot } from "@/components/chatbot"
import { Loader2, MessageSquare, Lightbulb, BookOpen } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ChatPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  if (authLoading || !user) {
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
          <h1 className="text-balance mb-2 text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-blue-600" />
            Learning Assistant
          </h1>
          <p className="text-balance text-muted-foreground">
            Chat with your AI-powered learning mentor anytime
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Chatbot maxHeight="h-[600px]" />
          </div>

          {/* Quick Tips Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-600" />
                  Chat Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  ✨ Ask about your current learning step or focus area
                </p>
                <p>
                  ✨ Request study strategies based on your learning style
                </p>
                <p>
                  ✨ Get help understanding complex topics
                </p>
                <p>
                  ✨ Ask for motivation and encouragement
                </p>
                <p>
                  ✨ Request quick tips for better learning
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  What You Can Ask
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <p className="font-medium text-gray-900">About Your Path</p>
                  <p className="text-muted-foreground mt-1">
                    Questions about your career roadmap and learning goals
                  </p>
                </div>
                <div className="border-t pt-3">
                  <p className="font-medium text-gray-900">Study Tips</p>
                  <p className="text-muted-foreground mt-1">
                    Personalized advice for effective learning
                  </p>
                </div>
                <div className="border-t pt-3">
                  <p className="font-medium text-gray-900">Resource Help</p>
                  <p className="text-muted-foreground mt-1">
                    Recommendations for courses, books, and projects
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-sm text-blue-900">Pro Tip</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-blue-800">
                The chatbot knows about your current learning path and study style. 
                Use this to get personalized guidance that matches your goals!
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
