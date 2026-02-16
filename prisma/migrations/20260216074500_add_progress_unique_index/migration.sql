-- CreateIndex to ensure one Progress record per user-roadmap combination
CREATE UNIQUE INDEX "Progress_userId_roadmapId_key" ON "Progress"("userId", "roadmapId");
