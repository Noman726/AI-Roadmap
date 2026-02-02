import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, BookOpen, Target, TrendingUp, Sparkles, Map, Compass } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="fixed top-0 w-full border-b bg-background/80 backdrop-blur-sm z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight text-primary">
            <Compass className="h-6 w-6" />
            <span>AI Roadmap</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Sign In
            </Link>
            <Button asChild className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 pt-16">
        <section className="container mx-auto px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-4xl text-center space-y-8">
            <div className="inline-flex items-center rounded-full border bg-muted/50 px-3 py-1 text-sm text-muted-foreground backdrop-blur-sm">
              <Sparkles className="mr-2 h-3.5 w-3.5 text-secondary-foreground" />
              <span>No more tutorial hell. Just progress.</span>
            </div>

            <h1 className="font-heading text-5xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-7xl">
              Build a Career You <span className="text-primary italic">Actually</span> Want.
            </h1>

            <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
              Stop guessing what to learn next. We create custom, step-by-step learning paths tailored to your goals, current skills, and learning style.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
              <Button size="lg" asChild className="h-12 rounded-full px-8 text-lg shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300">
                <Link href="/signup">
                  Start Your Journey <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 rounded-full px-8 text-lg border-2 hover:bg-muted/50 bg-transparent">
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-24 bg-muted/30">
          <div className="grid gap-12 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="group relative overflow-hidden rounded-3xl bg-card p-8 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-primary">
                <Map className="h-7 w-7" />
              </div>
              <h3 className="mb-3 font-heading text-2xl font-bold">Your Personal GPS</h3>
              <p className="text-muted-foreground leading-relaxed">
                Most roadmaps are generic. Yours is unique. We analyze where you are and where you want to go, then plot the most efficient route.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative overflow-hidden rounded-3xl bg-card p-8 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <BookOpen className="h-7 w-7" />
              </div>
              <h3 className="mb-3 font-heading text-2xl font-bold">Curated for Humans</h3>
              <p className="text-muted-foreground leading-relaxed">
                Forget 40-hour stale documentation. We fetch the best modern tutorials, videos, and interactive courses that actually teach.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative overflow-hidden rounded-3xl bg-card p-8 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <TrendingUp className="h-7 w-7" />
              </div>
              <h3 className="mb-3 font-heading text-2xl font-bold">Tangible Progress</h3>
              <p className="text-muted-foreground leading-relaxed">
                Don't just watch videos. Track your milestones, build projects, and see your skills grow with real-time feedback.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 bg-background">
        <div className="container mx-auto px-4 flex flex-col items-center justify-between gap-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; 2025 AI Roadmap. Crafted with care.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="#" className="hover:text-primary transition-colors">Twitter</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
