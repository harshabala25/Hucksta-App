
import React, { useState, useEffect, useCallback } from 'react';
import { Tab, Category } from './types';
import Navigation from './components/Navigation';
import SellFlow from './components/SellFlow';
import Profile from './components/Profile';
import Marketplace from './components/Marketplace';
import Messages from './components/Messages';
import ItemDetail from './components/ItemDetail';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ResetPasswordForm from './components/ResetPasswordForm';
import { supabase, isSupabaseConfigured } from './lib/supabase';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);
  const [view, setView] = useState<'main' | 'forgot_password' | 'reset_password'>('main');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | undefined>(undefined);

  const GENERIC_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='35' fill='white'/%3E%3Crect x='2' y='2' width='96' height='96' rx='34' fill='none' stroke='%23FF8C42' stroke-width='1.5' stroke-opacity='0.2'/%3E%3Ccircle cx='50' cy='44' r='18' fill='%23B0B0B0'/%3E%3Cpath d='M22 86c0-15 12-25 28-25s28 10 28 25v4H22v-4z' fill='%23B0B0B0'/%3E%3C/svg%3E";

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) ensureProfileExists(session.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') setView('reset_password');
      if (session?.user) {
        ensureProfileExists(session.user);
      } else {
        setUserAvatar(undefined);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const ensureProfileExists = async (user: any) => {
    try {
      const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
      if (!profile) {
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'New Comet';
        const username = user.user_metadata?.username || user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || `user${user.id.slice(0, 4)}`;
        
        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: fullName,
          username: username,
          avatar_url: GENERIC_AVATAR,
          updated_at: new Date().toISOString()
        });
        setUserAvatar(GENERIC_AVATAR);
      } else {
        setUserAvatar(profile.avatar_url || GENERIC_AVATAR);
      }
    } catch (err) {
      console.error('Profile sync error:', err);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setViewingItem(null);
    setOpenConversationId(null);
    if (tab !== Tab.SELL) setSelectedCategory(null);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (view === 'reset_password') return <ResetPasswordForm onComplete={() => setView('main')} />;
  if (!session) {
    if (view === 'forgot_password') return <ForgotPassword onBack={() => setView('main')} onVerified={() => setView('reset_password')} />;
    return <Login onForgotPassword={() => setView('forgot_password')} />;
  }

  const renderContent = () => {
    if (viewingItem) {
      return (
        <ItemDetail 
          item={viewingItem} 
          session={session}
          onBack={() => setViewingItem(null)}
          onMessage={(convId) => {
            setViewingItem(null);
            setOpenConversationId(convId || null);
            setActiveTab(Tab.MESSAGES);
          }}
        />
      );
    }

    switch (activeTab) {
      case Tab.HOME: return <Marketplace session={session} onSelectItem={setViewingItem} />;
      case Tab.MESSAGES: return <Messages session={session} initialConversationId={openConversationId} />;
      case Tab.SELL:
        return (
          <SellFlow 
            category={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onCancel={() => handleTabChange(Tab.HOME)}
            onSuccess={() => handleTabChange(Tab.HOME)}
            session={session}
          />
        );
      case Tab.PROFILE: return <Profile session={session} onSelectItem={setViewingItem} onGoHome={() => handleTabChange(Tab.HOME)} />;
      default: return null;
    }
  };

  return (
    <div className="h-screen w-full max-md:max-w-md mx-auto bg-white relative shadow-2xl overflow-hidden flex flex-col">
      <div className="flex-1 relative overflow-hidden">{renderContent()}</div>
      {!viewingItem && (
        <Navigation 
          activeTab={activeTab} 
          userAvatar={userAvatar}
          onTabChange={handleTabChange} 
        />
      )}
    </div>
  );
};

export default App;
