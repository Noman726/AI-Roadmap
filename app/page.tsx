import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Map,
  Radar,
  Sparkles,
  Timer,
  Zap,
} from "lucide-react"

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#f6f9ff] text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(circle_at_20%_20%,rgba(30,64,175,0.12),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(2,132,199,0.18),transparent_40%),radial-gradient(circle_at_60%_80%,rgba(59,130,246,0.12),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70 [background-image:linear-gradient(transparent_0%,transparent_96%,rgba(15,23,42,0.06)_96%),linear-gradient(90deg,transparent_0%,transparent_96%,rgba(15,23,42,0.06)_96%)] [background-size:24px_24px]" />

      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-[#f6f9ff]/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight text-slate-900">
            <Compass className="h-5 w-5 text-blue-600" />
            <span>AI Roadmap</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
              Sign In
            </Link>
            <Button asChild className="rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="pb-20 pt-8">
        <section className="container mx-auto grid items-center gap-12 px-4 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              <Sparkles className="h-3.5 w-3.5" />
              Real plans, real progress
            </div>
            <div className="space-y-4">
              <h1 className="font-heading text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
                A learning roadmap that looks like it was made for you.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Answer a few questions and get a structured path, weekly plan, and tangible milestones. No fluff. No endless lists. Just the next right move.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild className="h-12 rounded-full bg-blue-600 px-7 text-base font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500">
                <Link href="/signup">
                  Start building <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 rounded-full border-slate-300 bg-white px-7 text-base font-semibold text-slate-700 hover:bg-slate-50">
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Personalized in minutes", value: "5 min" },
                { label: "Average weekly focus", value: "6-8 hrs" },
                { label: "Milestones tracked", value: "12+" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">{stat.value}</div>
                  <div className="text-xs text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 -top-6 h-24 w-24 rounded-[32px] bg-blue-600/10" />
            <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full border border-blue-200/60" />
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-blue-900/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Roadmap preview</p>
                  <p className="text-lg font-semibold text-slate-900">AI Product Designer</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Map className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  "Foundations of product thinking",
                  "Design systems and UI patterns",
                  "AI prototyping workflows",
                  "Portfolio-ready case study",
                ].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                      0{index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Timer className="h-4 w-4 text-blue-600" />
                    Weekly plan
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Auto-scheduled, 5 study blocks.</p>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Radar className="h-4 w-4 text-blue-600" />
                    Skill radar
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Progress updates every week.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto grid gap-6 px-4 pb-20 pt-6 lg:grid-cols-[1fr_1fr_1fr]">
          {[
            {
              title: "Signal over noise",
              description: "We prioritize the 20% of resources that drive 80% of outcomes and keep you in motion.",
              icon: Zap,
            },
            {
              title: "Built for momentum",
              description: "Weekly pacing, micro-milestones, and quick wins keep your plan realistic and consistent.",
              icon: CheckCircle2,
            },
            {
              title: "Aligned with your goal",
              description: "Every step ties directly to the role you want, not a generic skill checklist.",
              icon: Compass,
            },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="container mx-auto grid gap-10 px-4 pb-24 pt-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">Three steps. One clear direction.</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              The system pulls your inputs, builds a plan, and keeps you on track with light-touch feedback so the roadmap stays realistic.
            </p>
            <div className="mt-8 space-y-4">
              {[
                {
                  title: "Answer a short brief",
                  detail: "Pick your goal, current level, and time you can commit.",
                },
                {
                  title: "Get your roadmap",
                  detail: "We generate steps, resources, and milestones tailored to you.",
                },
                {
                  title: "Stay on the rails",
                  detail: "Track wins, adjust the pace, and regenerate when you level up.",
                },
              ].map((item, index) => (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                    0{index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-600">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200/70 bg-slate-900 p-8 text-white shadow-lg shadow-slate-900/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Weekly pulse</p>
                <p className="mt-2 text-2xl font-semibold">Your current focus</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500/20">
                <Map className="h-5 w-5 text-blue-100" />
              </div>
            </div>
            <div className="mt-8 space-y-4">
              {["Prototype the onboarding flow", "Run usability testing", "Refine the visual system"].map((task) => (
                <div key={task} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm">{task}</span>
                  <span className="rounded-full bg-blue-400/20 px-3 py-1 text-xs font-semibold text-blue-100">In progress</span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-blue-200">
                <span>Progress</span>
                <span>68%</span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-white/10">
                <div className="h-2 w-[68%] rounded-full bg-blue-400" />
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4">
          <div className="rounded-3xl border border-blue-200/70 bg-white/90 p-10 text-center shadow-lg shadow-blue-600/10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Ready to start</p>
            <h2 className="mt-4 text-3xl font-semibold text-slate-900">Make your next 90 days inevitable.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600">
              Give us your goal and your time window. We will map a plan, keep it lean, and help you stay consistent.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild className="h-12 rounded-full bg-blue-600 px-7 text-base font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500">
                <Link href="/signup">Get my roadmap</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 rounded-full border-slate-300 bg-white px-7 text-base font-semibold text-slate-700 hover:bg-slate-50">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/70 bg-white/80 py-10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 sm:flex-row">
          <p>&copy; 2026 AI Roadmap. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="transition-colors hover:text-slate-900">
              Privacy
            </Link>
            <Link href="#" className="transition-colors hover:text-slate-900">
              Terms
            </Link>
            <Link href="#" className="transition-colors hover:text-slate-900">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
