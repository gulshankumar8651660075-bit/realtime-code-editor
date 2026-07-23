# Synapse IDE: Modules Built Manifest

This document lists all frontend and backend modules created during the build process, their file paths, technologies, and core operational responsibilities.

---

## 🖥️ Backend Modules (`backend/`)

| Module Name | File Location | Technology | Purpose & Responsibility |
| :--- | :--- | :--- | :--- |
| **Server Listener** | [server.ts](file:///d:/task%206/backend/src/server.ts) | TypeScript / Express | Entry point. Starts HTTP/Socket servers, configures global CORS permissions, mounts REST routes, and handles graceful connection terminations. |
| **Prisma Database Client** | [db.ts](file:///d:/task%206/backend/src/db.ts) | TypeScript / Prisma Client | Instantiates and exports a singleton client instance used for database operations across the app. |
| **Database Schema** | [schema.prisma](file:///d:/task%206/backend/prisma/schema.prisma) | Prisma DSL / SQLite | Database configuration. Declares User, Room, and Snippet tables, mapping relationships and index properties. |
| **JWT Middleware** | [auth.ts](file:///d:/task%206/backend/src/middleware/auth.ts) | TypeScript | Intercepts Express requests, reads the authorization bearer header, validates the signature, and injects authenticated user details. |
| **Auth APIs** | [auth.ts](file:///d:/task%206/backend/src/routes/auth.ts) | TypeScript / Express | Implements JWT token signatures, password hashes via `bcryptjs`, registration, login checks, and user session validation. |
| **Room CRUD APIs** | [room.ts](file:///d:/task%206/backend/src/routes/room.ts) | TypeScript / Express | Handles workspaces operations (create, join, list, delete). Auto-populates new rooms with boilerplate code templates. |
| **Code Runner API** | [execute.ts](file:///d:/task%206/backend/src/routes/execute.ts) | TypeScript / Express | REST endpoint receiver that executes user scripts on the sandbox runner and returns outputs. |
| **Socket & Yjs Sync Engine** | [socket.ts](file:///d:/task%206/backend/src/services/socket.ts) | TypeScript / Socket.io / Yjs | Performs real-time conflict-free collaborative sync. Tracks active users presence, cursor lines/columns, and broadcasts chat messages. |
| **Code Execution Sandbox** | [sandbox.ts](file:///d:/task%206/backend/src/services/sandbox.ts) | TypeScript / child_process / Docker | Ephemeral workspace manager. Runs code in containers with resource quotas, or locally with 8-second sub-process force-kill limits. |
| **Session Cache Service** | [cache.ts](file:///d:/task%206/backend/src/services/cache.ts) | TypeScript / Redis | Key-value store helper supporting custom TTLs. Automatically falls back to an in-memory Map structure if Redis is offline. |
| **Docker Configuration** | [Dockerfile](file:///d:/task%206/backend/Dockerfile) | Dockerfile | Configures Alpine Node builds pre-installed with `g++`, `go`, and `python3` for 24/7 serverless sandboxed runtimes. |
| **Integrity Sandbox Tester** | [test-sandbox.ts](file:///d:/task%206/backend/test-sandbox.ts) | TypeScript / runner tests | Test harness to verify JavaScript and Python compilation, stdout capturing, and infinite loop terminations. |

---

## 🎨 Frontend Modules (`frontend/`)

| Module Name | File Location | Technology | Purpose & Responsibility |
| :--- | :--- | :--- | :--- |
| **CSS Core Theme** | [globals.css](file:///d:/task%206/frontend/src/app/globals.css) | Tailwind CSS v4 | Sets up the custom dark-red theme color tokens, scrollbars, selection shades, glassmorphism templates, and cursor animations. |
| **Document Layout** | [layout.tsx](file:///d:/task%206/frontend/src/app/layout.tsx) | Next.js App Router | Applies page structures, title attributes, meta descriptions for SEO, and imports the Outfit font family from Google Fonts. |
| **API Client Connector** | [api.ts](file:///d:/task%206/frontend/src/utils/api.ts) | TypeScript | Integrates fetch handlers. Injects JWT headers from localStorage, resolves backend root variables, and outputs network details. |
| **Auth Screen Portal** | [page.tsx](file:///d:/task%206/frontend/src/app/page.tsx) | Next.js / React Client | The landing page featuring toggles for Login and Signup, custom form inputs, validation loaders, and redirect routing. |
| **Developer Dashboard** | [page.tsx](file:///d:/task%206/frontend/src/app/dashboard/page.tsx) | Next.js / React Client | Manage workspaces. Provides buttons to copy invite IDs, delete rooms, load languages, and display list cards. |
| **Real-time IDE Room** | [page.tsx](file:///d:/task%206/frontend/src/app/room/[roomId]/page.tsx) | Next.js / React Client / Monaco | Primary collaborative workspace. Synchronizes Monaco edits with Yjs binary vectors, displays user lists, executes compiler requests, and runs text chat rooms. |
