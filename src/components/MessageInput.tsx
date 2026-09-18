import React, { useState, useRef, useEffect } from 'react';
import { Send, Image, Mic, Smile, X, Paperclip } from 'lucide-react';
import { ChatMessage } from '../types';
import { VoiceRecorder } from './VoiceRecorder';

interface MessageInputProps {
  onSendMessage: (payload: {
    text?: string;
    imageUrl?: string;
    audioUrl?: string;
    audioDuration?: number;
    replyTo?: { id: string; username: string; text?: string };
  }) => void;
  onTyping: (isTyping: boolean) => void;
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
}

const COMMON_EMOJIS = [
  '😊', '😂', '🤣', '❤️', '🔥', '👍', '👏', '🎉',
  '🚀', '✨', '😍', '🥳', '😎', '💯', '🤔', '🤝',
  '🙏', '😅', '🙌', '⭐', '💡', '💬', '👀', '⚡',
];

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  replyingTo,
  onCancelReply,
}) => {
  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  // Handle typing debounce
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    // Trigger typing event
    onTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      onTyping(false);
    }, 2500);

    // Auto-resize height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Rasm hajmi 5MB dan oshmasligi kerak");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Paste image handler from clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            setImagePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const addEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = () => {
    const cleanText = text.trim();
    if (!cleanText && !imagePreview) return;

    onSendMessage({
      text: cleanText || undefined,
      imageUrl: imagePreview || undefined,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            username: replyingTo.username,
            text: replyingTo.text,
          }
        : undefined,
    });

    setText('');
    setImagePreview(null);
    onCancelReply();
    onTyping(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSendVoice = (audioUrl: string, duration: number) => {
    onSendMessage({
      audioUrl,
      audioDuration: duration,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            username: replyingTo.username,
            text: replyingTo.text,
          }
        : undefined,
    });
    setIsRecordingVoice(false);
    onCancelReply();
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border-t border-slate-800 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Reply preview bar */}
        {replyingTo && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-2xl animate-in fade-in">
            <div className="flex items-center gap-2 text-xs truncate">
              <span className="text-indigo-400 font-bold">@{replyingTo.username} ga javob:</span>
              <span className="text-slate-300 truncate">{replyingTo.text || "Biriktirilgan fayl"}</span>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
              title="Javobni bekor qilish"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Image upload preview */}
        {imagePreview && (
          <div className="relative inline-block rounded-2xl overflow-hidden border border-slate-700 bg-slate-950/60 p-1">
            <img src={imagePreview} alt="Yuklangan rasm" className="h-24 w-auto rounded-xl object-cover" />
            <button
              type="button"
              onClick={() => setImagePreview(null)}
              className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-black rounded-full text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Voice recording bar or standard input bar */}
        {isRecordingVoice ? (
          <VoiceRecorder
            onSendVoice={handleSendVoice}
            onCancel={() => setIsRecordingVoice(false)}
          />
        ) : (
          <div className="flex items-end gap-2 bg-slate-950/70 border border-slate-800 rounded-3xl p-1.5 focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            {/* Attachment Button */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800/80 rounded-2xl transition-colors shrink-0"
              title="Rasm yuklash"
            >
              <Image size={20} />
            </button>

            {/* Emoji Picker Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 rounded-2xl transition-colors shrink-0"
                title="Emojilar"
              >
                <Smile size={20} />
              </button>

              {showEmojiPicker && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowEmojiPicker(false)}
                  />
                  <div className="absolute bottom-full mb-2 left-0 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-40 grid grid-cols-6 gap-1.5 animate-in fade-in zoom-in-95">
                    {COMMON_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => addEmoji(emoji)}
                        className="w-8 h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-lg hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Main Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              rows={1}
              placeholder="Xabar yozing... (Enter - yuborish)"
              className="flex-1 max-h-32 bg-transparent text-sm text-white placeholder-slate-500 outline-none resize-none py-2 px-1 custom-scrollbar leading-relaxed"
            />

            {/* Voice record button */}
            {!text.trim() && !imagePreview ? (
              <button
                type="button"
                onClick={() => setIsRecordingVoice(true)}
                className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800/80 rounded-2xl transition-colors shrink-0"
                title="Ovozli xabar yozish"
              >
                <Mic size={20} />
              </button>
            ) : (
              /* Send button */
              <button
                type="button"
                onClick={handleSubmit}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all shadow-md shadow-indigo-600/30 shrink-0 active:scale-95"
                title="Yuborish"
              >
                <Send size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
