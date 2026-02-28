
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ForgotPasswordProps {
  onBack: () => void;
  onVerified: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack, onVerified }) => {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: any;
    if (isCodeSent && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCodeSent, timer]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setError("Please enter your campus email.");

    setIsLoading(true);
    setError(null);

    // This sends the random code (defaults to 6 digits in Supabase)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, 
      }
    });

    if (error) {
      setError(error.message);
    } else {
      setIsCodeSent(true);
      setTimer(60);
    }
    setIsLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) return setError("Please enter the 6-digit code.");

    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'email'
    });

    if (error) {
      // Trying recovery type fallback
      const { error: recoveryError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'recovery'
      });
      
      if (recoveryError) {
        setError("Invalid code. Please ensure you entered all 6 digits correctly.");
        setIsLoading(false);
        return;
      }
    }

    onVerified();
    setIsLoading(false);
  };

  const resendCode = async () => {
    if (timer > 0) return;
    handleSendOTP({ preventDefault: () => {} } as any);
  };

  if (isCodeSent) {
    return (
      <div className="h-full bg-white flex flex-col px-10 py-20 animate-in slide-in-from-right duration-500">
        <button onClick={() => setIsCodeSent(false)} className="p-3 bg-gray-50 rounded-2xl self-start mb-12 active:scale-90 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="mb-12">
          <h2 className="text-4xl font-black text-gray-900 tracking-tighter mb-3 uppercase leading-none">Check Email</h2>
          <p className="text-sm text-gray-400 font-medium max-w-xs leading-relaxed">
            We sent a <span className="text-[#F15A24] font-black uppercase">6-digit code</span> to <span className="text-[#F15A24] font-black">{email}</span>. 
            Enter it below within <span className="text-gray-900 font-bold">60 seconds</span>.
          </p>
        </div>

        <form onSubmit={handleVerifyOTP} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">6-Digit Verification Code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full h-20 px-6 bg-gray-50 rounded-[2rem] text-center text-4xl tracking-[0.4em] text-gray-900 border-2 border-transparent focus:border-[#F15A24] focus:bg-white outline-none transition-all font-black placeholder-gray-200"
              autoFocus
              required
            />
          </div>

          {error && <p className="text-xs text-red-500 font-medium px-1 text-center">{error}</p>}

          <div className="flex flex-col items-center space-y-6">
            <button
              type="submit"
              disabled={isLoading || otpCode.length !== 6}
              className="w-full h-16 bg-[#F15A24] text-white font-black rounded-[2.25rem] shadow-xl shadow-orange-100 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 uppercase tracking-widest text-xs"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : "Verify & Continue"}
            </button>

            <button 
              type="button"
              onClick={resendCode}
              disabled={timer > 0}
              className={`text-[10px] font-black uppercase tracking-widest transition-colors ${timer > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-[#F15A24] hover:text-orange-700'}`}
            >
              {timer > 0 ? `Resend code in ${timer}s` : "Resend code now"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="h-full bg-white flex flex-col px-10 py-20 animate-in slide-in-from-right duration-400">
      <button onClick={onBack} className="p-3 bg-gray-50 rounded-2xl self-start mb-12 active:scale-90 transition-transform">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="mb-12">
        <h2 className="text-4xl font-black text-gray-900 tracking-tighter mb-3 uppercase leading-none">Forgot Password?</h2>
        <p className="text-sm text-gray-400 font-medium max-w-xs leading-relaxed">
          Enter your campus email and we'll send a <span className="text-[#F15A24] font-black uppercase">6-digit code</span> to reset it.
        </p>
      </div>

      <form onSubmit={handleSendOTP} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Campus Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@university.edu"
            className="w-full h-16 px-6 bg-gray-50 rounded-2xl text-gray-800 border-2 border-transparent focus:border-[#F15A24] focus:bg-white outline-none transition-all font-bold placeholder-gray-300"
            required
          />
        </div>

        {error && <p className="text-xs text-red-500 font-medium px-1">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-16 bg-[#F15A24] text-white font-black rounded-[2rem] shadow-xl shadow-orange-100 active:scale-95 transition-all flex items-center justify-center space-x-3 disabled:opacity-50 uppercase tracking-widest text-xs"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <span>Get 6-Digit Code</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ForgotPassword;
