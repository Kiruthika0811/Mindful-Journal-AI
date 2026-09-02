# Mindful Journal AI

A secure, user-authenticated journaling web application built with React, Tailwind CSS, Google Cloud Firestore, Firebase Authentication, and the Gemini API (`gemini-3.7-flash`).

---

## 🛡️ Security Architecture & Threat Model

1. **User Identity & Passwordless Authentication**: Outsources credentials entirely to Firebase Authentication via Google Sign-In. No emails, hashes, or passwords are ever stored or processed in application code.
2. **Server-Side AI Mediation**: All Gemini model requests are routed via server-side endpoints (`/api/*`). The `GEMINI_API_KEY` is securely stored in Google Secret Manager and is never transmitted to client browsers.
3. **Strict Firestore Data Isolation**: Per-user subcollections (`users/{userId}/entries/{entryId}`) are protected by declarative Firestore Security Rules enforcing `request.auth.uid == userId`.
4. **Resilient Model Fallback Ladder**: Backend AI endpoints automatically step through `gemini-3.7-flash` &rarr; `gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` during transient provider congestion.

---

## 📋 Prerequisites & Environment Setup

### 1. Enable Required Google Cloud APIs
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudscheduler.googleapis.com
```

### 2. Configure Secret Manager for Gemini API Key
```bash
# Create the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Add the secret version with your Gemini API Key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant Cloud Run runtime service account permission to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🔒 Firestore Security Rules

