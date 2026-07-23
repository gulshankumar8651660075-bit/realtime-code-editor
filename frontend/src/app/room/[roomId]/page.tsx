'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Editor, { Monaco } from '@monaco-editor/react';
import { io, Socket } from 'socket.io-client';
import * as Y from 'yjs';
import { apiRequest, getUser, getToken, getWsUrl } from '../../../utils/api';
import { 
  Code2, Play, ChevronLeft, Copy, Check, Users, MessageSquare, 
  Terminal as TerminalIcon, Send, Sparkles, Loader2, AlertTriangle, ShieldAlert
} from 'lucide-react';

interface PresenceUser {
  socketId: string;
  username: string;
  color: string;
  cursor: {
    lineNumber: number;
    column: number;
  } | null;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export default function RoomPage() {
  const router = useRouter();
  const { roomId } = useParams() as { roomId: string };
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // States
  const [roomName, setRoomName] = useState('Loading workspace...');
  const [language, setLanguage] = useState('javascript');
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  // Execution console states
  const [isRunning, setIsRunning] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string>('Console idle. Click "Run Code" to compile.');
  const [consoleError, setConsoleError] = useState<string | null>(null);
  const [runStats, setRunStats] = useState<{ isDocker: boolean; time?: string } | null>(null);

  // UI copy states
  const [copiedLink, setCopiedLink] = useState(false);

  // Refs for editor and sockets
  const socketRef = useRef<Socket | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const isApplyingRemoteRef = useRef<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 1. Authenticate user
  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (!token || !user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
    fetchRoomDetails();
  }, [roomId, router]);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchRoomDetails = async () => {
    try {
      const data = await apiRequest(`/api/room/${roomId}`);
      setRoomName(data.room.room_name);
      setLanguage(data.room.snippets[0]?.language || 'javascript');
    } catch (err) {
      console.error('Failed to load room details:', err);
      setRoomName('Error loading room');
    }
  };

