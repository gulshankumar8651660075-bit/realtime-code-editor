'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, getUser, removeToken, removeUser, getToken } from '../../utils/api';
import { 
  Code2, Plus, ArrowRight, LogOut, Calendar, Copy, Check, Trash2, 
  User, Sparkles, Loader2, RefreshCw 
} from 'lucide-react';

interface Room {
  id: string;
  room_name: string;
  created_at: string;
  snippets: {
    language: string;
    updated_at: string;
  }[];
}

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomName, setRoomName] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [joinId, setJoinId] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Authentication check & Fetch rooms
  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (!token || !user) {
      removeToken();
      removeUser();
      router.push('/');
      return;
    }
    setCurrentUser(user);
    fetchRooms();
  }, [router]);

  const fetchRooms = async () => {
    setRoomsLoading(true);
    try {
      const data = await apiRequest('/api/room/list');
      setRooms(data.rooms || []);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setRoomsLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    setCreateLoading(true);
    try {
      const data = await apiRequest('/api/room/create', {
        method: 'POST',
        body: { room_name: roomName, language },
      });
      router.push(`/room/${data.room.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinId.trim()) return;

    setJoinLoading(true);
    try {
      // Validate that room exists
      const data = await apiRequest(`/api/room/${joinId.trim()}`);
      router.push(`/room/${data.room.id}`);
    } catch (err: any) {
      alert(err.message || 'Room not found or invalid Room ID');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this room? This cannot be undone.')) return;

    try {
      await apiRequest(`/api/room/${roomId}`, { method: 'DELETE' });
      setRooms(rooms.filter(r => r.id !== roomId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete room');
    }
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLogout = () => {
    removeToken();
    removeUser();
    router.push('/');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get color for language badges
  const getLangBadgeStyle = (lang: string) => {
    switch (lang?.toLowerCase()) {
      case 'javascript': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'python': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'cpp': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'go': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-bg-darker text-text-primary flex flex-col relative overflow-hidden">
      {/* Accent Background Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-red-muted/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-red-primary/5 blur-[100px] pointer-events-none"></div>

      {/* Header Bar */}
      <header className="border-b border-border-red/60 bg-bg-card/30 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-dark/40 border border-border-red text-red-glow">
              <Code2 className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-text-primary">
              Synapse <span className="text-red-glow font-medium">IDE</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {currentUser && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-red bg-red-dark/10 text-text-secondary text-sm">
                <User className="w-4 h-4 text-red-glow" />
                <span className="font-medium text-text-primary">{currentUser.username}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg border border-border-red hover:bg-red-dark/30 text-text-secondary hover:text-red-glow transition-all cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 z-10">
        {/* Left Side: Create / Join Room Action Panels */}
        <div className="lg:col-span-4 space-y-6">
          {/* Create Room Card */}
          <div className="glass-panel rounded-2xl p-6 border-border-red space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-red-glow" />
              Create Code Room
            </h2>
            <p className="text-sm text-text-secondary">
              Initialize a new room with built-in sandbox execution and live synchronization.
            </p>
            <form onSubmit={handleCreateRoom} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Room Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Pair Programming Session"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border-red bg-bg-dark/40 text-text-primary focus:outline-none focus:border-red-primary focus:ring-1 focus:ring-red-primary/30 transition-all text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Sandbox Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border-red bg-bg-dark/40 text-text-primary focus:outline-none focus:border-red-primary focus:ring-1 focus:ring-red-primary/30 transition-all text-sm appearance-none cursor-pointer"
                >
                  <option value="javascript">JavaScript (Node.js)</option>
                  <option value="python">Python 3</option>
                  <option value="cpp">C++ (GCC G++)</option>
                  <option value="go">Go Lang</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={createLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-red-primary hover:bg-red-glow text-white font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm mt-4 glow-red-hover"
              >
                {createLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Create Room <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>

          {/* Join Room Card */}
          <div className="glass-panel rounded-2xl p-6 border-border-red space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-red-glow" />
              Join Room via ID
            </h2>
            <p className="text-sm text-text-secondary">
              Enter a shared workspace Room UUID to collaborate in real-time.
            </p>
            <form onSubmit={handleJoinRoom} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Room UUID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border-red bg-bg-dark/40 text-text-primary focus:outline-none focus:border-red-primary focus:ring-1 focus:ring-red-primary/30 transition-all text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={joinLoading}
                className="w-full py-2.5 px-4 rounded-lg border border-border-red hover:bg-red-dark/30 text-text-primary hover:text-red-glow font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
              >
                {joinLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Join Session <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Active Workspace History List */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              Active Workspaces
              <span className="px-2 py-0.5 rounded-full text-xs bg-red-dark/60 text-red-glow border border-border-red">
                {rooms.length}
              </span>
            </h2>
            <button
              onClick={fetchRooms}
              disabled={roomsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-red hover:bg-red-dark/20 text-xs text-text-secondary hover:text-red-glow transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${roomsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {roomsLoading ? (
            <div className="h-64 rounded-2xl border border-border-red/40 bg-bg-card/20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-red-glow animate-spin" />
              <p className="text-sm text-text-secondary">Retrieving workspaces from database...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="h-64 rounded-2xl border border-border-dashed border-border-red/40 bg-bg-card/10 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="p-4 rounded-full bg-red-dark/20 border border-border-red text-red-glow">
                <Code2 className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-text-primary text-base">No active rooms found</h3>
              <p className="text-sm text-text-secondary max-w-sm">
                Create a room on the left, or join a room using a code shared by your coworker.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((room) => {
                const roomLang = room.snippets[0]?.language || 'javascript';
                return (
                  <div
                    key={room.id}
                    onClick={() => router.push(`/room/${room.id}`)}
                    className="group border border-border-red/60 bg-bg-card/30 hover:bg-bg-card/60 p-5 rounded-xl cursor-pointer hover:border-red-primary/50 transition-all flex flex-col justify-between space-y-4 glow-red-hover"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-bold text-text-primary text-base group-hover:text-red-glow transition-colors truncate pr-2">
                          {room.room_name}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border ${getLangBadgeStyle(roomLang)}`}>
                          {roomLang === 'cpp' ? 'C++' : roomLang}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Calendar className="w-3.5 h-3.5 text-red-glow" />
                        <span>Created {formatDate(room.created_at)}</span>
                      </div>
                    </div>

                    <div className="border-t border-border-red/30 pt-3 flex items-center justify-between gap-4">
                      {/* Copy Room ID button */}
                      <button
                        onClick={(e) => handleCopyId(room.id, e)}
                        className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-all p-1 rounded hover:bg-bg-dark/50"
                        title="Copy Room ID to invite"
                      >
                        {copiedId === room.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-green-400 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[120px]">{room.id.slice(0, 8)}...</span>
                          </>
                        )}
                      </button>

                      {/* Delete room button */}
                      <button
                        onClick={(e) => handleDeleteRoom(room.id, e)}
                        className="p-1 rounded text-text-secondary hover:text-red-glow hover:bg-red-dark/20 transition-all"
                        title="Delete Room"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
