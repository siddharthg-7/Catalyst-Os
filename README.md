<div align="center">

# 🏛️ Civic Platform 
**Citizen Engagement & Smart Governance**

<p align="center">
  <img src="https://img.shields.io/badge/Status-Cloud--Operational-brightgreen?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Firebase-v12-orange?style=for-the-badge&logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/Vite-7-purple?style=for-the-badge&logo=vite" alt="Vite" />
</p>

*A modern, real-time citizen engagement application designed to bridge the gap between residents and their local municipalities. It empowers citizens to report local issues, propose community-driven projects, and participate in decision-making through a transparent voting system.*

</div>

<br />

## 🌟 Key Features

### 🙋‍♀️ Citizen Portal
* **Real-time Complaint Tracking**: Raise complaints (Roads, Water, Garbage, etc.) and monitor their status from "Pending" to "Resolved" with live updates.
* **Project Proposals**: Propose new local development ideas (zebra crossings, parks, street lights) to your community.
* **Community Polls**: Cast your vote on proposed projects in your neighborhood.
* **Personalized Dashboard**: Track your civic activities, statistics, and municipality announcements.

### 🏢 Admin Dashboard (Municipality View)
* **Centralized Complaint Management**: View all platform-wide complaints, filter by location or type, and update statuses in real-time.
* **User Insights**: Monitor active user registration and platform growth.
* **Transparent Decisions**: Log official actions based on community voting results.

<br />

## ⚙️ Technology Stack

| Technology | Description |
| :--- | :--- |
| **Frontend** | React 19, Vite, Vanilla CSS (Premium Custom Design). |
| **Backend-as-a-Service** | Firebase (Authentication, Firestore Database). |
| **State Management** | React Hooks (`useState`, `useEffect`) with real-time Firebase Snapshots. |
| **Real-time** | Firestore `onSnapshot` for live interactivity without page reloads. |

<br />

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* npm or yarn

### Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/siddharthg-7/civictechplatform-main.git
   cd civictechplatform-main
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start the development server**:
   ```bash
   npm run dev
   ```

<br />

## 🛠️ Configuration (Firebase Setup)

### Quick Setup
To use your own Firebase project, update `src/firebase.js` with your configuration:
1. Enable **Email/Password Authentication** in the Firebase Console.
2. Create a **Firestore Database** in **Test Mode**.
3. Add your config object:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

### 📚 Detailed Setup Guides
**Migrating to a new Firebase database?** See our comprehensive guides:
* 📄 **[Firebase Migration Guide](FIREBASE_MIGRATION_GUIDE.md)** - Complete step-by-step migration instructions
* ✅ **[Firebase Setup Checklist](FIREBASE_SETUP_CHECKLIST.md)** - Verification checklist for your setup
* 🔐 **[Admin Sign-In Reference](ADMIN_SIGNIN_REFERENCE.md)** - Admin credentials and permissions guide

### 👤 Admin Access
The platform includes three types of admin accounts:
1. **Regular Admins**: `codecrusaders62@gmail.com`, `siddharthexam21@gmail.com`
2. **Government Admin**: `government@gmail.com` (special role with enhanced permissions)

> **💡 Quick Government Login:**
> * Navigate to `/admin/login`
> * Click "Government Authority Login" button
> * Default credentials: `government@gmail.com` / `gdgc@123`
> 
> *For more details, see [ADMIN_SIGNIN_REFERENCE.md](ADMIN_SIGNIN_REFERENCE.md).*

<br />

## 📂 Project Structure

```text
src/
├── admin/               # Admin side pages and styling
├── assets/              # Icons and images
├── community/           # Polls, Propose Project, and Decision Logs
├── components/          # Shared components (Navbar, Sidebar)
├── pages/               # User core pages (Dashboard, Complaints, Auth)
├── styles/              # Global and modular CSS
└── firebase.js          # Core SDK configuration
```

<br />

## 💎 Premium Aesthetics
The platform features a **state-of-the-art design system** including:
* ✨ Glassmorphism effects in community polls.
* 🏷️ Dynamic color-coded status badges.
* 🌊 Smooth CSS animations and transitions for a fluid UX.
* 📱 Responsive grid layouts tailored for all devices.

<br />

## 📄 License
This project is licensed under the MIT License - see the `LICENSE` file for details.

<br />

<div align="center">
  <i>Developed with ❤️ for a smarter community.</i>
</div>
