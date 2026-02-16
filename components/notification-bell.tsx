"use client"

import { useState } from "react"
import { Bell, X, CheckCircle2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotifications } from "@/lib/notification-context"
import { cn } from "@/lib/utils"

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, deleteNotification } =
    useNotifications()
  const [isOpen, setIsOpen] = useState(false)

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "study_plan":
        return "📚"
      case "milestone":
        return "🎯"
      case "reminder":
        return "⏰"
      case "achievement":
        return "🏆"
      default:
        return "ℹ️"
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "study_plan":
        return "bg-blue-50 border-blue-200"
      case "milestone":
        return "bg-green-50 border-green-200"
      case "reminder":
        return "bg-yellow-50 border-yellow-200"
      case "achievement":
        return "bg-purple-50 border-purple-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    markAsRead(id)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteNotification(id)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative w-10 h-10"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[420px] max-w-[95vw]" align="end">
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <p className="text-xs text-gray-600">
                {unreadCount} unread
              </p>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center">
              <Bell className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-600">
                No notifications yet
              </p>
              <p className="text-xs text-gray-500 mt-1">
                You'll get notified about study plans and milestones
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "px-4 py-3 border-l-4 cursor-pointer transition-colors hover:bg-gray-50",
                    notification.read
                      ? "opacity-60 border-l-gray-300 bg-white"
                      : "border-l-blue-500 bg-blue-50 hover:bg-blue-100"
                  )}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-xl mt-1 flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8"
                          onClick={(e) => handleMarkAsRead(notification.id, e)}
                          title="Mark as read"
                        >
                          <CheckCircle2 className="w-4 h-4 text-blue-500" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        onClick={(e) => handleDelete(notification.id, e)}
                        title="Delete"
                      >
                        <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DropdownMenuSeparator className="m-0" />
        <div className="px-4 py-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() =>
              notifications.forEach((n) => markAsRead(n.id))
            }
            disabled={notifications.length === 0 || unreadCount === 0}
          >
            Mark all as read
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
