# Synapse IDE: System Architecture Overview

This document provides a technical breakdown of the architecture powering the Synapse Real-Time Collaborative Code Editor & Sandbox Execution Engine.

---

## 🗺️ System Topology Diagram

Below is the execution flow and communication layout between clients, the synchronization server, and the compiler sandboxes:

```mermaid
sequenceDiagram
    autonumber
    actor Client A as Developer A (Next.js / Monaco)
    actor Client B as Developer B (Next.js / Monaco)
    participant Server as Sync Server (Node.js / Socket.io)
    participant Database as Database (Prisma / SQLite)
    participant Sandbox as Sandbox (Docker / ChildProcess)

    Note over Client A, Client B: Step 1: Real-Time Editing (CRDTs)
    Client A->>Server: Emit yjs-update (binary change vector)
    Server->>Server: Apply update to in-memory Y.Doc
    Server-->>Client B: Broadcast yjs-update (updates editor view)
    Note over Server: Debounce auto-saves to DB (2 seconds idle)
    Server->>Database: Upsert snippet content

    Note over Client A, Sandbox: Step 2: Sandboxed Execution
    Client A->>Server: Click "Run Code" -> POST /api/execute
    Server->>Server: Auto-detect Docker host
    alt Docker is available
        Server->>Sandbox: Spin up container (node/python/gcc) with 128MB RAM limit
    else Docker is unavailable (Local Fallback)
        Server->>Sandbox: Spawn isolated child_process with 8s force-kill timeout
    end
    Sandbox-->>Server: Return stdout, stderr, & run stats
    Server-->>Client A: Respond with execution payload
```

---

## 🛠️ Component Breakdown

### 1. The Frontend (Client-side)
* **Next.js & Tailwind CSS v4:** Structured with dynamic components, responsive sidebars, terminal console screens, and visual status alerts.
* **Monaco Editor (`@monaco-editor/react`):** Embedded web code editor providing syntax highlighting, brackets matching, and lint markers.
* **Yjs Document Sync Binder:** A custom sync script mapping Monaco character operations to Yjs binary updates and applying remote changes using Monaco's `setValue` and `restoreViewState` API (eliminating text jumps).

### 2. The Synchronization Backend (Server-side)
* **Express & Socket.io:** Acts as the primary WebSocket server. Express handles REST routes (`/api/auth`, `/api/room`, `/api/execute`) while Socket.io maintains room namespaces.
* **In-Memory Yjs Documents:** Keeps active collaborative rooms cached in memory for zero-lag merging of cursor edits.
* **Debounced Auto-Save:** Keystroke updates from clients are written to an in-memory document. To avoid overloading the database, a 2-second debounce timer writes the text representation back to the database only when developers pause typing.

### 3. The Execution Sandbox
* **Isolation Layer:** When a client triggers code execution, the server spins up a sandboxed runtime.
* **Docker Container Execution (Primary):** Executes code inside language-specific micro alpine-images (`node:18-alpine`, `python:3.10-alpine`, `gcc:12-alpine`, `golang:1.20-alpine`) using restricted container constraints:
  * `--memory=128m` (RAM limit to prevent heap overflow attacks)
  * `--cpus=0.5` (CPU quota limit to prevent CPU thread starvation)
* **Isolated Child Process Execution (Fallback):** Spawns child shells with hard process-group kill controls. Infinite loops (like `while True: pass`) are caught and terminated after exactly 8 seconds.

### 4. Database Schema (Prisma ORM)
Using a lightweight relational layout (running on SQLite for local development and PostgreSQL in production):

| Table | Primary Keys / Foreign Keys | Fields | Relationships |
| :--- | :--- | :--- | :--- |
| **`User`** | `id` (UUID) | `username` (Unique), `email` (Unique), `password_hash`, `created_at` | One-to-Many with `Room` (Owner) |
| **`Room`** | `id` (UUID), `owner_id` (FK) | `room_name`, `created_at` | Many-to-One with `User` (Owner), One-to-Many with `Snippet` |
| **`Snippet`** | `id` (UUID), `room_id` (FK) | `content` (TEXT), `language`, `updated_at` | Many-to-One with `Room` |
