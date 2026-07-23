# Project Walkthrough: Synapse Collaborative IDE

We have implemented a production-grade, high-fidelity real-time collaborative code editor and sandboxed code execution engine.

To respect your color design preferences, the UI is styled with a custom **dark-red cyberpunk theme** using Tailwind CSS v4, custom scrollbars, and neon glow effects.

---

## 🚀 How to Run Locally

### 1. Database Setup (Prisma)
Ensure you have a PostgreSQL database instance running, or configure a remote database URL.
Open `backend/.env` and update the connection string:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/collab_db?schema=public"
```

Then run the database migrations inside the `backend` folder:
```bash
cd backend
npx prisma migrate dev --name init
```

*Note: For testing the app without PostgreSQL, Prisma is already generated, meaning the Node server will boot up as long as it connects to your specified URL, or you can switch `schema.prisma`'s provider to `"sqlite"` and use `file:./dev.db` if you want local file-only database storage.*

### 2. Run Sandbox Validation Tests
We created a test script to verify compilation:
```bash
cd backend
npx ts-node test-sandbox.ts
```
This runs Javascript and Python scripts and ensures that infinite loops time out gracefully rather than blocking the server.

### 3. Run Backend (Express + Sockets + Yjs)
Start the Express server on port 5000:
```bash
cd backend
npm run dev
```

### 4. Run Frontend (Next.js)
Start the Next.js development server on port 3000:
```bash
cd frontend
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## ⚡ Real-Time Collaborative Demo (Multi-Cursor & Sync)
1. Open `http://localhost:3000` in your browser.
2. Sign up as `User_A`.
3. In the dashboard, create a new room (e.g. "C++ Workspace", language: C++).
4. Copy the Room ID or full URL from the **Invite** button.
5. Open an Incognito window or another browser tab and sign up as `User_B`.
6. Enter/paste the Room ID to join the room.
7. Type simultaneously:
   - Notice that character typing merges conflict-free in real-time (powered by Yjs CRDTs).
   - See active cursors highlighting with username tags and custom colors.
   - Send chat messages in the right sidebar.
   - Click **Run Code** to compile the script in the terminal console.

---

## 🌐 24/7 Production Deployment Guide

Here is the exact recipe to deploy this project for **free** and keep it running **24/7**:

### 1. Deploy Backend (Node.js + WebSockets)
Since Vercel uses serverless functions that do not support WebSockets (Socket.io) or containerized running, we host the backend on a server provider.

#### Option A: Deploy to Railway (Uptime 24/7)
1. Go to [Railway.app](https://railway.app) and sign in.
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository and choose the `backend` directory.
4. Railway will auto-detect the `backend/Dockerfile`. It will build and provision the container.
5. In Railway settings, click **Generate Domain** to get a public URL (e.g., `https://your-backend.up.railway.app`).
6. Set the Environment Variables:
   - `DATABASE_URL`: (Connection string to your PostgreSQL)
   - `JWT_SECRET`: (A secure random string)
   - `REDIS_URL`: (Optional, falls back to memory cache automatically)

#### Option B: Deploy to Render (Free + UptimeRobot Ping)
1. Go to [Render.com](https://render.com) and create a **Web Service**.
2. Select your repository, configure the build path to `backend/` and runtime to `Docker`.
3. Put the environment variables in Render's configuration dashboard.
4. To prevent Render's free tier from sleeping after 15 minutes of inactivity:
   - Go to [UptimeRobot](https://uptimerobot.com) (free account).
   - Create a new **HTTP Monitor** pointing to your backend health URL: `https://your-backend.onrender.com/health`.
   - Set the monitor interval to **5 minutes**.
   - This keeps your Render container awake 24/7 for free!

---

### 2. Deploy Frontend (Next.js to Vercel)
Vercel is the native host for Next.js, and runs 24/7 automatically.

1. Go to [Vercel.com](https://vercel.com) and sign in.
2. Click **Add New** -> **Project** and select your repository.
3. In the project setup, set the **Root Directory** to `frontend`.
4. In **Environment Variables**, add:
   - `NEXT_PUBLIC_BACKEND_URL`: `https://your-backend.up.railway.app` (The URL of your deployed backend).
5. Click **Deploy**.
6. Vercel will build your Next.js application and give you a permanent URL!
