// Firebase Admin SDK - for use in server-side code (API routes)
import * as admin from "firebase-admin"

const hasValidCredentials = () => {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const projectId = process.env.FIREBASE_PROJECT_ID

  // Check if credentials are placeholders or not set
  if (
    !privateKey ||
    !clientEmail ||
    !projectId ||
    privateKey.includes("TODO") ||
    clientEmail.includes("TODO") ||
    projectId.includes("TODO")
  ) {
    return false
  }

  return true
}

let adminDb: any = null
let adminAuth: any = null

if (hasValidCredentials()) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      })
    }

    adminDb = admin.firestore()
    adminAuth = admin.auth()
  } catch (error) {
    console.warn("Failed to initialize Firebase Admin SDK:", error)
  }
}

export { adminDb, adminAuth }
export default admin
