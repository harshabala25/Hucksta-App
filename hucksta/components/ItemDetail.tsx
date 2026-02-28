
import React, { useState, useMemo, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface ItemDetailProps {
  item: any;
  session: any;
  onBack: () => void;
  onFavoriteChange?: (isSaved: boolean) => void;
  onMessage: (conversationId?: string | null) => void;
}

const ItemDetail: React.FC<ItemDetailProps> = ({ item, session, onBack, onFavoriteChange, onMessage }) => {
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [isMessaging, setIsMessaging] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isBursting, setIsBursting] = useState(false);
  const [sellerProfile, setSellerProfile] = useState<{full_name: string, avatar_url: string, username: string} | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const GENERIC_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='35' fill='white'/%3E%3Crect x='2' y='2' width='96' height='96' rx='34' fill='none' stroke='%23FF8C42' stroke-width='1.5' stroke-opacity='0.2'/%3E%3Ccircle cx='50' cy='44' r='18' fill='%23B0B0B0'/%3E%3Cpath d='M22 86c0-15 12-25 28-25s28 10 28 25v4H22v-4z' fill='%23B0B0B0'/%3E%3C/svg%3E";

  const myId = session?.user?.id;
  const sellerId = item.seller_id;
  
  const isOwner = useMemo(() => {
    if (!myId || !sellerId) return false;
    return String(myId).trim().toLowerCase() === String(sellerId).trim().toLowerCase();
  }, [myId, sellerId]);

  const photos = useMemo(() => {
    if (!item.image_url) return [];
    try { 
      return item.image_url.startsWith('[') ? JSON.parse(item.image_url) as string[] : [item.image_url]; 
    } catch { 
      return [item.image_url]; 
    }
  }, [item.image_url]);

  useEffect(() => {
    const init = async () => {
      if (!isSupabaseConfigured) return;
      const [{data: seller}, {data: fav}] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url, username').eq('id', item.seller_id).maybeSingle(),
        session?.user?.id ? supabase.from('favorites').select('id').eq('user_id', session.user.id).eq('listing_id', item.id).maybeSingle() : Promise.resolve({data: null})
      ]);
      if (seller) setSellerProfile(seller);
      setIsFavorited(!!fav);
    };
    init();
  }, [item.id, item.seller_id, session?.user?.id]);

  const nextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setImageLoaded(false);
    setCurrentPhotoIdx((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setImageLoaded(false);
    setCurrentPhotoIdx((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const toggleFavorite = async () => {
    if (!session?.user?.id) return;
    const next = !isFavorited;
    setIsFavorited(next);
    setIsBursting(true);
    setTimeout(() => setIsBursting(false), 400);
    onFavoriteChange?.(next);
    
    if (!next) {
      await supabase.from('favorites').delete().eq('user_id', session.user.id).eq('listing_id', item.id);
    } else {
      await supabase.from('favorites').insert({ user_id: session.user.id, listing_id: item.id });
    }
  };

  const handleMessageSeller = async () => {
    if (!session?.user?.id || isMessaging) return;
    setIsMessaging(true);
    try {
      const { data: found } = await supabase
        .from('conversations')
        .select('id, buyer_id, seller_id')
        .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`);

      const existing = found?.find(c => 
        (c.buyer_id === session.user.id && c.seller_id === item.seller_id) || 
        (c.buyer_id === item.seller_id && c.seller_id === session.user.id)
      );

      if (existing) return onMessage(existing.id);

      const { data: created, error } = await supabase
        .from('conversations')
        .insert({ buyer_id: session.user.id, seller_id: item.seller_id, listing_id: item.id })
        .select()
        .single();

      if (created) onMessage(created.id);
      else if (error) throw error;
    } catch (err: any) {
      console.error('Messaging Error:', err);
    } finally { setIsMessaging(false); }
  };

  const performDelete = async () => {
    setShowConfirm(false);
    setIsDeleting(true);
    
    try {
      const { error, count } = await supabase
        .from('listings')
        .delete({ count: 'exact' })
        .eq('id', item.id)
        .eq('seller_id', myId);

      if (error || count === 0) throw new Error(error?.message || "Delete failed");

      setDeleteSuccess(true);
      setTimeout(() => onBack(), 1200);
    } catch (err: any) {
      setIsDeleting(false);
      alert('Delete Failed: Please refresh and try again.');
    }
  };

  const isClothing = item.category === 'Clothing';
  const displaySellerAvatar = sellerProfile?.avatar_url || GENERIC_AVATAR;

  return (
    <div className="h-full bg-white overflow-y-auto no-scrollbar pb-32">
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowConfirm(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-t-[2.5rem] p-10 shadow-2xl animate-in slide-in-from-bottom duration-400">
            <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-8"></div>
            <div className="text-center mb-10">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">Delete Item?</h2>
              <p className="text-sm text-gray-400 font-medium">This cannot be undone. Listing will be removed from the marketplace.</p>
            </div>
            <div className="space-y-3">
              <button onClick={performDelete} className="w-full bg-[#FF733B] text-white font-black py-5 rounded-[1.5rem] text-[11px] uppercase tracking-widest active:scale-95 transition-all">Confirm Delete</button>
              <button onClick={() => setShowConfirm(false)} className="w-full bg-gray-50 text-gray-500 font-black py-5 rounded-[1.5rem] text-[11px] uppercase tracking-widest active:scale-95 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="relative bg-white pt-10 px-4">
        <div className="absolute top-10 left-6 z-20 flex w-full pr-12 justify-between items-center">
          <button onClick={onBack} className="bg-white/90 backdrop-blur-sm p-2.5 rounded-xl shadow-lg border-2 border-gray-50 active:scale-90 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          {!isOwner && (
            <button onClick={toggleFavorite} className={`bg-white/90 backdrop-blur-sm p-2.5 rounded-xl shadow-lg border-2 border-gray-50 active:scale-90 transition-all ${isBursting ? 'animate-heart-burst' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} fill={isFavorited ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </button>
          )}
        </div>

        <div className="aspect-[4/5] flex items-center justify-center relative overflow-hidden rounded-[2.5rem] bg-gray-50 group border-2 border-gray-100 shadow-inner">
          {deleteSuccess ? (
            <div className="flex flex-col items-center animate-envelope-pop">
              <div className="bg-emerald-500 p-6 rounded-full mb-4 shadow-xl shadow-emerald-100"><svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg></div>
              <p className="font-black text-emerald-600 uppercase tracking-widest text-[10px]">Item Deleted</p>
            </div>
          ) : (
            <>
              {/* Main Image */}
              <div className={`w-full h-full transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}>
                <img 
                  src={photos[currentPhotoIdx]} 
                  className="w-full h-full object-cover cursor-pointer" 
                  alt={item.title} 
                  onLoad={() => setImageLoaded(true)}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    if (x > rect.width / 2) nextPhoto();
                    else prevPhoto();
                  }}
                />
              </div>
              
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-orange-200 border-t-[#FF733B] rounded-full animate-spin"></div>
                </div>
              )}
              
              {/* Photo Navigation Overlays */}
              {photos.length > 1 && (
                <>
                  <button 
                    onClick={prevPhoto}
                    className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/40 hover:bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg text-gray-900 active:scale-75 transition-all opacity-0 group-hover:opacity-100 border-2 border-white/20"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button 
                    onClick={nextPhoto}
                    className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/40 hover:bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg text-gray-900 active:scale-75 transition-all opacity-0 group-hover:opacity-100 border-2 border-white/20"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col items-center mt-6 space-y-2">
          <div className="flex space-x-1.5">
            {photos.map((_, i) => (
              <button 
                key={i} 
                onClick={() => {
                  setImageLoaded(false);
                  setCurrentPhotoIdx(i);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentPhotoIdx ? 'w-6 bg-[#FF733B]' : 'w-1.5 bg-gray-200'}`}
              ></button>
            ))}
          </div>
          <span className="text-[10px] font-black text-gray-300 tracking-[0.2em] uppercase">
            Frame {currentPhotoIdx + 1} of {photos.length}
          </span>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="flex justify-between items-start mb-10">
          <div className="flex-1 pr-4">
            <h1 className="text-xl font-black text-gray-900 leading-tight mb-2 tracking-tight uppercase">{item.title}</h1>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-black text-[#FF733B] uppercase tracking-widest">{item.brand || 'UTD ORIGINAL'}</span>
              <div className="w-4 h-4 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center border-2 border-emerald-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>
          </div>
          <div className="bg-white border-[3px] border-orange-100 px-4 py-3 rounded-3xl shadow-sm flex flex-col items-end">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Asking</span>
            <span className="text-xl font-black text-orange-700 tracking-tighter">${Number(item.price).toFixed(2)}</span>
          </div>
        </div>

        <div className="w-full h-px bg-gray-100 mb-8"></div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 p-5 rounded-3xl border-2 border-orange-100">
            <span className="text-[10px] text-[#FF733B] font-black uppercase tracking-widest block mb-1">State</span>
            <span className="text-sm font-bold text-gray-900">{item.condition}</span>
          </div>
          {isClothing && (
            <div className="bg-gray-50 p-5 rounded-3xl border-2 border-orange-100">
              <span className="text-[10px] text-[#FF733B] font-black uppercase tracking-widest block mb-1">Fit</span>
              <span className="text-sm font-bold text-gray-900">{item.size || 'Unspecified'}</span>
            </div>
          )}
          <div className="bg-gray-50 p-5 rounded-3xl border-2 border-orange-100">
            <span className="text-[10px] text-[#FF733B] font-black uppercase tracking-widest block mb-1">Category</span>
            <span className="text-sm font-bold text-gray-900">{item.category}</span>
          </div>
        </div>

        <div className="bg-gray-50 p-5 rounded-3xl border-2 border-orange-100 mb-4">
          <div className="flex items-center space-x-2 mb-1.5">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#FF733B]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             <span className="text-[10px] text-[#FF733B] font-black uppercase tracking-widest">Pickup Location</span>
          </div>
          <span className="text-sm font-bold text-gray-900">{item.location}</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border-2 border-orange-100 mb-10 shadow-sm">
          <span className="text-[10px] text-[#FF733B] font-black uppercase tracking-widest block mb-3">Product Brief</span>
          <p className="text-sm font-medium text-gray-600 leading-relaxed break-words">
            {item.description || 'No detailed specifications provided.'}
          </p>
        </div>

        <div className="bg-[#F8FAF9] rounded-[3rem] p-8 border-2 border-orange-100">
          <h3 className="text-[11px] font-black text-[#FF733B] uppercase tracking-[0.2em] mb-8">Seller</h3>
          <div className="flex items-center space-x-5 mb-10">
            <div className="relative">
              <img 
                src={displaySellerAvatar} 
                className="w-16 h-16 rounded-[1.5rem] bg-white object-cover shadow-md border-2 border-gray-100 p-0.5" 
                alt="Seller Avatar" 
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-[#F8FAF9] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>
            <div className="overflow-hidden">
              <h4 className="font-black text-gray-900 text-lg tracking-tight uppercase truncate">{sellerProfile?.full_name || 'Anonymous Comet'}</h4>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-0.5">@{sellerProfile?.username || 'student'}</p>
            </div>
          </div>

          {isOwner ? (
            <button 
              onClick={() => setShowConfirm(true)}
              className="w-full bg-white border-2 border-red-50 text-red-400 font-black py-5 rounded-[1.5rem] text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-sm flex items-center justify-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <span>{isDeleting ? 'Deleting...' : 'De-list Product'}</span>
            </button>
          ) : (
            <button 
              onClick={handleMessageSeller} 
              disabled={isMessaging}
              className="w-full bg-[#FF733B] text-white font-black py-5 rounded-[1.5rem] text-[11px] uppercase tracking-[0.2em] flex items-center justify-center space-x-3 active:scale-95 transition-all shadow-xl shadow-orange-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <span>{isMessaging ? 'Initializing...' : 'Open Chat'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemDetail;
