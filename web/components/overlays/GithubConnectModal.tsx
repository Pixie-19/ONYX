'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Loader, X, Check } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';

interface GithubConnectModalProps {
  open: boolean;
  onClose: () => void;
  onConnect: () => void;
}

export function GithubConnectModal({ open, onClose, onConnect }: GithubConnectModalProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');

  const handleConnect = async () => {
    setLoading(true);
    setStatus('connecting');

    try {
      // OAuth flows require a full-page redirect — `redirect: false` only
      // works for credential providers. Sending the user to GitHub directly
      // is the canonical Auth.js v5 pattern.
      await signIn('github', {
        callbackUrl: typeof window !== 'undefined' ? window.location.href : '/',
      });
      // signIn() initiates a navigation; control rarely returns here.
    } catch (err) {
      setStatus('error');
      // eslint-disable-next-line no-console
      console.error('[GithubConnect] signIn failed:', err);
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-surface-raised border border-line rounded-lg shadow-xl max-w-md w-full overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-line">
                <h2 className="font-semibold text-primary">Connect GitHub</h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-surface-sunken rounded transition"
                  disabled={loading}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-6 space-y-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-surface-sunken mx-auto mb-4">
                  <Github size={24} />
                </div>

                <div className="text-center">
                  <p className="text-sm text-primary font-medium">Sync repositories & commits</p>
                  <p className="text-xs text-tertiary mt-2">
                    Connect your GitHub account to automatically sync repositories, commits, and contributors into ONYX's relational cognition layer.
                  </p>
                </div>

                <Separator />

                {/* Permissions list */}
                <div className="space-y-2 bg-surface-sunken rounded-lg p-4">
                  <p className="text-[11px] font-medium text-secondary uppercase tracking-tight">Requested permissions</p>
                  <div className="space-y-1.5 text-[12px] text-tertiary">
                    <div className="flex items-start gap-2">
                      <Check size={12} className="text-[#047857] mt-0.5 shrink-0" />
                      <span>Read repositories metadata</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={12} className="text-[#047857] mt-0.5 shrink-0" />
                      <span>Access commit history</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={12} className="text-[#047857] mt-0.5 shrink-0" />
                      <span>List contributors</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={12} className="text-[#047857] mt-0.5 shrink-0" />
                      <span>Track pull requests</span>
                    </div>
                  </div>
                </div>

                {status === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-xs font-medium flex items-center gap-2"
                  >
                    <Check size={14} />
                    Successfully connected!
                  </motion.div>
                )}

                {status === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-[#B91C1C] text-xs font-medium"
                  >
                    Connection failed. Please try again.
                  </motion.div>
                )}
              </div>

              <Separator />

              {/* Actions */}
              <div className="px-6 py-4 flex gap-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded border border-line text-sm font-medium text-secondary hover:bg-surface-sunken transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={loading || status === 'success'}
                  className="flex-1 px-4 py-2 rounded bg-[#4338CA] text-white text-sm font-medium hover:bg-[#4338CA]/90 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {status === 'connecting' && <Loader size={14} className="animate-spin" />}
                  {status === 'connecting' ? 'Connecting…' : 'Connect with GitHub'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
