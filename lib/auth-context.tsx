"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  type AuthError,
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

/** Map Firebase Auth error codes to user-friendly messages */
function getAuthErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Please sign in instead."
    case "auth/invalid-email":
      return "Please enter a valid email address."
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled. Please contact support."
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters."
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support."
    case "auth/user-not-found":
      return "No account found with this email. Please sign up first."
    case "auth/wrong-password":
      return "Incorrect password. Please try again."
    case "auth/invalid-credential":
      return "Invalid email or password. Please try again."
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later."
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again."
    default:
      return error.message || "An unexpected error occurred. Please try again."
  }
}

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
          },
          { merge: true }
        )
      } catch (firestoreErr) {
        console.warn("Could not sync user doc to Firestore:", firestoreErr)
      }
    } catch (error) {
      const authError = error as AuthError
      throw new Error(getAuthErrorMessage(authError))
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true)
    try {
      // Create user in Firebase Auth
      const result = await createUserWithEmailAndPassword(auth, email, password)

      // Set display name on the Firebase Auth profile
      try {
        await updateProfile(result.user, { displayName: name })
      } catch (profileErr) {
        console.warn("Could not set display name:", profileErr)
      }

      setUser({
        id: result.user.uid,
        email: result.user.email,
        name: name,
      })

      // Save user profile to Firestore via Admin SDK API route (bypasses security rules)
      let apiSuccess = false
      try {
        const response = await fetch("/api/auth/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: result.user.uid,
            email,
            name,
          }),
        })
        apiSuccess = response.ok
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          console.warn("API create-user failed:", data.error || response.statusText)
        }
      } catch (error) {
        console.warn("Failed to create user via API:", error)
      }

      // Fallback: try client-side Firestore write (best-effort, may fail if rules deny)
      if (!apiSuccess) {
        try {
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
        } catch (firestoreErr) {
          console.warn("Could not write user doc to Firestore (permissions):", firestoreErr)
          // Don't throw — the user is already created in Firebase Auth
        }
      }
    } catch (error) {
      // If it's already a wrapped Error from above, re-throw
      if (error instanceof Error && !("code" in error)) {
        throw error
      }
      const authError = error as AuthError
      throw new Error(getAuthErrorMessage(authError))
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
