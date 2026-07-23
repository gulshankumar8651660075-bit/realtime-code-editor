import { Server, Socket } from 'socket.io';
import * as Y from 'yjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../db';

interface UserPresence {
  socketId: string;
  username: string;
  color: string;
  cursor: {
    lineNumber: number;
    column: number;
  } | null;
}

// In-memory store of active Yjs Docs, key is roomId
const activeDocs = new Map<string, Y.Doc>();
// In-memory store of active users, key is roomId -> list of users
const activeUsers = new Map<string, Map<string, UserPresence>>();
// Debounce timers for database saving, key is roomId
const saveTimers = new Map<string, NodeJS.Timeout>();

// Helper to assign a random bright color for cursor highlights
const CURSOR_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#22c55e', // Green
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#06b6d4', // Sky
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
  '#f43f5e', // Rose
];

function getRandomColor() {
  return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
}

export function setupSocketIO(io: Server) {
  io.on('connection', (socket: Socket) => {
    let currentRoomId: string | null = null;
    let username: string | null = null;

    // Join a room
    socket.on('join-room', async ({ roomId, user }: { roomId: string; user: { username: string } }) => {
      currentRoomId = roomId;
      username = user.username;
      socket.join(roomId);

      // 1. Initialize or retrieve Yjs Doc for the room
      let doc = activeDocs.get(roomId);
      if (!doc) {
        doc = new Y.Doc();
        activeDocs.set(roomId, doc);

        // Load content from Database
        try {
          const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: { snippets: { orderBy: { updated_at: 'desc' }, take: 1 } },
          });

          const latestSnippet = room?.snippets[0];
          if (latestSnippet) {
            const ytext = doc.getText('monaco');
            ytext.insert(0, latestSnippet.content);
          }
        } catch (err) {
          console.error(`Error loading snippet from DB for room ${roomId}:`, err);
        }
      }

      // 2. Add user to presence list
      if (!activeUsers.has(roomId)) {
        activeUsers.set(roomId, new Map());
      }
      const roomUsers = activeUsers.get(roomId)!;
      const userPresence: UserPresence = {
        socketId: socket.id,
        username: username,
        color: getRandomColor(),
        cursor: null,
      };
      roomUsers.set(socket.id, userPresence);

      // Send current Yjs state update to the new user
      const stateUpdate = Y.encodeStateAsUpdate(doc);
      socket.emit('yjs-init', Buffer.from(stateUpdate));

      // Broadcast updated user presence list to room
      io.to(roomId).emit('presence-update', Array.from(roomUsers.values()));

      console.log(`User ${username} connected to room ${roomId}`);
    });

    // Handle Yjs document updates
    socket.on('yjs-update', (updateBuffer: Buffer) => {
      if (!currentRoomId) return;

      const doc = activeDocs.get(currentRoomId);
      if (doc) {
        try {
          // Apply binary update locally to Yjs document on server
          Y.applyUpdate(doc, new Uint8Array(updateBuffer));

          // Broadcast change to all other users in the room
          socket.to(currentRoomId).emit('yjs-update', updateBuffer);

          // Debounced save to Database
          triggerDatabaseSave(currentRoomId, doc);
        } catch (err) {
          console.error(`Error applying Yjs update in room ${currentRoomId}:`, err);
        }
      }
    });

    // Handle Cursor/Selection movements (Awareness)
    socket.on('cursor-move', (cursor: { lineNumber: number; column: number } | null) => {
      if (!currentRoomId) return;

      const roomUsers = activeUsers.get(currentRoomId);
      if (roomUsers) {
        const userPresence = roomUsers.get(socket.id);
        if (userPresence) {
          userPresence.cursor = cursor;
          // Broadcast cursor presence update
          socket.to(currentRoomId).emit('presence-update', Array.from(roomUsers.values()));
        }
      }
    });

    // Handle Text Chat Messaging
    socket.on('chat-message', (messageText: string) => {
      if (!currentRoomId || !username) return;

      io.to(currentRoomId).emit('chat-message', {
        id: uuidv4(),
        sender: username,
        text: messageText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      const roomId = currentRoomId;
      if (!roomId) return;

      const roomUsers = activeUsers.get(roomId);
      if (roomUsers) {
        roomUsers.delete(socket.id);
        
        // Notify others
        socket.to(roomId).emit('presence-update', Array.from(roomUsers.values()));

        // Clean up memory if room is empty
        if (roomUsers.size === 0) {
          activeUsers.delete(roomId);
          
          // Force save and remove document from memory
          const doc = activeDocs.get(roomId);
          if (doc) {
            forceSaveToDatabase(roomId, doc).then(() => {
              activeDocs.delete(roomId);
              console.log(`Room ${roomId} is empty. Cleaned up Yjs document from memory.`);
            });
          }

          // Clear database saving timer
          const timer = saveTimers.get(roomId);
          if (timer) {
            clearTimeout(timer);
            saveTimers.delete(roomId);
          }
        }
      }
      console.log(`User ${username} disconnected`);
    });
  });
}

// Debounce database saving
function triggerDatabaseSave(roomId: string, doc: Y.Doc) {
  const existingTimer = saveTimers.get(roomId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const newTimer = setTimeout(async () => {
    await forceSaveToDatabase(roomId, doc);
    saveTimers.delete(roomId);
  }, 2000); // Save after 2 seconds of typing inactivity

  saveTimers.set(roomId, newTimer);
}

async function forceSaveToDatabase(roomId: string, doc: Y.Doc) {
  try {
    const content = doc.getText('monaco').toString();
    
    // Find the latest snippet to check the current language
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { snippets: { orderBy: { updated_at: 'desc' }, take: 1 } },
    });

    const latestSnippet = room?.snippets[0];
    const language = latestSnippet?.language || 'javascript'; // Fallback to javascript

    // Upsert the snippet: update the existing one or create a new one
    if (latestSnippet) {
      await prisma.snippet.update({
        where: { id: latestSnippet.id },
        data: { content },
      });
    } else {
      await prisma.snippet.create({
        data: {
          room_id: roomId,
          content,
          language,
        },
      });
    }
  } catch (err) {
    console.error(`Failed to auto-save document for room ${roomId}:`, err);
  }
}