  // 2. Initialize Socket.io, Yjs, and Editor Sync
  useEffect(() => {
    const user = getUser();
    if (!user) return;

    // Create a local Yjs Doc
    const doc = new Y.Doc();
    docRef.current = doc;
    const ytext = doc.getText('monaco');

    // Connect to WebSockets
    const wsUrl = getWsUrl();
    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    // Join room
    socket.emit('join-room', { roomId, user });

    // Handle Yjs initialization
    socket.on('yjs-init', (initBuffer: ArrayBuffer) => {
      try {
        isApplyingRemoteRef.current = true;
        Y.applyUpdate(doc, new Uint8Array(initBuffer));
        isApplyingRemoteRef.current = false;

        // If editor is already loaded, sync it
        if (editorRef.current) {
          editorRef.current.setValue(ytext.toString());
        }
      } catch (err) {
        console.error('Failed to initialize Yjs state:', err);
      }
    });

    // Handle Yjs remote updates
    socket.on('yjs-update', (updateBuffer: ArrayBuffer) => {
      try {
        isApplyingRemoteRef.current = true;
        Y.applyUpdate(doc, new Uint8Array(updateBuffer));
        isApplyingRemoteRef.current = false;

        // Update Monaco content
        if (editorRef.current) {
          const model = editorRef.current.getModel();
          if (model) {
            const currentVal = model.getValue();
            const newVal = ytext.toString();
            if (currentVal !== newVal) {
              const state = editorRef.current.saveViewState();
              model.setValue(newVal);
              if (state) editorRef.current.restoreViewState(state);
            }
          }
        }
      } catch (err) {
        console.error('Failed to apply Yjs update:', err);
      }
    });

    // Observe local Yjs document changes and send to server
    doc.on('update', (update, origin) => {
      // Only send updates that originated locally from Monaco
      if (origin === 'monaco-local' && socketRef.current) {
        socketRef.current.emit('yjs-update', Buffer.from(update));
      }
    });

    // Handle Presence updates
    socket.on('presence-update', (users: PresenceUser[]) => {
      setActiveUsers(users);
    });

    // Handle chat messages
    socket.on('chat-message', (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
      doc.destroy();
    };
  }, [roomId]);

  // 3. Handle Editor Mounting
  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Apply custom styling preferences to Monaco Editor
    monaco.editor.defineTheme('synapse-dark-red', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '7f1d1d', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'e11d48', fontStyle: 'bold' },
        { token: 'string', foreground: 'fca5a5' },
        { token: 'number', foreground: 'f43f5e' },
      ],
      colors: {
        'editor.background': '#0a0a0f',
        'editor.foreground': '#f4f4f5',
        'editorCursor.foreground': '#e11d48',
        'editor.lineHighlightBackground': '#181825',
        'editorLineNumber.foreground': '#4c0519',
        'editorLineNumber.activeForeground': '#e11d48',
        'editor.selectionBackground': '#9f1239',
      },
    });
    monaco.editor.setTheme('synapse-dark-red');

    // Load initial text if any
    const doc = docRef.current;
    if (doc) {
      const ytext = doc.getText('monaco');
      editor.setValue(ytext.toString());
    }

    // Monaco -> Yjs changes mapping
    editor.onDidChangeModelContent((event: any) => {
      if (isApplyingRemoteRef.current) return;

      const doc = docRef.current;
      if (!doc) return;

      const ytext = doc.getText('monaco');
      
      // Perform Yjs changes inside a transaction tagged as local
      doc.transact(() => {
        event.changes.forEach((change: any) => {
          const { rangeOffset, rangeLength, text } = change;
          if (rangeLength > 0) {
            ytext.delete(rangeOffset, rangeLength);
          }
          if (text.length > 0) {
            ytext.insert(rangeOffset, text);
          }
        });
      }, 'monaco-local');
    });

    // Track Cursor movements and broadcast to other users
    editor.onDidChangeCursorPosition((e: any) => {
      if (socketRef.current) {
        socketRef.current.emit('cursor-move', {
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        });
      }
    });
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    // Send a message or update the snippet language in the database
    // For simplicity, we just change the editor's syntax highlighting client-side.
  };

  const handleCopyLink = () => {
    const inviteUrl = window.location.href;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;
    socketRef.current.emit('chat-message', chatInput.trim());
    setChatInput('');
  };

  const handleRunCode = async () => {
    if (!editorRef.current) return;
    const codeToRun = editorRef.current.getValue();

    setIsRunning(true);
    setConsoleOutput('Compiling and running code inside sandbox...');
    setConsoleError(null);
    setRunStats(null);

    try {
      const data = await apiRequest('/api/execute', {
        method: 'POST',
        body: { code: codeToRun, language },
      });

      // Display outputs
      if (data.error) {
        setConsoleError(data.error);
        setConsoleOutput(data.stderr || 'Execution failed.');
      } else {
        setConsoleOutput(data.stdout || (data.stderr ? '' : 'Execution completed successfully with empty output.'));
        if (data.stderr) {
          setConsoleError(data.stderr);
        }
      }

      setRunStats({
        isDocker: data.isDocker,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    } catch (err: any) {
      setConsoleError(`Execution failed: ${err.message}`);
      setConsoleOutput('');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark text-text-primary flex flex-col h-screen overflow-hidden">
      {/* Header IDE menu */}
      <header className="h-14 border-b border-border-red/60 bg-bg-card/40 backdrop-blur-md px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-red-glow border border-border-red bg-red-dark/10 hover:bg-red-dark/25 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Dashboard
          </button>

          <div className="h-4 w-px bg-border-red/60"></div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-text-primary truncate max-w-[160px] md:max-w-[240px]">
              {roomName}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="relative">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-border-red bg-bg-dark text-text-primary focus:outline-none focus:border-red-primary cursor-pointer appearance-none pr-8"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python 3</option>
              <option value="cpp">C++ (GCC)</option>
              <option value="go">Go Lang</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-red-glow text-[10px]">▼</div>
          </div>

          {/* Copy invite link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs border border-border-red bg-red-dark/10 hover:bg-red-dark/20 text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400 font-semibold">Copied Invite!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Invite</span>
              </>
            )}
          </button>

          {/* Run Code Button */}
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 text-xs font-semibold bg-red-primary hover:bg-red-glow text-white px-4 py-1.5 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 glow-red-hover"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Code</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden w-full">
        {/* Left Sidebar: Users and Snippets list */}
        <aside className="w-60 border-r border-border-red/60 bg-bg-card/25 flex flex-col justify-between shrink-0 hidden md:flex">
          {/* Active Users Section */}
          <div className="p-4 flex-1 flex flex-col min-h-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-red-glow" />
              Connected ({activeUsers.length})
            </h3>
            
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {activeUsers.map((u) => (
                <div 
                  key={u.socketId}
                  className="flex items-center justify-between p-2 rounded-lg border border-border-red/30 bg-bg-darker/50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" 
                      style={{ backgroundColor: u.color }}
                    />
                    <span className="text-sm font-semibold truncate text-text-primary">
                      {u.username}
                    </span>
                  </div>

                  {u.cursor && (
                    <span className="text-[10px] font-mono text-text-secondary px-1.5 py-0.5 rounded bg-bg-dark border border-border-red/30 shrink-0">
                      L{u.cursor.lineNumber}:C{u.cursor.column}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* User Workspace Profile Card */}
          {currentUser && (
            <div className="p-4 border-t border-border-red/30 bg-red-dark/5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-primary/10 border border-border-red flex items-center justify-center text-red-glow text-sm font-bold">
                {currentUser.username[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs text-text-secondary">Logged in as</div>
                <div className="text-sm font-bold truncate text-text-primary">{currentUser.username}</div>
              </div>
            </div>
          )}
        </aside>

        {/* Center: Monaco Editor & Output Terminal */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-bg-dark">
          {/* Monaco Editor Container */}
          <div className="flex-1 relative min-h-0 bg-bg-darker border-b border-border-red/60">
            <Editor
              height="100%"
              language={language}
              theme="synapse-dark-red"
              options={{
                fontSize: 14,
                fontFamily: 'Fira Code, JetBrains Mono, Courier New, monospace',
                minimap: { enabled: false },
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                },
                automaticLayout: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                contextmenu: false,
              }}
              onMount={handleEditorDidMount}
              loading={
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg-dark">
                  <Loader2 className="w-8 h-8 text-red-glow animate-spin" />
                  <span className="text-xs text-text-secondary">Loading collaborative workspace...</span>
                </div>
              }
            />
          </div>

          {/* Terminal Console Output Panel */}
          <div className="h-56 bg-bg-darker flex flex-col shrink-0">
            <div className="h-8 border-b border-border-red/60 px-4 flex items-center justify-between bg-bg-card/30">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
                <TerminalIcon className="w-4 h-4 text-red-glow" />
                Terminal Output Console
              </div>

              {runStats && (
                <div className="flex items-center gap-3 text-[10px] text-text-secondary font-mono">
                  {runStats.isDocker ? (
                    <span className="px-2 py-0.5 rounded border border-green-500/30 bg-green-500/10 text-green-400">
                      Isolated Docker
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Local Fallbox
                    </span>
                  )}
                  <span>Finished at: {runStats.time}</span>
                </div>
              )}
            </div>

            {/* Print Console Screen */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs select-text leading-relaxed">
              {consoleError ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-red-400 font-bold">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Process Finished with Compilation / Runtime Error:</span>
                  </div>
                  <pre className="text-red-300 bg-red-950/20 p-3 rounded-lg border border-red-500/10 whitespace-pre-wrap select-all">
                    {consoleError}
                  </pre>
                  {consoleOutput && (
                    <pre className="text-text-secondary whitespace-pre-wrap">{consoleOutput}</pre>
                  )}
                </div>
              ) : (
                <pre className="text-text-primary whitespace-pre-wrap select-all">{consoleOutput}</pre>
              )}
            </div>
          </div>
        </main>

        {/* Right Sidebar: Chat Panel */}
        <aside className="w-80 border-l border-border-red/60 bg-bg-card/25 flex flex-col shrink-0 hidden lg:flex">
          {/* Chat Title */}
          <div className="h-10 border-b border-border-red/40 px-4 flex items-center gap-2 shrink-0">
            <MessageSquare className="w-4 h-4 text-red-glow" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Room Chat Room
            </h3>
          </div>

          {/* Chat Messaging Box */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col justify-end min-h-0 bg-bg-darker/20">
            <div className="overflow-y-auto space-y-3 pr-1 max-h-full">
              {chatMessages.length === 0 ? (
                <div className="text-center text-xs text-text-secondary py-8 italic">
                  No messages yet. Send a note to the workspace team.
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col gap-1 max-w-[85%] ${
                      msg.sender === currentUser?.username ? 'self-end items-end ml-auto' : 'self-start items-start'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-text-secondary font-semibold">
                      <span>{msg.sender}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div 
                      className={`px-3 py-2 rounded-xl text-xs ${
                        msg.sender === currentUser?.username 
                          ? 'bg-red-primary text-white rounded-tr-none' 
                          : 'bg-bg-card border border-border-red/40 text-text-primary rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatBottomRef} />
            </div>
          </div>

          {/* Chat Form */}
          <form onSubmit={handleSendChat} className="p-3 border-t border-border-red/40 bg-bg-card/45 flex gap-2 shrink-0">
            <input
              type="text"
              placeholder="Type message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-border-red/50 bg-bg-dark text-text-primary focus:outline-none focus:border-red-primary text-xs"
            />
            <button
              type="submit"
              className="p-2 rounded-lg bg-red-primary hover:bg-red-glow text-white transition-all cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
