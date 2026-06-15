# 🐢 Pawi: AI-Powered Financial Tracker

![Pawi Mascot](mobile_app/public/pawikan-logo.png)

Pawi is a beautiful, comprehensive, offline-first personal finance tracker designed to help you save smarter, slow and steady. Built with a modern tech stack, Pawi features an interactive AI assistant (powered by Google Gemini), intelligent budgeting, multi-wallet tracking, and seamless cross-device synchronization.

## 🚀 Live Demos
* **Mobile Web App (Next.js):** [https://pawi-finance.vercel.app](https://pawi-finance.vercel.app)
* **Static Dashboard (HTML/JS):** [https://pawi-budget-tracker.web.app](https://pawi-budget-tracker.web.app)

---

## ✨ Key Features
* **💬 Pawi AI Assistant:** Chat naturally with Pawi (powered by Gemini) to analyze your spending, get financial advice, and parse natural language into transactions (e.g., "I just spent $12 on lunch at McDonald's").
* **📊 Comprehensive Dashboard:** Instantly visualize your net worth, recent transactions, and wallet balances in a stunning interface.
* **💳 Multi-Wallet Management:** Track Cash, GCash, PayMaya, Bank Accounts, and more—all from one place.
* **🎯 Goal Tracking & Planning:** Set financial goals, stick to budgets, and let Pawi help you achieve financial freedom.
* **🔐 Secure Authentication:** Seamless Google Sign-In and Email authentication powered by Firebase.
* **📶 Offline-First Architecture:** Your data is cached locally via IndexedDB and syncs to the cloud automatically when you reconnect.

---

## 🛠️ Tech Stack

### Mobile App Architecture (Next.js)
* **Framework:** Next.js 14 (React)
* **Styling:** Tailwind CSS + Shadcn UI
* **Database & Auth:** Firebase (Firestore, Authentication)
* **AI Integration:** Google Gemini Pro API
* **Deployment:** Vercel

### Website / Static Architecture
* **Frontend:** Vanilla HTML, CSS, JavaScript
* **Database & Auth:** Firebase
* **Local Storage:** IndexedDB (for robust offline functionality)
* **Deployment:** Firebase Hosting

---

## ⚙️ Getting Started (Running Locally)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/pawi-financial-tracker.git
cd pawi-financial-tracker
```

### 2. Setup the Next.js Mobile App
```bash
cd mobile_app
npm install
```

### 3. Environment Variables
Create a `.env.local` file inside the `mobile_app` folder and add your API keys:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🎨 Design Philosophy
Pawi was built with a "mobile-first" approach, focusing heavily on gorgeous, smooth UI/UX. The vibrant green aesthetic and glassmorphism elements create a premium, gamified feel to personal finance, making tracking expenses something users actually look forward to.

*Save smarter, slow and steady.* 🐢
