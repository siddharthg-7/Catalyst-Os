import React, { useEffect, useState } from 'react';
import { Bell, X, AlertTriangle, Info, CheckCircle2, AlertCircle, FileText, CheckCheck, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  read: boolean;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: 'dashboard' | 'approvals' | 'knowledge' | 'agents') => void;
}

function timeAgo(dateString: string): string {
  try {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return 'Recently';
  }
}

export default function NotificationPanel({ isOpen, onClose, onNavigate }: NotificationPanelProps) {
  const { apiFetch } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotifications(data);
        }
      }
    } catch (err) {
      console.warn('[NotificationPanel] Could not fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' });
    } catch (err) {
      console.warn('[NotificationPanel] Error marking all read:', err);
    }
  };

  const markOneRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
    } catch (err) {
      console.warn('[NotificationPanel] Error marking read:', err);
    }
  };

  const handleNotificationClick = (n: NotificationItem) => {
    markOneRead(n.id);
    if (n.type === 'APPROVAL' && onNavigate) {
      onNavigate('approvals');
      onClose();
    } else if (n.type === 'DOCUMENT' && onNavigate) {
      onNavigate('knowledge');
      onClose();
    }
  };

  const getIcon = (type: string) => {
    const t = (type || '').toUpperCase();
    switch (t) {
      case 'APPROVAL':
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'RISK':
      case 'CRITICAL':
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'DOCUMENT':
        return <FileText className="w-4 h-4 text-sky-500" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default:
        return <Info className="w-4 h-4 text-indigo-400" />;
    }
  };

  const getBgStyle = (type: string, read: boolean) => {
    if (read) return 'bg-zinc-900/30 border-zinc-800/60 opacity-60';
    const t = (type || '').toUpperCase();
    switch (t) {
      case 'APPROVAL':
      case 'WARNING':
        return 'bg-amber-500/10 border-amber-500/25';
      case 'RISK':
      case 'CRITICAL':
        return 'bg-rose-500/10 border-rose-500/25';
      case 'DOCUMENT':
        return 'bg-sky-500/10 border-sky-500/25';
      case 'SUCCESS':
        return 'bg-emerald-500/10 border-emerald-500/25';
      default:
        return 'bg-indigo-500/10 border-indigo-500/25';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-screen w-full max-w-sm bg-[#0A0A0B] border-l border-zinc-800 z-50 flex flex-col shadow-2xl font-sans"
          >
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">Executive Notifications</h2>
                  <p className="text-[10px] text-zinc-500 font-mono">OPERATIONAL AUDIT TRAIL</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-zinc-900 text-zinc-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/50 bg-zinc-900/20">
              <span className="text-xs font-medium text-zinc-400">
                {unreadCount > 0 ? `${unreadCount} Unread Alerts` : 'All Caught Up'}
              </span>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllRead}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-500 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <span className="text-xs font-mono">Syncing operational events...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-600">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-300">No Notifications Yet</h4>
                    <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                      Events from agent analyses, document indexation, and approval requirements will appear here in real-time.
                    </p>
                  </div>
                </div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-zinc-700 ${getBgStyle(n.type, n.read)}`}
                  >
                    <div className="flex gap-3 items-start">
                      <div className="shrink-0 mt-0.5">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <h4 className={`text-xs font-bold truncate ${n.read ? 'text-zinc-300' : 'text-white'}`}>
                            {n.title}
                          </h4>
                          <span className="text-[9px] font-mono text-zinc-500 shrink-0">
                            {timeAgo(n.createdAt)}
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed line-clamp-2 ${n.read ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          {n.message}
                        </p>
                        {n.type === 'APPROVAL' && (
                          <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                            <span>Review required in Approvals</span>
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        )}
                        {n.type === 'DOCUMENT' && (
                          <div className="mt-2 flex items-center gap-1 text-[10px] text-sky-400 font-semibold">
                            <span>View in Knowledge Base</span>
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950">
              <p className="text-[10px] text-center text-zinc-500 font-mono">
                CatalystOS Operational Event Stream • Scoped to Workspace
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
