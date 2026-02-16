"use client"

import React, { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, Bot, User } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

export interface ChatMessage {
  id?: string
  role: "user" | "assistant"
  content: string
  createdAt?: string
}

interface ChatbotProps {
  compact?: boolean
  maxHeight?: string
  title?: string
  placeholder?: string
}

export function Chatbot({
  compact = false,
  maxHeight = "h-[500px]",
  title = "Learning Assistant",
  placeholder = "Ask me anything about your learning journey...",
}: ChatbotProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load chat history on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!user?.id) {
        setIsInitialized(true)
        return
      }

      try {
        const response = await fetch("/api/chat", {
          headers: { "x-user-id": user.id },
        })
        if (response.ok) {
          const { messages: historyMessages } = await response.json()
          setMessages(historyMessages)
        }
      } catch (error) {
        console.error("Failed to load chat history:", error)
      } finally {
        setIsInitialized(true)
      }
    }

    loadChatHistory()
  }, [user?.id])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading || !user?.id) return

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({ message: input }),
      })

      if (response.ok) {
        const { message, id } = await response.json()
        const assistantMessage: ChatMessage = {
          id,
          role: "assistant",
          content: message,
        }
        setMessages((prev) => [...prev, assistantMessage])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, I encountered an error. Please try again later.",
          },
        ])
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error. Please try again later.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  if (compact) {
    return (
      <div className="flex flex-col h-full bg-white rounded-lg border shadow-sm">
        <CardHeader className="border-b py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bot className="w-4 h-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {!isInitialized ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Bot className="w-12 h-12 text-gray-300 mb-2" />
                <p className="text-sm text-gray-600">
                  No messages yet. Start a conversation!
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Ask questions about your learning journey
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-3",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-blue-600" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-xs px-3 py-2 rounded-lg text-sm",
                        msg.role === "user"
                          ? "bg-primary text-white rounded-br-none"
                          : "bg-gray-100 text-gray-900 rounded-bl-none"
                      )}
                    >
                      <p className="break-words">{msg.content}</p>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="bg-gray-100 px-3 py-2 rounded-lg rounded-bl-none">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </>
            )}
          </div>
        </ScrollArea>
        <form
          onSubmit={handleSendMessage}
          className="border-t p-3 flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="text-sm h-9"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="sm"
            className="px-3"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col bg-white rounded-lg border shadow-lg", maxHeight)}>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {!isInitialized ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <Bot className="w-16 h-16 text-gray-300 mb-3" />
              <p className="text-lg font-medium text-gray-700">
                Welcome to Your Learning Assistant
              </p>
              <p className="text-sm text-gray-500 mt-2 max-w-md">
                I'm here to help you with your study plans, answer learning questions, and provide personalized guidance for your learning journey.
              </p>
              <p className="text-xs text-gray-400 mt-4">
                Ask me about your roadmap, study tips, or any learning-related questions!
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-3",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-blue-600" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-md px-4 py-3 rounded-lg",
                      msg.role === "user"
                        ? "bg-primary text-white rounded-br-none"
                        : "bg-gray-100 text-gray-900 rounded-bl-none"
                    )}
                  >
                    <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                    {msg.createdAt && (
                      <p className="text-xs mt-2 opacity-70">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="bg-gray-100 px-4 py-3 rounded-lg rounded-bl-none">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </>
          )}
        </div>
      </ScrollArea>
      <form
        onSubmit={handleSendMessage}
        className="border-t p-4 flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  )
}
