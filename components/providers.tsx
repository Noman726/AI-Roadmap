"use client"

import { AuthProvider } from "@/lib/auth-context"
import { NotificationProvider } from "@/lib/notification-context"
import { FloatingChatbot } from "@/components/floating-chatbot"
import React, { Suspense } from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        {children}
        <Suspense fallback={null}>
          <FloatingChatbot />
        </Suspense>
      </NotificationProvider>
    </AuthProvider>
  )
}
