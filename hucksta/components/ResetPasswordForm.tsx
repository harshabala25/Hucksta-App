
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface ResetPasswordFormProps {
  onComplete: () => void;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setError(error.message);
    } else {
      alert("Password updated successfully!");
      onComplete();
    }
    setIsLoading(false);
  };

  return (
    <div className="h-full bg-white flex flex-col px-10 py-20 animate-in slide-in-from-bottom duration-500">
      <div className="mb-12">
        <h2 className="text-4xl font-black text-gray-900 tracking-tighter mb-3 uppercase leading-none">New Password</h2>
        <p className="text-sm text-gray-400 font-medium max-w-xs leading-relaxed">
          Set a secure new password for your Hucksta account.
        </p>
      </div>

      <form onSubmit={handleReset} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">New Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full h-16 px-6 bg-[#F6F7F9] rounded-2xl text-gray-800 border-2 border-transparent outline-none focus:bg-white focus:border-[#F15A24] transition-all font-bold placeholder-gray-300"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full h-16 px-6 bg-[#F6F7F9] rounded-2xl text-gray-800 border-2 border-transparent outline-none focus:bg-white focus:border-[#F15A24] transition-all font-bold placeholder-gray-300"
            required
          />
        </div>

        {error && <p className="text-xs text-red-500 font-medium px-1">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-16 bg-[#F15A24] text-white font-black rounded-[2rem] shadow-xl shadow-orange-100 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 uppercase tracking-widest text-xs"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : "Update Password"}
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordForm;
