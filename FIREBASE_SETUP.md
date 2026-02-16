# Firebase Setup Guide for AI-Roadmap

## ✅ What's Been Set Up

1. **Firebase Client SDK** - `lib/firebase.ts`
   - Initializes Firebase with your config
   - Exports `auth` and `db` for use in components

2. **Firebase Admin SDK** - `lib/firebase-admin.ts`
   - Server-side Firebase initialization
   - For use in API routes

3. **Updated Auth Context** - `lib/auth-context.tsx`
   - Now uses Firebase Authentication instead of localStorage
   - Automatic login/logout state persistence

4. **User Creation API** - `app/api/auth/create-user/route.ts`
   - Creates user documents in Firestore when users sign up

5. **Environment Variables** - `.env.local`
   - Firebase client config (public)
   - Placeholders for Admin SDK credentials (secret)

---

## 🔐 Next Steps - Get Service Account Key

### Step 1: Go to Firebase Console
1. Go to https://console.firebase.google.com/project/ai-roadmap-d152a/settings/serviceaccounts/adminsdk
2. Click "Generate New Private Key"
3. A JSON file will download with your service account credentials

### Step 2: Add Credentials to .env.local
Open `.env.local` and replace these placeholders:

```env
FIREBASE_PRIVATE_KEY="PASTE_THE_PRIVATE_KEY_HERE"
FIREBASE_CLIENT_EMAIL="PASTE_THE_CLIENT_EMAIL_HERE"
```

**From the downloaded JSON file:**
- `private_key` → `FIREBASE_PRIVATE_KEY`
- `client_email` → `FIREBASE_CLIENT_EMAIL`

⚠️ **IMPORTANT**: 
- The private key has escaped newlines - keep them as `\n`
- DO NOT commit `.env.local` to git
- Add `.env.local` to `.gitignore`

### Step 3: Enable Firestore Database
1. Go to https://console.firebase.google.com/project/ai-roadmap-d152a/firestore
2. Click "Create Database"
3. Choose "Start in test mode" (for development)
4. Select your region
5. Click "Create"

### Step 4: Set Firestore Security Rules (Test Mode)
In Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    
    // Everyone can read these collections
    match /roadmaps/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /studyPlans/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /notifications/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### Step 5: Test the Setup
1. Restart your dev server: `npm run dev`
2. Go to http://localhost:3000/signup
3. Create a new account
4. Check Firebase Console → Firestore → Collections → users (should see your new user)

---

## 📚 How to Use Firebase in Your Code

### Sign Up (Client-Side)
```typescript
import { useAuth } from "@/lib/auth-context"

export default function SignUp() {
  const { signup } = useAuth()
  
  const handleSignup = async () => {
    await signup("email@example.com", "password", "name")
  }
}
```

### Read from Firestore (Client-Side)
```typescript
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"

const getUserData = async (uid: string) => {
  const q = query(collection(db, "users"), where("uid", "==", uid))
  const snapshot = await getDocs(q)
  return snapshot.docs[0]?.data()
}
```

### Write to Firestore (API Route)
```typescript
import { adminDb } from "@/lib/firebase-admin"

export async function POST(req: Request) {
  const { uid, data } = await req.json()
  
  await adminDb.collection("users").doc(uid).update(data)
  
  return Response.json({ success: true })
}
```

---

## 🗄️ Firestore Collections to Create

1. **users** - User profiles
2. **roadmaps** - Learning roadmaps
3. **studyPlans** - Weekly study plans
4. **notifications** - User notifications

Example user document:
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "currentSkillLevel": "beginner",
  "learningStyle": "visual",
  "studyTime": "5-10",
  "createdAt": "2024-02-16T...",
  "updatedAt": "2024-02-16T..."
}
```

---

## ⚙️ Optional: Migrate from Prisma to Firestore

If you want to use Firestore instead of SQLite:
1. Update API routes to use `adminDb` instead of `prisma`
2. Keep Prisma for reference, or remove it
3. Update database calls from Prisma syntax to Firestore queries

---

## 🔧 Troubleshooting

**Error: "Missing Firebase credentials"**
- Check that `.env.local` has all Firebase variables
- Restart dev server after updating env

**Error: "Firebase app not initialized"**
- Make sure `lib/firebase.ts` is imported in providers
- Check that environment variables are set

**Auth not persisting**
- Firebase SDK requires cookies in browser
- Check browser's localStorage/sessionStorage settings

---

## 📖 Useful Links
- [Firebase Console](https://console.firebase.google.com)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Auth JS SDK](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
