# AI Study Buddy

A responsive study workspace for turning text-based PDFs into summaries, AI Q&A, quizzes, and flashcards. Quiz and flashcard activity is saved in the browser and can sync to Firestore.

## Requirements

- Node.js 20 or newer
- A Firebase project with Email/Password Authentication and Cloud Firestore enabled
- An OpenAI API key for AI features

## Configure Firebase

1. In Firebase Console, create a Web App and enable **Authentication → Sign-in method → Email/Password**.
2. Copy the web app configuration into `js/firebase-config.js`, replacing each `PASTE_…_HERE` value.
3. Create a Cloud Firestore database and publish the included `firestore.rules` rules.
4. Create a Firebase Admin SDK service-account key for server-side ID-token verification. Save it as `service-account.json` in the project root. Keep it private; it is excluded from Git.

The web configuration is safe to include in the frontend. The service-account key and OpenAI key are secrets and must stay server-side.

## Configure the server

Copy `.env.example` to `.env` and set:

```dotenv
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
PORT=3000
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json
```

AI endpoints require a signed-in Firebase user and a valid ID token. The server rejects AI requests when Firebase Admin is not configured; it does not accept unverified tokens.

## Run locally

```powershell
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). Serve the project through this Express server; opening the HTML files directly from disk will prevent module imports and API requests from working.

For development with automatic server restarts, run `npm run dev`.

## Features

- Email/password sign-up, sign-in, and password reset through Firebase Auth
- Per-user Firestore profile, study-material metadata, quiz scores, and flashcard review progress
- PDF text extraction in memory (maximum 20 MB and 200 pages); scanned/image-only PDFs need OCR and are not supported
- AI-generated study guides, note-based Q&A, quizzes, flashcards, and concept lists
- Local browser history for quiz and flashcard activity
- Responsive landing page and study dashboard

The uploaded PDF is processed in memory and is not stored by this app. The browser stores the extracted study guide locally so it can be used by the study tools. Do not upload material you are not allowed to share with the configured AI provider.

## Project layout

- `server.js` — Express API, PDF parsing, OpenAI requests, Firebase Admin verification, static hosting
- `index.html`, `style.css`, `script.js` — public landing page
- `pages/` — sign-in and study workspace pages
- `js/` — Firebase integration and page features
- `firestore.rules` — per-user Firestore access rules
- `.env.example` — server configuration template
