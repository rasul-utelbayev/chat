import React, { useRef, useEffect, useState } from 'react';
import { ArrowDown, MessageSquareDashed } from 'lucide-react';
import { ChatMessage, UserProfile } from '../types';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: ChatMessage[];
  currentUser: UserProfile;
  typingUsers: string[];
  searchQuery: string;
  onReply: (message: ChatMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
  onViewImage: (imageUrl: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUser,
  typingUsers,
  searchQuery,
  onReply,
  onReact,
  onDelete,
  onViewImage,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Filter messages based on search query
  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) =>
        (m.text && m.text.toLowerCase().includes(searchQuery.toLowerCase())) ||
        m.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  // Scroll to bottom on initial load or new message if already near bottom
  useEffect(() => {
    if (!showScrollBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, typingUsers.length]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottom(distanceFromBottom > 150);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottom(false);
  };

  // Group messages by date
  const formatDateGroup = (ts: number) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Bugun';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Kecha';
    } else {
      return d.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative flex-1 overflow-y-auto px-2 sm:px-6 py-4 space-y-1 custom-scrollbar"
    >
      {filteredMessages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 mb-3">
            <MessageSquareDashed size={28} />
          </div>
          {searchQuery ? (
            <>
              <p className="text-sm font-semibold text-slate-300">Hech qanday xabar topilmadi</p>
              <p className="text-xs text-slate-500 mt-1">"{searchQuery}" so'rovi bo'yicha natija yo'q</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-300">Guruhda hali xabarlar yo'q</p>
              <p className="text-xs text-slate-500 mt-1">Birinchi bo'lib salom yozing va suhbatni boshlang!</p>
            </>
          )}
        </div>
      ) : (
        filteredMessages.map((msg, idx) => {
          const prevMsg = filteredMessages[idx - 1];
          const showDateSeparator =
            !prevMsg ||
            formatDateGroup(prevMsg.timestamp) !== formatDateGroup(msg.timestamp);

          return (
            <React.Fragment key={msg.id}>
              {showDateSeparator && (
                <div className="flex justify-center my-4">
                  <span className="px-3 py-1 rounded-full bg-slate-800/70 border border-slate-700/50 text-[11px] font-semibold text-slate-400 shadow-sm">
                    {formatDateGroup(msg.timestamp)}
                  </span>
                </div>
              )}

              <MessageItem
                message={msg}
                currentUser={currentUser}
                onReply={onReply}
                onReact={onReact}
                onDelete={onDelete}
                onViewImage={onViewImage}
              />
            </React.Fragment>
          );
        })
      )}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 animate-pulse">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.15s]" />
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.3s]" />
          </div>
          <span>
            {typingUsers.join(', ')} {typingUsers.length > 1 ? 'yozishyapti...' : 'yozmoqda...'}
          </span>
        </div>
      )}

      <div ref={bottomRef} className="h-2" />

      {/* Scroll to bottom button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="sticky bottom-4 right-4 ml-auto w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl flex items-center justify-center transition-transform active:scale-95 z-20 border border-indigo-400/40"
          title="Pastga tushish"
        >
          <ArrowDown size={18} />
        </button>
      )}
    </div>
  );
};
