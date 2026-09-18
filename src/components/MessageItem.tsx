import React, { useState } from 'react';
import { Reply, Trash2, Smile, Clock, CheckCheck, ZoomIn } from 'lucide-react';
import { ChatMessage, UserProfile } from '../types';
import { AudioPlayer } from './AudioPlayer';

interface MessageItemProps {
  message: ChatMessage;
  currentUser: UserProfile;
  onReply: (message: ChatMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
  onViewImage: (imageUrl: string) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '👏', '🎉'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUser,
  onReply,
  onReact,
  onDelete,
  onViewImage,
}) => {
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);
  const isOwn = message.userId === currentUser.id || message.username === currentUser.username;
  const isSystem = message.type === 'system';

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins}`;
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 shadow-sm">
          <span>{message.userAvatar || '✨'}</span>
          <span className="font-medium">{message.text}</span>
          <span className="text-[10px] text-slate-500">{formatTime(message.timestamp)}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex items-end gap-2.5 my-2.5 px-2 transition-all ${
        isOwn ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar (for other users) */}
      {!isOwn ? (
        <div
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center text-sm sm:text-base shrink-0 shadow-md border border-white/10 select-none"
          style={{ backgroundColor: message.userColor || '#6366f1' }}
          title={message.username}
        >
          {message.userAvatar || '👤'}
        </div>
      ) : null}

      {/* Message Bubble Container */}
      <div className={`relative max-w-[85%] sm:max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Username Header (if other user) */}
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1 px-1">
            <span
              className="text-xs font-bold tracking-tight"
              style={{ color: message.userColor || '#818cf8' }}
            >
              @{message.username}
            </span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`relative rounded-3xl p-3 sm:p-3.5 shadow-md break-words ${
            isOwn
              ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-xs border border-indigo-500/30'
              : 'bg-slate-800/95 text-slate-100 rounded-bl-xs border border-slate-700/70'
          }`}
        >
          {/* Reply Quote preview */}
          {message.replyTo && (
            <div
              className={`mb-2 p-2 rounded-xl text-xs border-l-3 ${
                isOwn
                  ? 'bg-indigo-900/60 border-indigo-300 text-indigo-100'
                  : 'bg-slate-900/70 border-indigo-500 text-slate-300'
              }`}
            >
              <div className="font-bold text-[11px] opacity-90">
                @{message.replyTo.username}
              </div>
              <div className="truncate opacity-80 text-[11px]">
                {message.replyTo.text || "Biriktirilgan fayl"}
              </div>
            </div>
          )}

          {/* Image */}
          {message.imageUrl && (
            <div className="mb-2 relative rounded-2xl overflow-hidden group/img cursor-pointer max-w-sm">
              <img
                src={message.imageUrl}
                alt="Chat rasmi"
                className="w-full max-h-72 object-cover rounded-2xl hover:scale-[1.01] transition-transform"
                onClick={() => onViewImage(message.imageUrl!)}
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => onViewImage(message.imageUrl!)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-xl text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          )}

          {/* Voice Audio Note */}
          {message.audioUrl && (
            <div className="mb-1">
              <AudioPlayer src={message.audioUrl} duration={message.audioDuration} isOwn={isOwn} />
            </div>
          )}

          {/* Message Text */}
          {message.text && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap select-text">
              {message.text}
            </p>
          )}

          {/* Footer Time & Status inside bubble */}
          <div
            className={`flex items-center gap-1.5 mt-1 text-[10px] select-none ${
              isOwn ? 'text-indigo-200 justify-end' : 'text-slate-400 justify-start'
            }`}
          >
            <span>{formatTime(message.timestamp)}</span>
            {isOwn && <CheckCheck size={13} className="text-indigo-200" />}
          </div>
        </div>

        {/* Reaction Badges */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 px-1">
            {Object.entries(message.reactions).map(([emoji, users]) => {
              const hasReacted = users.includes(currentUser.username);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(message.id, emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                    hasReacted
                      ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                  title={`${users.join(', ')}`}
                >
                  <span>{emoji}</span>
                  <span className="text-[11px] font-semibold">{users.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Menu on Hover (Reply, React, Delete) */}
      <div
        className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-800/90 border border-slate-700 rounded-2xl p-1 shadow-lg backdrop-blur-sm z-10 ${
          isOwn ? 'order-first' : 'order-last'
        }`}
      >
        {/* Quick Reactions */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowReactionsMenu(!showReactionsMenu)}
            className="p-1.5 text-slate-400 hover:text-amber-400 rounded-xl hover:bg-slate-700/60 transition-colors"
            title="Reaktsiya bildirish"
          >
            <Smile size={16} />
          </button>

          {showReactionsMenu && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowReactionsMenu(false)}
              />
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl z-30 animate-in fade-in zoom-in-90">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onReact(message.id, emoji);
                      setShowReactionsMenu(false);
                    }}
                    className="w-8 h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-base hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Reply */}
        <button
          type="button"
          onClick={() => onReply(message)}
          className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-xl hover:bg-slate-700/60 transition-colors"
          title="Javob qaytarish"
        >
          <Reply size={16} />
        </button>

        {/* Delete (if author) */}
        {isOwn && (
          <button
            type="button"
            onClick={() => onDelete(message.id)}
            className="p-1.5 text-slate-400 hover:text-red-400 rounded-xl hover:bg-slate-700/60 transition-colors"
            title="Xabarni o'chirish"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
