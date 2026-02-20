# 🧠 CodeCoLab v2.0.0 — Real-time Collaborative Code Editor

CodeCoLab is a powerful real-time collaborative coding platform that allows multiple users to edit code together, in sync. Built for interviews, teaching, remote pair programming, and team collaboration.

> **Live Demo:** Deploy to [Render](https://codecolab-08ca.onrender.com/) or run locally — see setup below.

---

## ✨ Features

### 🔁 Real-time Collaboration
- **Live code sync** — edits appear instantly across all connected users via [Yjs](https://yjs.dev) CRDT
- **Multi-user rooms** — create or join rooms with unique IDs
- **Typing indicators** — see who is actively typing

### 🎯 Live Cursor Awareness
- **Remote cursors** — see other users' cursor positions with colored markers
- **Name tags** — floating username labels above each remote cursor
- **Selection highlighting** — see what other users have selected
- **Throttled updates** — 50ms throttle for smooth, flicker-free rendering

### 🎙️ Voice Chat
- **Real-time audio** — voice communication with other users in the room
- **Mute/Unmute** — toggle microphone status easily
- **Visual indicators** — see who is speaking with glowing avatars
- **Room-based** — voice channels are scoped to the current room

### 🔐 JWT Authentication
- **Register / Login** — secure auth with bcrypt password hashing
- **Protected routes** — editor and home pages require login
- **Refresh-safe sessions** — JWT stored in localStorage, verified on app load
- **Auto-populated username** — logged-in username used for rooms automatically

### 💾 Save & Load Projects
- **Save As** — save current code with title + language to MongoDB
- **Quick Save** — one-click save to update existing project
- **Load** — browse and load any saved project from a modal
- **Auto-save** — toggle auto-save (every 15 seconds)
- **My Projects page** — grid view of all saved projects with Open/Delete

### ▶ Code Runner (JavaScript)
- **Sandboxed execution** — runs JS safely in an iframe (`sandbox="allow-scripts"`)
- **Console capture** — captures `console.log`, `console.warn`, `console.error`, `console.info`
- **Colored output** — errors in red, warnings in yellow, info in purple
- **10-second timeout** — infinite loops won't freeze the UI
- **Toggle panel** — show/hide console from sidebar

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 17, Monaco Editor, React Router v6 |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Real-Time Sync | Yjs, y-websocket, y-monaco |
| Signaling | Socket.IO (room join/leave events) |
| Voice Chat | WebRTC (Peer-to-Peer Audio) |
| Hosting | Render (or any Node.js host) |

---

## 📁 Project Structure

```
CodeCoLab/
├── package.json                        # Root orchestrator (scripts only)
├── .env                                # Server env vars
├── .gitignore
├── README.md
│
├── server/                             # Express backend
│   ├── package.json
│   ├── index.js                        # Entry point (Express + Socket.IO)
│   ├── config/
│   │   └── db.js                       # MongoDB connection
│   ├── constants/
│   │   └── Actions.js                  # Socket event constants
│   ├── controllers/
│   │   ├── authController.js
│   │   └── projectController.js
│   ├── middleware/
│   │   └── auth.js                     # JWT verification
│   ├── models/
│   │   ├── User.js
│   │   └── Project.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── projects.js
│   ├── socket/
│   │   └── socketHandler.js            # All Socket.IO + voice logic
│   └── utils/
│
├── client/                             # React frontend (CRA)
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js                      # Routes + AuthProvider
│       ├── App.css                     # All styles
│       ├── constants/
│       │   └── Actions.js              # Socket event constants (ESM)
│       ├── socket/
│       │   └── socket.js               # Socket.IO client init
│       ├── context/
│       │   └── AuthContext.js
│       ├── services/
│       │   └── projects.js             # Projects API helper
│       ├── hooks/
│       │   └── useLiveAwareness.js
│       ├── pages/
│       │   ├── Home.js
│       │   ├── EditorPage.js
│       │   ├── Projects.js
│       │   ├── Login.js
│       │   └── Signup.js
│       ├── components/
│       │   ├── CollaborativeEditor.js
│       │   ├── Client.js
│       │   ├── PrivateRoute.js
│       │   ├── ActiveUsers.js
│       │   ├── TypingIndicator.js
│       │   ├── LiveActivityIndicator.js
│       │   ├── CodeRunner/
│       │   │   ├── RunnerPanel.js
│       │   │   └── useRunner.js
│       │   └── VoiceChat/
│       │       ├── VoicePanel.js
│       │       └── useVoiceChat.js
│       └── utils/
│           └── getUserColor.js
```

---

## ⚙️ Environment Setup

### Prerequisites

- **Node.js** v16+ ([download](https://nodejs.org))
- **npm** v8+
- **MongoDB** running locally or a [MongoDB Atlas](https://www.mongodb.com/atlas) connection string

### 1. Clone the Repository

```bash
git clone https://github.com/Priyanshu6055/CodeCoLab.git
cd CodeCoLab
```

### 2. Install Dependencies

```bash
npm install          # installs concurrently (root)
npm run install:all  # installs server + client deps
```

### 3. Create `.env` File

Create a `.env` file in the project root:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/codecolab
JWT_SECRET=your_super_secret_key_here
```

> **Note:** For MongoDB Atlas, replace `MONGO_URI` with your Atlas connection string.

### 4. Start the Yjs WebSocket Server

The Yjs sync server runs separately. Clone and start it:

```bash
git clone https://github.com/Priyanshu6055/yjs-websocket-server.git
cd yjs-websocket-server
npm install
npm start
```

> This runs the Yjs WebSocket server that handles real-time document sync.  
> The production version is deployed at `wss://yjs-websocket-server-wuwh.onrender.com`.

---

## 🚀 Start Commands

From the project root:

### Development (concurrent server + client)

```bash
npm run dev
```

> Starts Express on `http://localhost:5000` and React on `http://localhost:3000` simultaneously.

### All Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start server + client concurrently |
| `npm run server` | Start backend only (nodemon) |
| `npm run client` | Start React dev server only |
| `npm run build` | Build React for production |
| `npm start` | Start production server (serves client build) |
| `npm run install:all` | Install server + client deps |

---

## 🔌 API Routes

### Auth — `/api/auth`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Create account | ❌ |
| POST | `/api/auth/login` | Login, get JWT | ❌ |
| GET | `/api/auth/me` | Get current user | ✅ |

### Projects — `/api/projects`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/projects` | Create project | ✅ |
| GET | `/api/projects` | List all user projects | ✅ |
| GET | `/api/projects/:id` | Get project with code | ✅ |
| PUT | `/api/projects/:id` | Update project | ✅ |
| DELETE | `/api/projects/:id` | Delete project | ✅ |

> **Auth:** Pass `Authorization: Bearer <token>` header.

---

## 🧪 How to Test

### 1. Auth Flow

1. Open `http://localhost:3000` → redirects to `/login`
2. Click **Sign Up** → create account with username, email, password
3. Log in → should redirect to Home page
4. Refresh the page → should stay logged in (JWT verified)
5. Click **Logout** → should redirect to login

### 2. Room Collaboration

1. On Home page, click **Create New Room** → copies Room ID
2. Open a **second browser tab** (or incognito window)
3. Log in as a different user → paste the Room ID → click **Join**
4. Type in one tab → text should appear in the other tab instantly

### 3. Live Cursors

1. With two users in the same room:
2. Move cursor in Tab A → Tab B shows a **colored cursor marker** + **username label**
3. Select text in Tab A → Tab B shows the **highlighted selection**
4. Close Tab A → cursor/label should disappear from Tab B

### 4. Save & Load Projects

1. In the editor, write some code
2. Click **Save As** → enter title + choose language → Save
3. Click **Load** → should show your saved project in the list
4. Navigate to **My Projects** from Home page → project appears as a card
5. Click **Open** → loads back into editor with your saved code
6. Toggle **Auto-save** → check browser console for "Auto-saved at..." logs every 15s

### 5. Code Runner

1. In the editor, write: `console.log("Hello, CodeCoLab!")`
2. Click **▶ Console** in the sidebar → panel opens at bottom
3. Click **▶ Run** → should show: `› Hello, CodeCoLab!` + `✅ Finished (Xms)`
4. Write `throw new Error("test")` → Run → should show red error
5. Write `while(true) {}` → Run → should timeout after 10s
6. Click **🗑 Clear** → output cleared
7. Click **⌨ Hide Console** → panel closes

---

## 🚢 Production Deployment

### Build

```bash
npm run build
```

### Deploy to Render

1. Push code to GitHub
2. Create a new **Web Service** on [Render](https://render.com)
3. Set **Build Command:** `npm run install:all && npm run build`
4. Set **Start Command:** `npm start`
5. Add environment variables: `MONGO_URI`, `JWT_SECRET`, `PORT`
6. Deploy!

### Environment Variables (Production)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for JWT signing (use a strong random string) |

---

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| `MongoDB connection failed` | Make sure MongoDB is running locally or your Atlas URI is correct |
| `Cannot connect to Yjs server` | Start the Yjs WebSocket server separately or check the deployed URL |
| `401 Unauthorized` | Token expired — log out and log back in |
| `CORS error on API call` | The frontend proxy is configured for `localhost:5000` in development |
| `Code runner shows no output` | Make sure you have `console.log()` statements in your code |
| `Auto-save checkbox disabled` | Save the project first (creates a project ID to auto-save to) |


---

**Built with ❤️ by [Priyanshu](https://github.com/Priyanshu6055)**
