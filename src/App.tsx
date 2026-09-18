import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, ChatMessage, OnlineUser, WSIncomingMessage, WSOutgoingMessage } from './types';
import { AuthModal } from './components/AuthModal';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';
import { OnlineUsersModal } from './components/OnlineUsersModal';
import { ImageLightbox } from './components/ImageLightbox';
import { soundManager } from './utils/sound';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Restore session from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('global_chat_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.token) {
          setCurrentUser(parsed);
          // Verify with server
          fetch(`/api/auth/me?token=${parsed.token}`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.user) {
                setCurrentUser(data.user);
                localStorage.setItem('global_chat_user', JSON.stringify(data.user));
              }
            })
            .catch(() => {});
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch initial chat state via REST as reliable baseline
  const fetchChatState = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/state');
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
      if (data.onlineUsers) {
        setOnlineUsers(data.onlineUsers);
        setOnlineCount(data.onlineCount || data.onlineUsers.length);
      }
    } catch (err) {
      console.error('Failed to fetch chat state:', err);
    }
  }, []);

  useEffect(() => {
    fetchChatState();
  }, [fetchChatState]);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      if (currentUser) {
        // Authenticate with server
        ws.send(JSON.stringify({
          type: 'auth',
          token: currentUser.token,
          userId: currentUser.id,
          username: currentUser.username,
          avatar: currentUser.avatar,
          color: currentUser.color,
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data: WSOutgoingMessage = JSON.parse(event.data);

        if (data.type === 'init') {
          if (data.messages) setMessages(data.messages);
          if (data.onlineUsers) setOnlineUsers(data.onlineUsers);
          if (data.onlineCount !== undefined) setOnlineCount(data.onlineCount);
        } else if (data.type === 'chat_message' && data.message) {
          const newMsg = data.message;
          setMessages((prev) => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Play sound if not own message
          if (currentUser && newMsg.userId !== currentUser.id && newMsg.username !== currentUser.username) {
            if (newMsg.type === 'system') {
              soundManager.playJoinNotification();
            } else {
              soundManager.playMessageReceived();
            }
          }
        } else if (data.type === 'presence_update') {
          if (data.onlineUsers) setOnlineUsers(data.onlineUsers);
          if (data.onlineCount !== undefined) setOnlineCount(data.onlineCount);
        } else if (data.type === 'typing' && data.typingUsers) {
          const filtered = currentUser
            ? data.typingUsers.filter(u => u !== currentUser.username)
            : data.typingUsers;
          setTypingUsers(filtered);
        } else if (data.type === 'reaction_update' && data.messageId) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === data.messageId
                ? { ...msg, reactions: data.reactions }
                : msg
            )
          );
        } else if (data.type === 'message_deleted' && data.messageId) {
          setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
        }
      } catch (err) {
        console.error('Error handling WS incoming message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Attempt reconnect after 2 seconds
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connectWebSocket();
      }, 2000);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };
  }, [currentUser]);

  // Connect on mount & whenever user changes
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // Sync sound manager enabled state
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.enabled = next;
  };

  // Auth Success handler
  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('global_chat_user', JSON.stringify(user));

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'auth',
        token: user.token,
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        color: user.color,
      }));
    } else {
      connectWebSocket();
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('global_chat_user');
    setCurrentUser(null);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close();
    }
  };

  // Send message
  const handleSendMessage = async (payload: {
    text?: string;
    imageUrl?: string;
    audioUrl?: string;
    audioDuration?: number;
    replyTo?: { id: string; username: string; text?: string };
  }) => {
    if (!currentUser) return;

    soundManager.playMessageSent();

    const wsMsg: WSIncomingMessage = {
      type: 'chat_message',
      userId: currentUser.id,
      username: currentUser.username,
      avatar: currentUser.avatar,
      color: currentUser.color,
      text: payload.text,
      imageUrl: payload.imageUrl,
      audioUrl: payload.audioUrl,
      audioDuration: payload.audioDuration,
      replyTo: payload.replyTo,
    };

    // If socket is open, send via WS
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(wsMsg));
    } else {
      // Fallback REST endpoint
      try {
        await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(wsMsg),
        });
        fetchChatState();
      } catch (err) {
        console.error('Failed to send fallback message:', err);
      }
    }
  };

  // Send typing status
  const handleTyping = (isTyping: boolean) => {
    if (!currentUser || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({
      type: 'typing',
      username: currentUser.username,
      isTyping,
    }));
  };

  // Handle reaction
  const handleReact = (messageId: string, emoji: string) => {
    if (!currentUser) return;

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'reaction',
        messageId,
        emoji,
        username: currentUser.username,
      }));
    }
  };

  // Delete message
  const handleDeleteMessage = (messageId: string) => {
    if (!currentUser) return;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'delete_message',
        messageId,
        userId: currentUser.id,
      }));
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Auth Modal (shown until authenticated) */}
      <AuthModal
        isOpen={!currentUser}
        onSuccess={handleAuthSuccess}
        defaultEmail="rasulutelbayev@gmail.com"
      />

      {currentUser ? (
        <>
          {/* Header */}
          <ChatHeader
            currentUser={currentUser}
            onlineUsers={onlineUsers}
            onlineCount={onlineCount}
            isConnected={isConnected}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            onOpenOnlineList={() => setIsOnlineModalOpen(true)}
            onLogout={handleLogout}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {/* Main Messages View */}
          <main className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative">
            <MessageList
              messages={messages}
              currentUser={currentUser}
              typingUsers={typingUsers}
              searchQuery={searchQuery}
              onReply={(msg) => setReplyingTo(msg)}
              onReact={handleReact}
              onDelete={handleDeleteMessage}
              onViewImage={(url) => setLightboxImage(url)}
            />

            {/* Input Bar */}
            <MessageInput
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
            />
          </main>

          {/* Online Members Modal */}
          <OnlineUsersModal
            isOpen={isOnlineModalOpen}
            onClose={() => setIsOnlineModalOpen(false)}
            onlineUsers={onlineUsers}
            currentUser={currentUser}
          />

          {/* Full-size Image Lightbox */}
          <ImageLightbox
            imageUrl={lightboxImage}
            onClose={() => setLightboxImage(null)}
          />
        </>
      ) : (
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400 font-medium">Chat yuklanmoqda...</span>
          </div>
        </div>
      )}
    </div>
  );
}
