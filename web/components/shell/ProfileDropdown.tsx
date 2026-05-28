'use client';
import { useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Settings, Github, LogOut, Zap, BarChart3, X,
} from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { Separator } from '@/components/ui/Separator';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { GithubConnectModal } from '@/components/overlays/GithubConnectModal';
import { RepoBrowserModal } from '@/components/overlays/RepoBrowserModal';
import { cn } from '@/lib/format';

export function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [repoBrowserOpen, setRepoBrowserOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const { status: authStatus } = useSession();
  const session = useOnyx((s) => s.session);
  const authSession = useOnyx((s) => s.authSession);
  const githubConnection = useOnyx((s) => s.githubConnection);
  const blackout = useOnyx((s) => s.blackout);

  const userName = authSession?.user.name || session || 'Anonymous';
  const userEmail = authSession?.user.email || undefined;
  const avatarUrl = authSession?.user.github_avatar_url || undefined;

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut({ redirect: false });
    } catch {
      // ignore — even if NextAuth fails, the SessionProvider eventually
      // converges to unauthenticated; we never want to throw from here.
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  };

  return (
    <>
      {/* Avatar button */}
      <Tooltip label={`Session · ${session ?? '—'}`} side="bottom">
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'w-8 h-8 rounded-full transition flex items-center justify-center overflow-hidden shrink-0',
            open ? 'bg-surface-inset ring-1 ring-primary' : 'bg-surface-sunken hover:bg-surface-inset',
          )}
          aria-label="profile"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
          ) : (
            <User size={14} className="text-secondary" />
          )}
        </button>
      </Tooltip>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              className="absolute top-12 right-0 w-72 rounded-lg border border-line bg-surface-raised shadow-lg z-50 overflow-hidden"
            >
              {/* Profile header */}
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={userName} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-surface-sunken flex items-center justify-center">
                      <User size={18} className="text-secondary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-primary truncate">{userName}</p>
                    {userEmail && (
                      <p className="text-xs text-tertiary truncate">{userEmail}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 hover:bg-surface-sunken rounded transition"
                  aria-label="close"
                >
                  <X size={16} />
                </button>
              </div>

              <Separator />

              {/* Status indicators */}
              <div className="px-4 py-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary">AI Provider</span>
                  <Badge tone={blackout.online ? 'ok' : 'warn'} dot={false}>
                    {blackout.provider}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary">GitHub</span>
                  <Badge tone={githubConnection.connected ? 'ok' : 'muted'} dot={false}>
                    {githubConnection.connected ? `${githubConnection.login}` : 'Disconnected'}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Menu items */}
              <nav className="flex flex-col">
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-surface-sunken transition"
                >
                  <BarChart3 size={16} className="text-secondary" />
                  <span>Profile Dashboard</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-surface-sunken transition"
                >
                  <Settings size={16} className="text-secondary" />
                  <span>Settings</span>
                </Link>

                {githubConnection.connected && (
                  <button
                    onClick={() => {
                      setOpen(false);
                      setRepoBrowserOpen(true);
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-surface-sunken transition text-left"
                  >
                    <Github size={16} className="text-secondary" />
                    <span>GitHub Repositories</span>
                  </button>
                )}
              </nav>

              <Separator />

              {/* Actions */}
              <div className="px-4 py-3 flex flex-col gap-2">
                {!githubConnection.connected ? (
                  <button
                    onClick={() => {
                      setGithubModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded text-sm font-medium text-white bg-[#4338CA] hover:bg-[#4338CA]/90 transition"
                  >
                    <Github size={14} />
                    Connect GitHub
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setOpen(false);
                      setRepoBrowserOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded text-sm font-medium text-secondary hover:bg-surface-sunken transition"
                  >
                    <Github size={14} />
                    Manage Repositories
                  </button>
                )}
              </div>

              <Separator />

              {/* Logout */}
              <button
                onClick={handleLogout}
                disabled={signingOut || authStatus !== 'authenticated'}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#B91C1C] hover:bg-[#FEF2F2] dark:hover:bg-red-400/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut size={16} />
                <span>{signingOut ? 'Signing out…' : authStatus === 'authenticated' ? 'Logout' : 'Not signed in'}</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* GitHub Connect Modal */}
      <GithubConnectModal
        open={githubModalOpen}
        onClose={() => setGithubModalOpen(false)}
        onConnect={() => {
          setGithubModalOpen(false);
          // Give the session time to update, then show repo browser
          setTimeout(() => setRepoBrowserOpen(true), 500);
        }}
      />

      {/* Repository Browser Modal */}
      <RepoBrowserModal
        open={repoBrowserOpen}
        onClose={() => setRepoBrowserOpen(false)}
      />
    </>
  );
}
