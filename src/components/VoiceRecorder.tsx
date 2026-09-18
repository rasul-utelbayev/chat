import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Trash2 } from 'lucide-react';

interface VoiceRecorderProps {
  onSendVoice: (audioUrl: string, duration: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoice, onCancel }) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopMediaStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopMediaStream = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
      };

      mediaRecorder.start();
      setRecording(true);

      timerRef.current = window.setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Mikrofon ruxsati berilmadi:', err);
      setError("Mikrofon ruxsati berilmadi yoki mavjud emas");
    }
  };

  const finishRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      stopMediaStream();
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSend = () => {
    if (!audioBlob) {
      // If still recording, finish and send
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const base64data = reader.result as string;
            onSendVoice(base64data, Math.max(1, seconds));
          };
        };
        mediaRecorderRef.current.stop();
        stopMediaStream();
        if (timerRef.current) clearInterval(timerRef.current);
      }
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      onSendVoice(base64data, Math.max(1, seconds));
    };
  };

  const handleDiscard = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    stopMediaStream();
    if (timerRef.current) clearInterval(timerRef.current);
    onCancel();
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  if (error) {
    return (
      <div className="flex items-center justify-between gap-3 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-200 text-sm">
        <span>{error}</span>
        <button
          type="button"
          onClick={handleDiscard}
          className="px-3 py-1 bg-red-800/60 hover:bg-red-700 text-white rounded-lg text-xs"
        >
          Yopish
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 p-2.5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl animate-in fade-in">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleDiscard}
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-xl transition-colors"
          title="Bekor qilish"
        >
          <Trash2 size={18} />
        </button>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-ping absolute"></span>
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full relative"></span>
          </div>
          <span className="text-sm font-mono font-medium text-red-300">
            {formatTimer(seconds)}
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            {recording ? "Ovoz yozilmoqda..." : "Yozuv tayyor"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {recording ? (
          <button
            type="button"
            onClick={finishRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl font-medium transition-colors"
          >
            <Square size={14} className="fill-current text-amber-400" />
            To'xtatish
          </button>
        ) : null}

        <button
          type="button"
          onClick={handleSend}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
        >
          <Send size={14} />
          Yuborish
        </button>
      </div>
    </div>
  );
};
