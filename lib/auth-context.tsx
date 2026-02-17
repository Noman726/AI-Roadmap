"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "./firebase"

interface User {
  id: string
  email: string | null
  name: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
        })
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      setUser({
        id: result.user.uid,
        email: result.user.email,
        name: result.user.displayName || email.split("@")[0],
      })

      // Best-effort: sync user profile to Firestore (don't block login if rules deny it)
      try {
        await setDoc(
          doc(db, "users", result.user.uid),
          {
            email: result.user.email,
            name: result.user.displayName || email.split("@")[0],
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true }
        )
      } catch (firestoreErr) {
        console.warn("Could not sync user doc to Firestore:", firestoreErr)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true)
    try {
      // Create user in Firebase Auth
      const result = await createUserWithEmailAndPassword(auth, email, password)

      setUser({
        id: result.user.uid,
        email: result.user.email,
        name: name,
      })

      try {
        // Save user profile to Firestore (via API)
        await fetch("/api/auth/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: result.user.uid,
            email,
            name,
          }),
        })
      } catch (error) {
        console.warn("Failed to create user via API, using client Firestore:", error)
      }

      await setDoc(
        doc(db, "users", result.user.uid),
        {
          email,
          name,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await signOut(auth)
      setUser(null)
      localStorage.clear()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
