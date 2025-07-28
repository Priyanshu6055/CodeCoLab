# 🧠 CodeCoLab - Real-time Collaborative Code Editor

CodeCoLab is a powerful and intuitive real-time collaborative coding platform that allows multiple users to edit code together, in sync. Built using modern web technologies, it’s designed for interviews, teaching, remote pair programming, and team collaboration.

---

## 🚀 Features

- 🔁 **Real-time Collaboration** — Code updates sync instantly across all connected users.
- 👥 **Multiple Users** — See who is online and where they are typing.
- 🎨 **User Highlighting** — Each user’s edits are color-coded.
- 🧠 **Awareness API Integration** — "User is typing" indicators and presence info.
- 🛠️ **Language-agnostic Editor** — Write code in any language using Monaco Editor.
- 📡 **WebSocket Server** — Powered by `y-websocket` and `Socket.IO` for efficient bi-directional sync.
- 🌐 **Frontend + Backend Architecture** — Cleanly separated for scalability.

---

## 🛠️ Tech Stack

| Layer      | Technology                         |
|------------|-------------------------------------|
| Frontend   | React, Tailwind CSS, Monaco Editor  |
| Backend    | Node.js, Express.js                 |
| Real-Time  | WebSocket, Socket.IO, Yjs, y-websocket |
| Hosting    | (Optional) Vercel / Heroku / Render |
| Versioning | Git + GitHub                        |

---


## 🛠️ Local Development Setup

Follow these instructions to run the project locally for development.

---

### 📦 Prerequisites

Make sure the following are installed:

- **Node.js** (v16 or higher)
- **npm** (v8 or higher)

---

### 🚀 Start Development Servers

> Open **three terminals** and run the following commands:

---

#### 🔹 Frontend

```bash
npm install
npm run start:front
```

#### 🔹 Backend

```bash
npm install
npm run server:dev
```


#### 🔹 Yjs WebSocket Server
Clone it first(Repo Link) - https://github.com/Priyanshu6055/yjs-websocket-server.git 

```bash
npm install
npm start
```
