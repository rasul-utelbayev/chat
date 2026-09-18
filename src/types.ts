export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar: string;
  color: string;
  token: string;
  joinedAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  userColor: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  timestamp: number;
  type: 'user' | 'system';
  replyTo?: {
    id: string;
    username: string;
    text?: string;
  };
  reactions?: Record<string, string[]>; // emoji -> list of usernames
}

export interface OnlineUser {
  id: string;
  username: string;
  avatar: string;
  color: string;
  emailPrefix?: string;
  lastActive: number;
}

export type AuthStage = 'EMAIL' | 'OTP' | 'USERNAME' | 'COMPLETED';

export interface WSIncomingMessage {
  type: 'auth' | 'chat_message' | 'typing' | 'reaction' | 'delete_message' | 'ping';
  token?: string;
  userId?: string;
  username?: string;
  avatar?: string;
  color?: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  replyTo?: {
    id: string;
    username: string;
    text?: string;
  };
  messageId?: string;
  emoji?: string;
  isTyping?: boolean;
}

export interface WSOutgoingMessage {
  type: 'init' | 'chat_message' | 'presence_update' | 'typing' | 'reaction_update' | 'message_deleted' | 'pong' | 'error';
  messages?: ChatMessage[];
  message?: ChatMessage;
  onlineUsers?: OnlineUser[];
  onlineCount?: number;
  typingUsers?: string[];
  messageId?: string;
  reactions?: Record<string, string[]>;
  error?: string;
}
