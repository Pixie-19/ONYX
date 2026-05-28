'use client';
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, X, Check, CheckCheck, Trash2, AlertCircle, Zap, Code, Github, Brain, Server,
} from 'lucide-react';
import { useOnyx } from '@/lib/store';
import type { NotificationCategory, Notification } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Separator } from '@/components/ui/Separator';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/format';

type TabType = NotificationCategory;

const TABS: { label: string; value: TabType }[] = [
  { label: 'All', value: 'all' },
  { label: 'System', value: 'system' },
  { label: 'GitHub', value: 'github' },
  { label: 'AI', value: 'ai' },
  { label: 'Infrastructure', value: 'infrastructure' },
];

const notificationIcons: Record<string, React.ReactNode> = {
  compiler_warning: <Code size={14} />,
  runtime_crash: <AlertCircle size={14} />,
  blackout_protocol: <Zap size={14} />,
  github_sync: <Github size={14} />,
  repo_disconnected: <Github size={14} />,
  thermal_alert: <AlertCircle size={14} />,
  port_collision: <Server size={14} />,
  dependency_failure: <AlertCircle size={14} />,
  ai_cognition: <Brain size={14} />,
  replay_snapshot: <Check size={14} />,
  terminal_attach: <Server size={14} />,
  system_alert: <AlertCircle size={14} />,
};

function NotificationItem({ notification }: { notification: Notification }) {
  const markRead = useOnyx((s) => s.markNotificationRead);
  const icon = notificationIcons[notification.type] || <Bell size={14} />;

  const handleMarkRead = () => {
    if (!notification.read) {
      markRead(notification.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={cn(
        'p-3 border-l-2 transition-colors',
        notification.read
          ? 'bg-surface-base border-line opacity-60'
          : 'bg-surface-sunken border-line hover:border-primary/50',
      )}
    >
      <div className="flex items-start gap-2">
        <div className={cn(
          'p-1.5 rounded-md shrink-0 mt-0.5',
          notification.severity === 'critical'
            ? 'text-[#991B1B] bg-[#FEE2E2] dark:text-red-200 dark:bg-red-500/15'
            : notification.severity === 'error'
              ? 'text-[#B91C1C] bg-[#FEF2F2] dark:text-red-200 dark:bg-red-400/10'
              : notification.severity === 'warn'
                ? 'text-[#B45309] bg-[#FFFBEB] dark:text-amber-200 dark:bg-amber-400/10'
                : 'text-[#4338CA] bg-[#EEF2FF] dark:text-indigo-200 dark:bg-indigo-400/10',
        )}>
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-sm text-primary truncate">
              {notification.title}
            </div>
            <Badge tone={notification.severity === 'critical' ? 'critical' : notification.severity === 'error' ? 'error' : 'info'} dot={false} className="shrink-0">
              {notification.severity}
            </Badge>
          </div>

          <p className="text-xs text-secondary mt-0.5 line-clamp-2">
            {notification.message}
          </p>

          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-tertiary">
              {new Date(notification.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>

            {!notification.read && (
              <button
                onClick={handleMarkRead}
                className="text-tertiary hover:text-primary transition text-[10px] font-medium"
              >
                Mark as read
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const notifications = useOnyx((s) => s.notifications);
  const unread = useOnyx((s) => s.notificationsUnread);
  const markRead = useOnyx((s) => s.markNotificationRead);
  const clearAll = useOnyx((s) => s.clearNotifications);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return notifications;
    return notifications.filter((n) => n.category === activeTab);
  }, [notifications, activeTab]);

  const handleClearAll = useCallback(() => {
    clearAll();
    setOpen(false);
  }, [clearAll]);

  return (
    <>
      {/* Bell button */}
      <Tooltip label="Notifications" side="bottom">
        <button
          onClick={() => setOpen(!open)}
          className="btn-icon relative"
          aria-label="notifications"
        >
          <Bell size={14} />
          {unread > 0 && (
            <motion.span
              key={unread}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-[#EF4444] text-white text-[9.5px] font-semibold flex items-center justify-center"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
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
              className="absolute top-12 right-0 w-96 rounded-lg border border-line bg-surface-raised shadow-lg z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between border-b border-line">
                <div>
                  <h3 className="font-semibold text-sm text-primary">Notifications</h3>
                  <p className="text-xs text-tertiary mt-0.5">
                    {unread > 0 ? `${unread} unread` : 'All caught up'}
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 hover:bg-surface-sunken rounded transition"
                  aria-label="close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 px-4 py-2 border-b border-line overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={cn(
                      'px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap',
                      activeTab === tab.value
                        ? 'bg-primary text-white'
                        : 'text-tertiary hover:bg-surface-sunken',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              {filtered.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center gap-2 text-tertiary">
                  <Bell size={24} className="opacity-30" />
                  <p className="text-xs">No notifications</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="divide-y divide-line">
                    {filtered.map((notification) => (
                      <NotificationItem key={notification.id} notification={notification} />
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Footer */}
              {notifications.length > 0 && (
                <>
                  <Separator />
                  <div className="px-4 py-2 flex gap-2">
                    <button
                      onClick={() => {
                        // Mark all as read
                        notifications
                          .filter((n) => !n.read)
                          .forEach((n) => markRead(n.id));
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs font-medium text-primary hover:bg-surface-sunken transition"
                    >
                      <CheckCheck size={12} />
                      Mark all read
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2] dark:hover:bg-red-400/10 transition"
                    >
                      <Trash2 size={12} />
                      Clear all
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
