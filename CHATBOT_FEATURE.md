# Chatbot Feature Documentation

## Overview
The AI Roadmap application now includes a comprehensive chatbot feature that provides personalized learning assistance to students.

## Features Implemented

### 1. **Database Integration**
- Stores chat conversations in Firestore
- Saves timestamps for each message
- Links messages to user accounts for persistent history

### 2. **API Routes**

#### `/api/chat`
- **POST**: Send a chat message and get AI-generated response
  - Headers: `x-user-id` (user ID)
  - Body: `{ message: string }`
  - Returns: AI-generated response and message ID
  
- **GET**: Retrieve chat history
  - Headers: `x-user-id` (user ID)
  - Returns: Array of all previous messages

### 3. **User Interface Components**

#### **Chatbot Component** (`components/chatbot.tsx`)
- Full-featured chat interface
- Supports both compact and full-size modes
- Auto-scrolling message display
- Message history loading on mount
- Loading states and error handling

**Props:**
- `compact`: Boolean - renders compact version (default: false)
- `maxHeight`: String - CSS height value (default: "h-[500px]")
- `title`: String - component title (default: "Learning Assistant")
- `placeholder`: String - input placeholder

#### **Floating Chatbot Widget** (`components/floating-chatbot.tsx`)
- Floating action button (bottom-right corner)
- Opens chatbot in a side sheet/drawer
- Accessible from any page in the application
- Non-intrusive design

#### **Chat Page** (`app/chat/page.tsx`)
- Dedicated full-page chat interface
- Integrated help tips and guides
- Quick reference for what you can ask
- Pro tips section

### 4. **Features**

✅ **Personalized Responses**
- AI considers student's learning style
- Takes into account current skill level
- References their career goals
- Considers available study time

✅ **Context-Aware**
- Understands student's current roadmap
- Knows about their learning progress
- Can reference specific learning steps
- Maintains conversation history

✅ **Persistent History**
- Chat messages saved to database
- Full conversation history available
- Messages persist across sessions

✅ **Smart AI System Prompt**
- Encourages goal-oriented learning
- Provides actionable advice
- Offers motivation and support
- References student's profile and progress

### 5. **Implementation Details**

**Authentication**
- Uses custom header-based authentication (`x-user-id`)
- Works with existing auth-context system
- No dependency on external auth providers

**AI Integration**
- Uses OpenAI's GPT-3.5 Turbo model
- Generates contextual, helpful responses
- Maintains conversation context (last 10 messages)
- Adjusts response length (max 500 tokens)

**Database**
- ChatMessage model tracks:
  - User ID
  - Role (user or assistant)
  - Content
  - Creation timestamp
  - Update timestamp

## How to Use

### For Students
1. **Quick Chat**: Click the floating chat button (bottom-right) from any page
2. **Full Chat Page**: Click "Chat" in the navbar for a dedicated chat interface
3. **Ask Questions About**:
   - Their learning roadmap
   - Study strategies and tips
   - Learning resources and recommendations
   - Progress tracking and motivation
   - Specific topic questions

### For Developers

**Starting the Chatbot:**
```tsx
import { Chatbot } from "@/components/chatbot"

// Full-size version
<Chatbot />

// Compact version
<Chatbot compact={true} />

// With custom props
<Chatbot 
  title="Study Helper"
  placeholder="Ask about your learning..."
  maxHeight="h-[600px]"
/>
```

**Floating Widget (auto-included):**
- Automatically added via Providers component
- Available on all authenticated pages
- Accessible via floating button

## API Examples

### Send a Message
```bash
POST /api/chat
Headers: x-user-id: user-123
Body: { "message": "How should I study for my JavaScript course?" }

Response: { "message": "...", "id": "msg-456" }
```

### Get Chat History
```bash
GET /api/chat
Headers: x-user-id: user-123

Response: { "messages": [...] }
```

## Integration Points

1. **Navbar**: Added "Chat" link to main navigation
2. **Providers**: FloatingChatbot integrated via app Providers
3. **Authentication**: Uses auth-context for user identification
4. **UI Components**: Uses existing UI component library

## Navigation

- **Chat Page**: `http://localhost:3000/chat`
- **Floating Widget**: Available on all pages
- **Navbar Link**: "Chat" option in main navigation

## Future Enhancements

Potential improvements:
- Voice input/output for chat
- Chat-based roadmap generation
- Real-time suggestions during study sessions
- Multi-language support
- Chat export/sharing features
- Analytics on common questions

## Troubleshooting

**Chat not loading?**
- Check if user is authenticated
- Verify x-user-id header is sent
- Check browser console for errors

**Messages not saving?**
- Ensure Firebase Admin credentials are set
- Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
- Verify Firestore rules allow access

**No AI responses?**
- Check OPENAI_API_KEY is set
- Verify OpenAI API quota
- Check network requests in browser DevTools
