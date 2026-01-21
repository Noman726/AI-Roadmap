import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, BookOpen, Target, TrendingUp, Sparkles } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Sparkles className="h-6 w-6 text-indigo-600" />
            <span className="text-balance">AI Roadmap</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <h1 className="text-balance text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
              Your Personalized Learning Journey Starts Here
            </h1>
            <p className="text-balance text-lg text-muted-foreground leading-relaxed sm:text-xl">
              Transform your goals into actionable roadmaps with AI-powered guidance. Get personalized learning paths,
              curated resources, and progress tracking.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 pt-4 sm:flex-row">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <Link href="/signup">
                  Start Your Journey <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto bg-transparent">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center space-y-3 rounded-lg bg-white p-6 text-center shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                <Target className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-balance font-semibold text-xl">AI-Powered Mapping</h3>
              <p className="text-balance text-muted-foreground leading-relaxed">
                Our AI analyzes your interests and goals to create customized career pathways and learning plans
              </p>
            </div>

            <div className="flex flex-col items-center space-y-3 rounded-lg bg-white p-6 text-center shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                <BookOpen className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-balance font-semibold text-xl">Curated Resources</h3>
              <p className="text-balance text-muted-foreground leading-relaxed">
                Get personalized recommendations for courses, books, tutorials, and projects tailored to your style
              </p>
            </div>

            <div className="flex flex-col items-center space-y-3 rounded-lg bg-white p-6 text-center shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-balance font-semibold text-xl">Progress Tracking</h3>
              <p className="text-balance text-muted-foreground leading-relaxed">
                Track your learning milestones and get AI feedback to stay motivated and on track
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 AI Roadmap Generator. Built for students, by students.</p>
        </div>
      </footer>
    </div>
  )
}
