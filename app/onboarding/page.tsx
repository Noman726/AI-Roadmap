"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowRight, ArrowLeft } from "lucide-react"

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const { user } = useAuth()
  const router = useRouter()

  // Form state
  const [interests, setInterests] = useState("")
  const [educationLevel, setEducationLevel] = useState("")
  const [careerGoal, setCareerGoal] = useState("")
  const [currentSkillLevel, setCurrentSkillLevel] = useState("")
  const [learningStyle, setLearningStyle] = useState("")
  const [studyTime, setStudyTime] = useState("")

  const handleSubmit = () => {
    const profileData = {
      userId: user?.id,
      interests,
      educationLevel,
      careerGoal,
      currentSkillLevel,
      learningStyle,
      studyTime,
      createdAt: new Date().toISOString(),
    }

    // Store profile data in localStorage
    localStorage.setItem(`profile_${user?.id}`, JSON.stringify(profileData))

    // Redirect to dashboard
    router.push("/dashboard")
  }

  const totalSteps = 3

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Step {step} of {totalSteps}
            </div>
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`h-2 w-8 rounded-full ${i + 1 <= step ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          </div>
          <CardTitle className="text-balance text-2xl">Let's Personalize Your Journey</CardTitle>
          <CardDescription className="text-balance">
            Tell us about yourself so we can create the perfect roadmap
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="interests">What are your interests?</Label>
                <Textarea
                  id="interests"
                  placeholder="e.g., Web development, data science, artificial intelligence, design..."
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="education">Education Level</Label>
                <Select value={educationLevel} onValueChange={setEducationLevel}>
                  <SelectTrigger id="education">
                    <SelectValue placeholder="Select your education level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high-school">High School</SelectItem>
                    <SelectItem value="undergraduate">Undergraduate</SelectItem>
                    <SelectItem value="graduate">Graduate</SelectItem>
                    <SelectItem value="professional">Professional/Working</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="career">Career Goal</Label>
                <Input
                  id="career"
                  placeholder="e.g., Software Engineer, Data Scientist, UX Designer..."
                  value={careerGoal}
                  onChange={(e) => setCareerGoal(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Skill Level</Label>
                <RadioGroup value={currentSkillLevel} onValueChange={setCurrentSkillLevel}>
                  <div className="flex items-center space-x-2 rounded-lg border p-3">
                    <RadioGroupItem value="beginner" id="beginner" />
                    <Label htmlFor="beginner" className="flex-1 cursor-pointer font-normal">
                      <div className="font-medium">Beginner</div>
                      <div className="text-sm text-muted-foreground">Just starting out</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border p-3">
                    <RadioGroupItem value="intermediate" id="intermediate" />
                    <Label htmlFor="intermediate" className="flex-1 cursor-pointer font-normal">
                      <div className="font-medium">Intermediate</div>
                      <div className="text-sm text-muted-foreground">Some experience</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border p-3">
                    <RadioGroupItem value="advanced" id="advanced" />
                    <Label htmlFor="advanced" className="flex-1 cursor-pointer font-normal">
                      <div className="font-medium">Advanced</div>
                      <div className="text-sm text-muted-foreground">Proficient and experienced</div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Learning Style</Label>
                <RadioGroup value={learningStyle} onValueChange={setLearningStyle}>
                  <div className="flex items-center space-x-2 rounded-lg border p-3">
                    <RadioGroupItem value="visual" id="visual" />
                    <Label htmlFor="visual" className="flex-1 cursor-pointer font-normal">
                      <div className="font-medium">Visual</div>
                      <div className="text-sm text-muted-foreground">Videos and diagrams</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border p-3">
                    <RadioGroupItem value="reading" id="reading" />
                    <Label htmlFor="reading" className="flex-1 cursor-pointer font-normal">
                      <div className="font-medium">Reading/Writing</div>
                      <div className="text-sm text-muted-foreground">Articles and documentation</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border p-3">
                    <RadioGroupItem value="hands-on" id="hands-on" />
                    <Label htmlFor="hands-on" className="flex-1 cursor-pointer font-normal">
                      <div className="font-medium">Hands-on</div>
                      <div className="text-sm text-muted-foreground">Projects and practice</div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Available Study Time per Week</Label>
                <RadioGroup value={studyTime} onValueChange={setStudyTime}>
                  <div className="flex items-center space-x-2 rounded-lg border p-3">
                    <RadioGroupItem value="1-5" id="1-5" />
                    <Label htmlFor="1-5" className="flex-1 cursor-pointer font-normal">
                      <div className="font-medium">1-5 hours</div>
                      <div className="text-sm text-muted-foreground">Light commitment</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border p-3">
                    <RadioGroupItem value="5-10" id="5-10" />
                    <Label htmlFor="5-10" className="flex-1 cursor-pointer font-normal">
                      <div className="font-medium">5-10 hours</div>
                      <div className="text-sm text-muted-foreground">Moderate commitment</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border p-3">
                    <RadioGroupItem value="10-20" id="10-20" />
                    <Label htmlFor="10-20" className="flex-1 cursor-pointer font-normal">
                      <div className="font-medium">10-20 hours</div>
                      <div className="text-sm text-muted-foreground">Strong commitment</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border p-3">
                    <RadioGroupItem value="20+" id="20+" />
                    <Label htmlFor="20+" className="flex-1 cursor-pointer font-normal">
                      <div className="font-medium">20+ hours</div>
                      <div className="text-sm text-muted-foreground">Full-time dedication</div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 font-medium">Your Profile Summary</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Interests:</span> {interests || "Not specified"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Education:</span>{" "}
                    {educationLevel ? educationLevel.replace("-", " ") : "Not specified"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Goal:</span> {careerGoal || "Not specified"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Level:</span> {currentSkillLevel || "Not specified"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Style:</span> {learningStyle || "Not specified"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Time:</span>{" "}
                    {studyTime ? `${studyTime} hours/week` : "Not specified"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
            ) : (
              <div />
            )}
            {step < totalSteps ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && (!interests || !educationLevel || !careerGoal)) ||
                  (step === 2 && (!currentSkillLevel || !learningStyle))
                }
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!studyTime}>
                Complete Setup
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