Deploy the following owner-bound rules in `firestore.rules` or via the Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User root profile document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Per-user isolated journal entries subcollection
    match /users/{userId}/entries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Per-user isolated weekly AI digests subcollection
    match /users/{userId}/digests/{digestId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🚀 Cloud Run Deployment Flow

### 1. Build and Deploy Service
```bash
gcloud run deploy mindful-journal-ai \
  --source . \
  --region asia-east1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port 3000
```

### 2. Apply Mandatory Campaign Verification Label
```bash
gcloud run services update mindful-journal-ai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=asia-east1
```

---

## 🧪 Comprehensive Walkthrough & Functional Test Cases

The following test cases describe every user-triggerable interaction and verification step:

### Test Suite 1: Authentication & Navigation
- **TC-1.1: Landing Page & Unauthenticated State**
  - *Action*: Open the app while unauthenticated.
  - *Expected Result*: Landing page renders with security highlights, features overview, and the "Sign In with Google" button. Dashboard tabs are hidden.
- **TC-1.2: Google Sign-In**
  - *Action*: Click "Sign In with Google".
  - *Expected Result*: Google OAuth popup opens; upon selecting account, auth state changes to authenticated, top navbar renders with user profile avatar, streak counter, and view switcher.
- **TC-1.3: Google Sign-Out**
  - *Action*: Click the Sign Out icon in the navbar.
  - *Expected Result*: User session is cleared, Firestore listeners unsubscribe, and app returns cleanly to the landing page.

### Test Suite 2: Journal Composition & Voice Input
- **TC-2.1: Text Input & Title**
  - *Action*: Enter title and body text in the reflection composer.
  - *Expected Result*: Live word counter updates; save state moves from idle to saving to saved in Firestore.
- **TC-2.2: Mood Tagging**
  - *Action*: Click on a mood pill (e.g., "😊 Grateful", "🧘 Peaceful", "⚡ Energetic").
  - *Expected Result*: Selected mood is highlighted with ring styling and tagged on the entry.
- **TC-2.3: Custom Tag Management**
  - *Action*: Type a tag into `+ Add tag` and press Enter, or click quick tag chips.
  - *Expected Result*: Tag chips appear; clicking '×' removes the tag.
- **TC-2.4: Voice-to-Text Dictation (Web Speech API)**
  - *Action*: Click the microphone button.
  - *Expected Result*: Button pulses in listening mode; spoken speech is transcribed in real-time and appended to the reflection textarea.
- **TC-2.5: Prompt Library Drawer**
  - *Action*: Click "Prompt Library".
  - *Expected Result*: Modal opens showing categorized prompts ("Gratitude & Wins", "Navigating Challenges", etc.). Clicking "Generate AI Prompts" fetches custom prompt suggestions from `/api/prompt-library`. Selecting a prompt inserts it into the composer.

### Test Suite 3: Gemini AI Reflection & Multi-Turn Chat
- **TC-3.1: AI Reflection Generation**
  - *Action*: Write an entry and click "Converse & Reflect with Gemini".
  - *Expected Result*: UI shows thinking state, invokes `/api/chat` with model fallback ladder (`gemini-3.7-flash` &rarr; `gemini-3.6-flash`), and renders empathetic reflection with follow-up deepening questions.
- **TC-3.2: Multi-Turn Conversation Thread**
  - *Action*: Type a follow-up reply in the chat input and click send.
  - *Expected Result*: Message is appended to the thread; Gemini responds in context. All messages are automatically persisted to Firestore under `users/{userId}/entries/{entryId}`.
- **TC-3.3: AI Synthesis & Mindful Takeaway**
  - *Action*: After reflection generation, review the top Insights card.
  - *Expected Result*: Structured summary, core themes, and actionable takeaway quotes are rendered and saved.

### Test Suite 4: History, Search & Filtering
- **TC-4.1: Keyword Search**
  - *Action*: Navigate to "History & Search" and type a keyword in the search bar.
  - *Expected Result*: Entry list filters in real-time by matching titles, content, summaries, tags, and conversation replies.
- **TC-4.2: Mood and Tag Filters**
  - *Action*: Click a mood pill or tag in the filter bar.
  - *Expected Result*: List updates immediately to show only matching reflections.
- **TC-4.3: Date Range Filter**
  - *Action*: Select "Today", "7 Days", "30 Days", or "All Time".
  - *Expected Result*: Only reflections within the specified time window are displayed.
- **TC-4.4: Entry Selection & Continuation**
  - *Action*: Click any past entry card.
  - *Expected Result*: Opens the entry in the composer with full text, selected mood, tags, and previous Gemini chat history ready for continuation.
- **TC-4.5: Deletion**
  - *Action*: Click the trash can icon on an entry card and confirm prompt.
  - *Expected Result*: Document is deleted from Firestore and disappears from the UI immediately.

### Test Suite 5: Weekly AI Digest & Cloud Scheduler Simulation
- **TC-5.1: Weekly Digest Generation**
  - *Action*: Navigate to "Weekly AI Digest" and click "Generate Weekly Digest".
  - *Expected Result*: Invokes `/api/weekly-digest`, analyzes recent entries, generates weekly headline, thematic breakdown, mood trajectory, celebrations, and upcoming mindful inquiries, and saves it to Firestore `users/{userId}/digests`.
- **TC-5.2: Digest Timeline & Archive**
  - *Action*: Click on any saved digest in the archive sidebar.
  - *Expected Result*: Displays full synthesis, themes, and recommended focus.

### Test Suite 6: Export & Consistency Tracking
- **TC-6.1: Markdown (.md) Export**
  - *Action*: Click "Export" on an entry, select "Markdown", and click Download.
  - *Expected Result*: Downloads formatted `.md` file containing date, mood, tags, reflection text, AI summary, and multi-turn chat log.
- **TC-6.2: PDF Document Export**
  - *Action*: Click "Export", choose "Document (PDF)", and click Download.
  - *Expected Result*: Clean, paginated PDF with header banner, tags, summary, takeaway, and chat dialogue is generated and downloaded.
- **TC-6.3: Streak & Consistency Tracker**
  - *Action*: Navigate to "Insights & Streak".
  - *Expected Result*: Displays current streak, best streak, total entries count, total words written, 30-day activity heatmap grid, and emotional mood breakdown bar chart.
