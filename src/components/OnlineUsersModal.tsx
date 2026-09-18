import React from 'react';
import { X, Users, Sparkles, CheckCircle2 } from 'lucide-react';
import { OnlineUser, UserProfile } from '../types';

interface OnlineUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onlineUsers: OnlineUser[];
  currentUser: UserProfile;
}

export const OnlineUsersModal: React.FC<OnlineUsersModalProps> = ({
  isOpen,
  onClose,
  onlineUsers,
  currentUser,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Guruh Ishtirokchilari
              </h3>
              <p className="text-xs text-slate-400">
                Hozirda {onlineUsers.length} kishi onlayn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* User list */}
        <div className="py-4 max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {onlineUsers.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Hozircha boshqa faol foydalanuvchilar yo'q
            </div>
          ) : (
            onlineUsers.map((user) => {
              const isMe = user.id === currentUser.id || user.username === currentUser.username;
              return (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    isMe
                      ? 'bg-indigo-950/40 border-indigo-500/30'
                      : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm border border-white/10"
                        style={{ backgroundColor: user.color || '#6366f1' }}
                      >
                        {user.avatar || '👤'}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white truncate">
                          @{user.username}
                        </span>
                        {isMe && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium">
                            Siz
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Faol muloqotda
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 font-medium">
                    {isMe ? 'Hozir' : 'Onlayn'}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1 text-slate-500 text-[11px]">
            <Sparkles size={12} className="text-indigo-400" />
            Yagona umumiy guruh
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
