import React, { useState, useRef, useEffect } from 'react';
import { Mail, CheckCircle2, ShieldCheck, ArrowRight, Sparkles, Copy, Check, UserCheck, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (user: UserProfile) => void;
  defaultEmail?: string;
}

const AVATAR_OPTIONS = ['😎', '🚀', '🦊', '⚡', '🌟', '🦁', '👑', '🎯', '🎨', '💻', '🎧', '🦄', '🔥', '💎', '🦅', '🍀'];
const COLOR_OPTIONS = [
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Rose', hex: '#ec4899' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Sky', hex: '#0ea5e9' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Coral', hex: '#f43f5e' },
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onSuccess, defaultEmail = 'rasulutelbayev@gmail.com' }) => {
  const [step, setStep] = useState<'EMAIL' | 'OTP' | 'USERNAME'>('EMAIL');
  const [email, setEmail] = useState(defaultEmail);
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].hex);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let interval: number;
    if (resendTimer > 0) {
      interval = window.setInterval(() => {
        setResendTimer(t => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  if (!isOpen) return null;

  // Handle Send OTP
  const handleSendCode = async (targetEmail = email) => {
    setError(null);
    if (!targetEmail || !targetEmail.includes('@') || !targetEmail.includes('.')) {
      setError("Iltimos, haqiqiy email manzilini kiriting!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Kod yuborishda xatolik yuz berdi");
      }

      setDevCode(data.devCode);
      setStep('OTP');
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);

      // Focus first OTP input after render
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  // Google quick fill & send
  const handleGoogleQuickAuth = () => {
    setEmail(defaultEmail);
    handleSendCode(defaultEmail);
  };

  // Handle OTP digit changes
  const handleOtpChange = (index: number, value: string) => {
    // Only numbers
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleanVal;
    setOtp(newOtp);

    // Auto-focus next input
    if (cleanVal && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // If all filled, auto-verify
    if (cleanVal && index === 5) {
      const fullCode = newOtp.join('');
      if (fullCode.length === 6) {
        verifyCodeWith(fullCode);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtp(newOtp);

    if (pasted.length === 6) {
      verifyCodeWith(pasted);
    } else if (pasted.length > 0) {
      otpInputsRef.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const autofillDevCode = () => {
    if (!devCode) return;
    const digits = devCode.split('');
    setOtp(digits);
    verifyCodeWith(devCode);
  };

  const copyDevCode = () => {
    if (!devCode) return;
    navigator.clipboard.writeText(devCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Verify OTP
  const verifyCodeWith = async (codeToVerify: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: codeToVerify }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Kod noto'g'ri");
      }

      if (data.isNewUser) {
        // Suggested username from email prefix
        const suggested = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
        setUsername(suggested);
        setStep('USERNAME');
      } else if (data.user) {
        // User already has profile!
        onSuccess(data.user);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Tasdiqlashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  // Complete username
  const handleCompleteUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = username.trim();
    if (!cleanName || cleanName.length < 2) {
      setError("Username kamida 2 ta belgidan iborat bo'lishi kerak!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/set-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          username: cleanName,
          avatar: selectedAvatar,
          color: selectedColor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Profilni saqlashda xatolik");
      }

      onSuccess(data.user);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Steps Indicator */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === 'EMAIL' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            }`}>
              {step !== 'EMAIL' ? '✓' : '1'}
            </span>
            <span className="text-xs font-medium text-slate-300">Email</span>
          </div>
          <div className={`h-0.5 flex-1 mx-2 transition-colors ${step !== 'EMAIL' ? 'bg-emerald-500/50' : 'bg-slate-700'}`} />
          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === 'OTP' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40' : step === 'USERNAME' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
            }`}>
              {step === 'USERNAME' ? '✓' : '2'}
            </span>
            <span className="text-xs font-medium text-slate-300">Kod</span>
          </div>
          <div className={`h-0.5 flex-1 mx-2 transition-colors ${step === 'USERNAME' ? 'bg-emerald-500/50' : 'bg-slate-700'}`} />
          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === 'USERNAME' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40' : 'bg-slate-800 text-slate-400'
            }`}>
              3
            </span>
            <span className="text-xs font-medium text-slate-300">Username</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 bg-red-950/50 border border-red-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-red-200 animate-in fade-in">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* STEP 1: EMAIL */}
        {step === 'EMAIL' && (
          <div className="space-y-5 animate-in fade-in">
            <div className="text-center space-y-1.5">
              <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-1">
                <Mail size={28} />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Global Chatga Kirish
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
                Barcha a'zolar bitta umumiy guruhda jonli muloqot qiladi. Emailingizga tasdiqlash kodi yuboriladi.
              </p>
            </div>

            {/* Quick Google one-tap button */}
            <button
              type="button"
              onClick={handleGoogleQuickAuth}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 text-slate-100 text-sm font-semibold transition-all shadow-sm active:scale-[0.99]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Google orqali kirish ({defaultEmail})</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-800" />
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">yoki boshqa email</span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSendCode(); }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email manzilingiz:
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ismingiz@gmail.com"
                    className="w-full bg-slate-950/60 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Tasdiqlash kodini olish</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: OTP VERIFICATION */}
        {step === 'OTP' && (
          <div className="space-y-5 animate-in fade-in">
            <div className="text-center space-y-1.5">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-1">
                <ShieldCheck size={28} />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Kodni Tasdiqlash
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                <span className="text-indigo-300 font-medium">{email}</span> manziliga 6 xonali tasdiqlash kodi yuborildi.
              </p>
            </div>

            {/* Simulated Live Dev Code Alert with one-click copy and auto-fill */}
            {devCode && (
              <div className="p-3.5 bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/40 rounded-2xl flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2.5">
                  <Sparkles size={18} className="text-amber-400 shrink-0 animate-pulse" />
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-indigo-300 font-semibold">Tasdiqlash kodi:</div>
                    <div className="text-lg font-mono font-extrabold tracking-widest text-white">{devCode}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={copyDevCode}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl flex items-center gap-1 transition-colors"
                    title="Kodni nusxalash"
                  >
                    {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedCode ? 'Nusxalandi' : 'Nusxa'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={autofillDevCode}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                  >
                    To'ldirish
                  </button>
                </div>
              </div>
            )}

            {/* 6 Digit PIN Input Boxes */}
            <div className="flex justify-center gap-2 sm:gap-3 py-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { otpInputsRef.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  onPaste={handleOtpPaste}
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-bold bg-slate-950/70 border-2 border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white rounded-2xl outline-none transition-all"
                />
              ))}
            </div>

            <button
              type="button"
              disabled={loading || otp.join('').length !== 6}
              onClick={() => verifyCodeWith(otp.join(''))}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-sm font-bold rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-40"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Kodni Tasdiqlash</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
              <button
                type="button"
                onClick={() => setStep('EMAIL')}
                className="text-slate-400 hover:text-white underline-offset-4 hover:underline"
              >
                ← Emailni almashtirish
              </button>

              <button
                type="button"
                disabled={resendTimer > 0 || loading}
                onClick={() => handleSendCode()}
                className="text-indigo-400 hover:text-indigo-300 disabled:opacity-50 font-medium"
              >
                {resendTimer > 0 ? `Qayta yuborish (${resendTimer}s)` : "Kodni qayta yuborish"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SET USERNAME & PROFILE */}
        {step === 'USERNAME' && (
          <form onSubmit={handleCompleteUsername} className="space-y-5 animate-in fade-in">
            <div className="text-center space-y-1.5">
              <div className="inline-flex p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-1">
                <UserCheck size={28} />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Foydalanuvchi Nomi
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Guruh a'zolari sizni qanday nom va avatar bilan ko'rishini belgilang.
              </p>
            </div>

            {/* Live Profile Card Preview */}
            <div className="p-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md border-2 border-white/20"
                style={{ backgroundColor: selectedColor }}
              >
                {selectedAvatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white truncate">
                    {username.trim() || 'Foydalanuvchi'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    A'zo
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{email}</p>
              </div>
            </div>

            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username (Foydalanuvchi nomi):
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold text-sm">@</span>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={25}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '_'))}
                  placeholder="masalan: sardorbek_99"
                  className="w-full bg-slate-950/60 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl py-3 pl-9 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all font-medium"
                />
              </div>
            </div>

            {/* Avatar Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Profil avatari:
              </label>
              <div className="grid grid-cols-8 gap-1.5">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedAvatar(emoji)}
                    className={`h-9 rounded-xl flex items-center justify-center text-lg transition-transform active:scale-90 ${
                      selectedAvatar === emoji
                        ? 'bg-indigo-600/50 border-2 border-indigo-400 scale-105 shadow-md'
                        : 'bg-slate-800/60 hover:bg-slate-800 border border-slate-700/40'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Profil foni rangi:
              </label>
              <div className="flex items-center gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setSelectedColor(c.hex)}
                    className={`w-7 h-7 rounded-full transition-transform active:scale-90 ${
                      selectedColor === c.hex ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900 shadow-md' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 text-white text-sm font-bold rounded-2xl shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-40"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Chatga Kirish 🚀</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
