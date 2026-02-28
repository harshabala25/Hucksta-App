import React, { useState, useEffect } from 'react';
import EditProfile from './EditProfile';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface ProfileProps {
  session: any;
  onSelectItem?: (item: any) => void;
  onGoHome?: () => void;
}

const Profile: React.FC<ProfileProps> = ({ session, onSelectItem, onGoHome }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'favorites'>('active');
  const [isEditing, setIsEditing] = useState(false);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [favoriteListings, setFavoriteListings] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const GENERIC_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='35' fill='white'/%3E%3Crect x='2' y='2' width='96' height='96' rx='34' fill='none' stroke='%23FF8C42' stroke-width='1.5' stroke-opacity='0.2'/%3E%3Ccircle cx='50' cy='44' r='18' fill='%23B0B0B0'/%3E%3Cpath d='M22 86c0-15 12-25 28-25s28 10 28 25v4H22v-4z' fill='%23B0B0B0'/%3E%3C/svg%3E";

  useEffect(() => {
    fetchAllData();
    if (isSupabaseConfigured && session?.user?.id) {
      const channel = supabase
        .channel('profile-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => fetchMyListings())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'favorites' }, () => fetchFavorites())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchProfile())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [session?.user?.id]);

  const fetchAllData = async () => {
    if (!isSupabaseConfigured || !session?.user?.id) return setLoading(false);
    setLoading(true);
    await Promise.all([fetchMyListings(), fetchFavorites(), fetchProfile()]);
    setLoading(false);
  };

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    if (data) setProfile(data);
  };

  const fetchMyListings = async () => {
    const { data } = await supabase.from('listings').select('*').eq('seller_id', session.user.id).order('created_at', { ascending: false });
    if (data) setMyListings(data);
  };

  const fetchFavorites = async () => {
    const { data: favs } = await supabase.from('favorites').select('listing_id').eq('user_id', session.user.id);
    if (favs && favs.length > 0) {
      const { data: items } = await supabase.from('listings').select('*').in('id', favs.map(f => f.listing_id));
      setFavoriteListings(items || []);
    } else {
      setFavoriteListings([]);
    }
  };

  const handleLogout = async () => isSupabaseConfigured && await supabase.auth.signOut();

  const getThumbnail = (imageUrl: string) => {
    if (!imageUrl) return 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400';
    try { return imageUrl.startsWith('[') ? JSON.parse(imageUrl)[0] : imageUrl; } catch { return imageUrl; }
  };

  if (isEditing) return (
    <EditProfile 
      user={{ 
        firstName: profile?.full_name?.split(' ')[0] || '', 
        lastName: profile?.full_name?.split(' ').slice(1).join(' ') || '', 
        username: profile?.username || '', 
        avatar: profile?.avatar_url || GENERIC_AVATAR 
      }} 
      session={session} 
      onBack={() => setIsEditing(false)} 
    />
  );

  const displayName = profile?.full_name || session?.user?.email?.split('@')[0] || 'User';
  const displayAvatar = profile?.avatar_url || GENERIC_AVATAR;

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="relative h-64 bg-[#FF733B] p-8 flex flex-col justify-end overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/20 to-transparent"></div>
        
        <button 
          onClick={handleLogout} 
          className="absolute top-12 right-6 bg-white/20 p-2.5 rounded-2xl text-white backdrop-blur-md active:scale-90 border border-white/10 z-20 transition-all hover:bg-white/30"
          aria-label="Logout"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 2L3 4.5C2.4 4.7 2 5.2 2 5.8V18.2C2 18.8 2.4 19.3 3 19.5L10 22V2Z" />
            <circle cx="7.5" cy="12" r="0.8" className="fill-white/80" />
            <path d="M12 5H20V9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M12 19H20V15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M12 12H21.5M21.5 12L18.5 9M21.5 12L18.5 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
        
        <div className="flex items-center space-x-5 relative z-10">
          <div className="relative group cursor-pointer" onClick={() => setIsEditing(true)}>
            <img 
              src={displayAvatar} 
              className="w-20 h-20 rounded-[2rem] border-4 border-white/20 object-cover shadow-2xl group-hover:brightness-90 transition-all bg-white" 
              alt="Profile" 
            />
            <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-xl shadow-lg border border-gray-100 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-[#FF733B]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </div>
          </div>
          <div className="text-white">
            <h2 className="text-2xl font-black drop-shadow-sm">{displayName}</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] bg-white text-[#FF733B] px-2 py-0.5 rounded-md inline-block backdrop-blur-sm shadow-sm mt-1">@{profile?.username || 'student'}</p>
          </div>
        </div>
      </div>

      <div className="flex bg-white border-b border-gray-100 sticky top-0 z-20">
        <button onClick={() => setActiveTab('active')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.15em] relative transition-all ${activeTab === 'active' ? 'text-[#FF733B]' : 'text-gray-400'}`}>
          My Items ({myListings.length})
          {activeTab === 'active' && <div className="absolute bottom-0 left-8 right-8 h-1 bg-[#FF733B] rounded-t-full"></div>}
        </button>
        <button onClick={() => setActiveTab('favorites')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.15em] relative transition-all ${activeTab === 'favorites' ? 'text-[#FF733B]' : 'text-gray-400'}`}>
          Favorites ({favoriteListings.length})
          {activeTab === 'favorites' && <div className="absolute bottom-0 left-8 right-8 h-1 bg-[#FF733B] rounded-t-full"></div>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30 pb-32 no-scrollbar">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#FF733B] border-t-transparent rounded-full animate-spin"></div></div>
        ) : (activeTab === 'active' ? myListings : favoriteListings).length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {(activeTab === 'active' ? myListings : favoriteListings).map((item) => (
              <div key={item.id} onClick={() => onSelectItem?.(item)} className="bg-white p-1.5 rounded-[1.75rem] border-2 border-[#F6F7F9] shadow-sm active:scale-[0.98] transition-all cursor-pointer hover:border-[#FF733B] hover:shadow-lg hover:shadow-orange-100/30 overflow-hidden">
                <div className="relative aspect-[4/5] rounded-[1.5rem] overflow-hidden mb-2 bg-gray-50">
                  <img src={getThumbnail(item.image_url)} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" alt={item.title} />
                </div>
                <div className="flex flex-col space-y-1 px-2 pb-2 h-20 justify-between">
                  <div>
                    <span className="text-[7px] font-black text-orange-400 uppercase tracking-[0.15em] block h-3 truncate leading-none">
                      {item.brand || item.category}
                    </span>
                    <h3 className="font-black text-[#1A1A1A] text-[11px] tracking-tight line-clamp-2 leading-tight min-h-[1.75rem] uppercase break-words">
                      {item.title}
                    </h3>
                  </div>
                  <div className="flex justify-between items-baseline pt-1">
                    <p className="text-[#FF733B] font-black text-xs tracking-tighter">${Number(item.price).toFixed(2)}</p>
                    <span className="text-[7px] font-bold text-[#B0B0B0] uppercase tracking-wider text-right truncate flex-1 ml-2">
                      {item.location}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-10 border-2 border-dashed border-gray-100 rounded-[3rem] mx-4 my-8">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] leading-relaxed">No Results</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 bg-white sticky bottom-0 flex space-x-3 z-30 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
        <button onClick={() => setIsEditing(true)} className="flex-1 border-2 border-[#FF733B] text-[#FF733B] font-black py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all">Edit Identity</button>
        <button onClick={onGoHome} className="flex-1 bg-[#FF733B] text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-orange-100 active:scale-95 transition-all">Marketplace</button>
      </div>
    </div>
  );
};

export default Profile;