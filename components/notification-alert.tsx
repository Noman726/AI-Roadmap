"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type NotificationAlertType =
  | "success"
  | "error"
  | "warning"
  | "info"

interface NotificationAlertProps {
  type: NotificationAlertType
  title: string
  description?: string
  onClose?: () => void
  autoClose?: boolean
  autoCloseDuration?: number
  className?: string
}

export function NotificationAlert({
  type,
  title,
  description,
  onClose,
  autoClose = true,
  autoCloseDuration = 5000,
  className,
}: NotificationAlertProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, autoCloseDuration)

      return () => clearTimeout(timer)
    }
  }, [autoClose, autoCloseDuration, onClose])

  if (!isVisible) {
    return null
  }

  const iconMap = {
    success: <CheckCircle className="w-4 h-4 text-green-600" />,
    error: <AlertCircle className="w-4 h-4 text-red-600" />,
    warning: <AlertTriangle className="w-4 h-4 text-yellow-600" />,
    info: <Info className="w-4 h-4 text-blue-600" />,
  }

  const bgColorMap = {
    success: "border-green-600 bg-green-50",
    error: "border-red-600 bg-red-50",
    warning: "border-yellow-600 bg-yellow-50",
    info: "border-blue-600 bg-blue-50",
  }

  const titleColorMap = {
    success: "text-green-900",
    error: "text-red-900",
    warning: "text-yellow-900",
    info: "text-blue-900",
  }

  return (
    <Alert className={cn(bgColorMap[type], className)}>
      {iconMap[type]}
      <div className="flex-1">
        <AlertTitle className={titleColorMap[type]}>{title}</AlertTitle>
        {description && (
          <AlertDescription className="mt-1 text-sm opacity-90">
            {description}
          </AlertDescription>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setIsVisible(false)
          onClose?.()
        }}
        className="flex-shrink-0"
      >
        ✕
      </Button>
    </Alert>
  )
}
