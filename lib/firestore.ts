import admin, { adminDb } from "@/lib/firebase-admin"

export function requireAdminDb() {
  if (!adminDb) {
    throw new Error("Firebase Admin SDK not initialized")
  }
  return adminDb
}

export function serverTimestamp() {
  return admin.firestore.FieldValue.serverTimestamp()
}
