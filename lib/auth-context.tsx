"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"

interface User {
  id: string
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string, name?: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string, name?: string) => {
    // Check if user exists in localStorage
    const users = JSON.parse(localStorage.getItem("users") || "[]")
    const existingUser = users.find((u: any) => u.email === email)

    if (!existingUser) {
      throw new Error("User not found. Please sign up first.")
    }

    if (existingUser.password !== password) {
      throw new Error("Invalid password")
    }

    const userData = {
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name,
    }

    setUser(userData)
    localStorage.setItem("user", JSON.stringify(userData))
  }

  const signup = async (email: string, password: string, name: string) => {
    // Check if user already exists
    const users = JSON.parse(localStorage.getItem("users") || "[]")
    const existingUser = users.find((u: any) => u.email === email)

    if (existingUser) {
      throw new Error("User already exists. Please login.")
    }

    const newUser = {
      id: crypto.randomUUID(),
      email,
      password,
      name,
    }

    users.push(newUser)
    localStorage.setItem("users", JSON.stringify(users))

    const userData = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
    }

    setUser(userData)
    localStorage.setItem("user", JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
  }

  return <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
