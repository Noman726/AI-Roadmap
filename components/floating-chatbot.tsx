"use client"

import React, { useState } from "react"
import { MessageCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Chatbot } from "@/components/chatbot"

interface FloatingChatbotProps {
  defaultOpen?: boolean
}

export function FloatingChatbot({ defaultOpen = false }: FloatingChatbotProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow z-40"
        size="lg"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>

      {/* Chat Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:w-[420px] p-0 flex flex-col">
          <SheetHeader className="border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <SheetTitle>Learning Assistant</SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <Chatbot compact maxHeight="h-full" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
