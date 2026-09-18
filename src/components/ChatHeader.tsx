import React, { useState } from 'react';
import { Globe2, Users, Search, Volume2, VolumeX, LogOut, User, Sparkles, X, Wifi, WifiOff } from 'lucide-react';
import { UserProfile, OnlineUser } from '../types';

interface ChatHeaderProps {
  currentUser: UserProfile;
  onlineUsers: OnlineUser[];
  onlineCount: number;
  isConnected: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenOnlineList: () => void;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  currentUser,
  onlineUsers,
  onlineCount,
  isConnected,
  soundEnabled,
  onToggleSound,
  onOpenOnlineList,
  onLogout,
  searchQuery,
  onSearchChange,
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="relative z-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand / Group Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Globe2 size={22} />
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                isConnected ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-amber-500 animate-pulse'
              }`}
              title={isConnected ? "Jonli tarmoqqa ulangan" : "Ulanmoqda..."}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                Global Chat Guruhi
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                <Sparkles size={10} />
                Jonli
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenOnlineList}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors group cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform" />
              <span>{onlineCount} kishi onlayn</span>
              <span className="text-slate-600">·</span>
              <span className="text-[11px] underline-offset-2 group-hover:underline text-slate-400 group-hover:text-emerald-300">
                A'zolarni ko'rish
              </span>
            </button>
          </div>
        </div>

        {/* Right: Actions and User badge */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Search Toggle */}
          <div className="relative flex items-center">
            {showSearch ? (
              <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-1.5 gap-2 animate-in fade-in zoom-in-95 duration-150">
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Xabarlarni qidirish..."
                  className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-28 sm:w-44"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowSearch(false);
                    onSearchChange('');
                  }}
                  className="text-slate-400 hover:text-white p-0.5"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="p-2 sm:p-2.5 text-slate-400 hover:text-white hover:bg-slate-800/70 rounded-xl transition-colors"
                title="Qidirish"
              >
                <Search size={18} />
              </button>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={onToggleSound}
            className={`p-2 sm:p-2.5 rounded-xl transition-colors ${
              soundEnabled
                ? 'text-indigo-400 hover:bg-indigo-500/10'
                : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800/70'
            }`}
            title={soundEnabled ? "Bildirishnoma ovozi yoqilgan" : "Bildirishnoma ovozi o'chirilgan"}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Online list quick button */}
          <button
            type="button"
            onClick={onOpenOnlineList}
            className="p-2 sm:p-2.5 text-slate-400 hover:text-white hover:bg-slate-800/70 rounded-xl transition-colors relative"
            title="Onlayn foydalanuvchilar"
          >
            <Users size={18} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
          </button>

          {/* Current User Profile Pill & Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 transition-all active:scale-95"
            >
              <div
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-sm shadow-sm"
                style={{ backgroundColor: currentUser.color }}
              >
                {currentUser.avatar}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-white truncate max-w-[100px]">
                  @{currentUser.username}
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[100px]">
                  {currentUser.email}
                </div>
              </div>
            </button>

            {/* Profile Menu Popover */}
            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-3 p-2 bg-slate-950/60 rounded-xl mb-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm"
                      style={{ backgroundColor: currentUser.color }}
                    >
                      {currentUser.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">
                        @{currentUser.username}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {currentUser.email}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="px-2.5 py-1.5 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Tarmoq holati:</span>
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <Wifi size={12} />
                        {isConnected ? "Ulangan" : "Kutilmoqda"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      <LogOut size={15} />
                      <span>Akkauntdan chiqish</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
