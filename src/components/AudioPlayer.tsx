import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  duration?: number;
  isOwn?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, duration: initialDuration, isOwn }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };

    const onTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(Math.round(audio.currentTime));
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error('Audio playback error:', err);
      });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newPercent = Math.max(0, Math.min(1, clickX / rect.width));
    audioRef.current.currentTime = newPercent * duration;
    setProgress(newPercent * 100);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Mock waveform bars
  const bars = [35, 60, 90, 45, 75, 100, 55, 80, 40, 65, 85, 50, 95, 70, 40, 60, 80, 50];

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-xl max-w-[280px] sm:max-w-[320px] ${
      isOwn ? 'bg-indigo-700/60 text-white' : 'bg-slate-800/80 text-slate-100 border border-slate-700/50'
    }`}>
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
          isOwn ? 'bg-white text-indigo-700 shadow-md' : 'bg-indigo-600 text-white shadow-md'
        }`}
        aria-label={isPlaying ? "Ovozni to'xtatish" : "Ovozni tinglash"}
      >
        {isPlaying ? <Pause size={18} className="fill-current" /> : <Play size={18} className="fill-current ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div
          onClick={handleSeek}
          className="h-8 flex items-center gap-0.5 cursor-pointer py-1"
          title="O'tkazish"
        >
          {bars.map((heightPercent, idx) => {
            const barProgress = (idx / bars.length) * 100;
            const isFilled = progress >= barProgress;
            return (
              <span
                key={idx}
                className="flex-1 rounded-full transition-colors duration-150"
                style={{
                  height: `${heightPercent}%`,
                  backgroundColor: isFilled
                    ? isOwn ? '#ffffff' : '#6366f1'
                    : isOwn ? 'rgba(255, 255, 255, 0.3)' : '#475569',
                }}
              />
            );
          })}
        </div>

        <div className="flex justify-between items-center text-[11px] opacity-85 font-mono px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span className="flex items-center gap-1">
            <Volume2 size={11} className="opacity-70" />
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};
