'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, setToken, setUser, getToken } from '../utils/api';
import { Code2, Terminal, Users, ShieldAlert, Sparkles, Loader2 } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (getToken()) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const data = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: { email, password },
        });
        setToken(data.token);
        setUser(data.user);
        router.push('/dashboard');
      } else {
        // Register
        const data = await apiRequest('/api/auth/register', {
          method: 'POST',
          body: { username, email, password },
        });
        setToken(data.token);
        setUser(data.user);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden bg-bg-darker">
      {/* Background Neon Glowing Red Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-red-muted/10 blur-[100px] animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-red-primary/5 blur-[120px] animate-pulse-slow"></div>

      {/* Main Grid Wrapper */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 items-center">
        {/* Left Side: Brand Pitch & Highlights */}
        <div className="lg:col-span-7 text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border-red bg-red-dark/20 text-red-glow text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Next-Gen Collaborative IDE
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none text-text-primary">
            Sync Code in <span className="text-red-glow glow-text-red">Real-Time</span>.
          </h1>
          <p className="text-text-secondary text-lg max-w-xl mx-auto lg:mx-0">
            A production-ready environment featuring collaborative Monaco workspaces, instant binary Yjs state synchronization, and secure containerized code compilation.
          </p>

          {/* Features Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 max-w-md sm:max-w-none mx-auto lg:mx-0">
            <div className="flex items-center gap-3 p-4 rounded-xl border border-border-red bg-bg-card/40">
              <div className="p-2 rounded-lg bg-red-dark/50 text-red-glow">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-text-primary text-sm">Real-time sync</div>
                <div className="text-xs text-text-secondary">Yjs Conflict-free</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl border border-border-red bg-bg-card/40">
              <div className="p-2 rounded-lg bg-red-dark/50 text-red-glow">
                <Terminal className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-text-primary text-sm">Sandboxed Run</div>
                <div className="text-xs text-text-secondary">Docker Containers</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl border border-border-red bg-bg-card/40">
              <div className="p-2 rounded-lg bg-red-dark/50 text-red-glow">
                <Code2 className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-text-primary text-sm">Multi-Language</div>
                <div className="text-xs text-text-secondary">JS, Python, C++, Go</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Card Form */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          <div className="glass-panel glow-red rounded-2xl border-border-red p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-red-dark/30 border border-border-red text-red-glow mb-2">
                <Code2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary tracking-tight">
                {isLogin ? 'Welcome Back' : 'Create Workspace Account'}
              </h2>
              <p className="text-text-secondary text-sm">
                {isLogin ? 'Sign in to access your coding rooms' : 'Register to start real-time pair coding'}
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 text-sm">
                <ShieldAlert className="w-5 h-5 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-1">
                  <label htmlFor="username" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    required
                    placeholder="dev_coder"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-border-red bg-bg-dark/50 text-text-primary focus:outline-none focus:border-red-primary focus:ring-1 focus:ring-red-primary/30 transition-all text-sm"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="email" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border-red bg-bg-dark/50 text-text-primary focus:outline-none focus:border-red-primary focus:ring-1 focus:ring-red-primary/30 transition-all text-sm"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="password" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border-red bg-bg-dark/50 text-text-primary focus:outline-none focus:border-red-primary focus:ring-1 focus:ring-red-primary/30 transition-all text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg bg-red-primary hover:bg-red-glow text-white font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-6 glow-red-hover"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-text-secondary hover:text-red-glow text-sm transition-colors cursor-pointer"
              >
                {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
