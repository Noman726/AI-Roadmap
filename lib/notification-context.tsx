"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  metadata?: any
  createdAt: string
  updatedAt: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  fetchNotifications: () => Promise<void>
  createNotification: (data: {
    type: string
    title: string
    message: string
    metadata?: any
  }) => Promise<Notification | null>
  markAsRead: (id: string) => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  clearAllNotifications: () => Promise<void>
  isLoading: boolean
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
)

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (user?.id) {
      headers["x-user-id"] = user.id
    }
    return headers
  }, [user?.id])

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/notifications", {
        headers: getHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, getHeaders])

  const createNotification = useCallback(
    async (data: {
      type: string
      title: string
      message: string
      metadata?: any
    }) => {
      if (!user?.id) return null

      try {
        const response = await fetch("/api/notifications", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(data),
        })
        if (response.ok) {
          const { notification } = await response.json()
          setNotifications((prev) => [notification, ...prev])
          return notification
        }
      } catch (error) {
        console.error("Failed to create notification:", error)
      }
      return null
    },
    [user?.id, getHeaders]
  )

  const markAsRead = useCallback(
    async (id: string) => {
      if (!user?.id) return

      try {
        const response = await fetch(`/api/notifications/${id}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({ read: true }),
        })
        if (response.ok) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
          )
        }
      } catch (error) {
        console.error("Failed to mark notification as read:", error)
      }
    },
    [user?.id, getHeaders]
  )

  const deleteNotification = useCallback(
    async (id: string) => {
      if (!user?.id) return

      try {
        const response = await fetch(`/api/notifications/${id}`, {
          method: "DELETE",
          headers: getHeaders(),
        })
        if (response.ok) {
          setNotifications((prev) => prev.filter((n) => n.id !== id))
        }
      } catch (error) {
        console.error("Failed to delete notification:", error)
      }
    },
    [user?.id, getHeaders]
  )

  const clearAllNotifications = useCallback(async () => {
    try {
      await Promise.all(
        notifications.map((n) => deleteNotification(n.id))
      )
    } catch (error) {
      console.error("Failed to clear notifications:", error)
    }
  }, [notifications, deleteNotification])

  // Fetch notifications on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      fetchNotifications()
    }
  }, [user?.id, fetchNotifications])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        fetchNotifications,
        createNotification,
        markAsRead,
        deleteNotification,
        clearAllNotifications,
        isLoading,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    )
  }
  return context
}
