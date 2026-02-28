
import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginProps {
  onForgotPassword?: () => void;
}

const Login: React.FC<LoginProps> = ({ onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSupabaseConfigured) {
      setError("Marketplace configuration missing.");
      return;
    }

    setIsLoading(true);
    setError(null);

    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });
      if (signUpError) setError(signUpError.message);
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) setError(authError.message);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="h-full bg-white flex flex-col px-8 py-16 animate-in fade-in duration-500 relative overflow-hidden">
      <div className="flex flex-col items-center justify-center mt-12 mb-10 text-center">
        <h1 className="text-6xl font-[900] text-[#FF733B] tracking-tighter mb-12 leading-none">
          Hucksta
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          {isSignUp && (
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full Name"
              required
              className="w-full h-14 px-6 bg-[#F6F7F9] rounded-2xl text-gray-800 border-2 border-transparent outline-none focus:bg-white focus:border-[#FF733B] transition-all placeholder-gray-300 font-bold"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full h-14 px-6 bg-[#F6F7F9] rounded-2xl text-gray-800 border-2 border-transparent outline-none focus:bg-white focus:border-[#FF733B] transition-all placeholder-gray-300 font-bold"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full h-14 px-6 bg-[#F6F7F9] rounded-2xl text-gray-800 border-2 border-transparent outline-none focus:bg-white focus:border-[#FF733B] transition-all placeholder-gray-300 font-bold"
          />
        </div>
        
        {error && <p className="text-xs text-red-500 px-1 font-medium">{error}</p>}

        <div className="flex justify-end px-1">
          <button 
            type="button"
            onClick={onForgotPassword}
            className="text-[10px] font-black uppercase tracking-widest text-[#FF733B] hover:text-orange-700 transition-colors"
          >
            Forgot Password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-16 bg-[#FF733B] text-white font-black uppercase tracking-[0.15em] text-xs rounded-[2rem] active:scale-[0.98] transition-all shadow-xl shadow-orange-100/30 disabled:opacity-50 mt-4"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
          ) : (
            isSignUp ? 'Create Account' : 'Continue'
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-[11px] font-black uppercase tracking-widest text-[#FF733B] hover:underline"
        >
          {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
};

export default Login;
