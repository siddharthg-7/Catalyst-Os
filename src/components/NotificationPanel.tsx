import React, { useEffect, useState } from 'react';
import { Bell, X, AlertTriangle, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  time: string;
  read: boolean;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Runway Alert',
      message: 'Burn rate has exceeded projected limits by 5%. Estimated runway dropped to 10 months.',
      type: 'critical',
      time: 'Just now',
      read: false,
    },
    {
      id: '2',
      title: 'New Applicant Match',
      message: 'Talent Agent identified a 98% match for the Senior AI Engineer role.',
      type: 'success',
      time: '10 mins ago',
      read: false,
    },
    {
      id: '3',
      title: 'Server Load Warning',
      message: 'Operations detected sustained high load on primary compute clusters.',
      type: 'warning',
      time: '1 hr ago',
      read: false,
    },
    {
      id: '4',
      title: 'Daily Sync Complete',
      message: 'Executive Council has completed the overnight reconciliation process.',
      type: 'info',
      time: '3 hrs ago',
      read: true,
    }
  ]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'info': return <Info className="w-4 h-4 text-sky-500" />;
    }
  };

  const getBgStyle = (type: Notification['type'], read: boolean) => {
    if (read) return 'bg-zinc-900/40 border-zinc-900 opacity-70';
    switch (type) {
      case 'critical': return 'bg-rose-500/10 border-rose-500/20';
      case 'warning': return 'bg-amber-500/10 border-amber-500/20';
      case 'success': return 'bg-emerald-500/10 border-emerald-500/20';
      case 'info': return 'bg-sky-500/10 border-sky-500/20';
    }
  };

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
            className="fixed top-0 right-0 h-screen w-full max-w-sm bg-[#0A0A0B] border-l border-zinc-800 z-50 flex flex-col shadow-2xl"
          >
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">Real-Time Alerts</h2>
                  <p className="text-[10px] text-zinc-500 font-mono">EXECUTIVE AI COUNCIL</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-zinc-900 text-zinc-500 hover:text-white flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/50 bg-zinc-900/20">
              <span className="text-xs font-medium text-zinc-400">
                {notifications.filter(n => !n.read).length} Unread
              </span>
              <button 
                onClick={markAllRead}
                className="text-xs font-semibold text-[#6366F1] hover:text-indigo-400 transition-colors"
              >
                Mark all as read
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-4 rounded-xl border transition-all ${getBgStyle(notification.type, notification.read)}`}
                >
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`text-sm font-bold ${notification.read ? 'text-zinc-300' : 'text-white'}`}>
                          {notification.title}
                        </h4>
                        <span className="text-[9px] font-mono text-zinc-500 whitespace-nowrap ml-2">
                          {notification.time}
                        </span>
                      </div>
                      <p className={`text-xs leading-relaxed ${notification.read ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-zinc-800 bg-zinc-950">
              <p className="text-[10px] text-center text-zinc-500 font-mono">
                System connected & securely receiving updates.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
