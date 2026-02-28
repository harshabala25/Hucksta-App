
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface MarketplaceProps {
  session: any;
  onSelectItem?: (item: any) => void;
  onFavoriteChange?: (isSaved: boolean) => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ session, onSelectItem, onFavoriteChange }) => {
  const [activeCategory, setActiveCategory] = useState('Clothing');
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [burstingId, setBurstingId] = useState<string | null>(null);

  const categories = [
    { name: 'Clothing', icon: '👕' },
    { name: 'Furniture', icon: '🪑' },
    { name: 'Electronics', icon: '💻' }
  ];

  useEffect(() => {
    fetchListings();
    if (session?.user?.id) {
      fetchFavorites();
    }

    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('marketplace-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => fetchListings())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session?.user?.id]);

  const fetchListings = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setListings(data);
    } catch (err: any) {
      console.error('Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('listing_id')
        .eq('user_id', session.user.id);
      if (error) throw error;
      if (data) setFavorites(new Set(data.map(f => f.listing_id)));
    } catch (err: any) {
      console.error('Error fetching favorites:', err.message);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    if (!session?.user?.id) return;

    const isFavorited = favorites.has(listingId);
    setBurstingId(listingId);
    setTimeout(() => setBurstingId(null), 400);

    const nextFavorites = new Set(favorites);
    if (isFavorited) nextFavorites.delete(listingId);
    else nextFavorites.add(listingId);
    setFavorites(nextFavorites);

    onFavoriteChange?.(!isFavorited);

    try {
      if (isFavorited) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', session.user.id)
          .eq('listing_id', listingId);
      } else {
        await supabase
          .from('favorites')
          .insert({ user_id: session.user.id, listing_id: listingId });
      }
    } catch (err: any) {
      console.error('Error toggling favorite:', err.message);
    }
  };

  const displayedItems = listings.filter(item => {
    const matchesCategory = item.category === activeCategory;
    if (!matchesCategory) return false;

    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const matchesTitle = item.title?.toLowerCase().includes(query);
    const matchesBrand = item.brand?.toLowerCase().includes(query);
    
    return matchesTitle || matchesBrand;
  });

  const getThumbnail = (imageUrl: string) => {
    if (!imageUrl) return 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400';
    try {
      if (imageUrl.startsWith('[') && imageUrl.endsWith(']')) {
        return JSON.parse(imageUrl)[0];
      }
      return imageUrl;
    } catch (e) {
      return imageUrl;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        {/* Brand Header & Search Bar - Scrolly Part */}
        <div className="bg-white pt-12 px-6 pb-2">
          <div className="text-center mb-8">
            <h1 className="text-[40px] font-[900] text-[#FF733B] tracking-tighter leading-none">Hucksta</h1>
          </div>

          <div className="relative group mb-4">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none z-10 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 group-focus-within:text-[#FF733B] group-hover:text-[#FF733B] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input 
              type="text" 
              placeholder="Search items or brands..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F6F7F9] rounded-2xl py-4 pl-12 pr-6 text-xs font-semibold outline-none transition-all placeholder-gray-400 border-2 border-[#FFF2ED] hover:border-[#FF733B] focus:border-[#FF733B] focus:bg-white focus:shadow-lg focus:shadow-orange-50/50"
            />
          </div>
        </div>

        {/* Sticky Category Tabs */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-xl z-30 px-6 py-4 border-b border-gray-50 flex space-x-3 overflow-x-auto no-scrollbar shadow-sm shadow-black/[0.01]">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`flex items-center space-x-2.5 px-6 py-3.5 rounded-[1.5rem] whitespace-nowrap transition-all active:scale-95 ${
                activeCategory === cat.name 
                  ? 'bg-[#FF733B] text-white shadow-lg shadow-orange-100/50' 
                  : 'bg-[#F6F7F9] text-[#707E8C]'
              }`}
            >
              <span className="text-xl leading-none">{cat.icon}</span>
              <span className={`text-[11px] font-[800] uppercase tracking-[0.1em] ${activeCategory === cat.name ? 'text-white' : 'text-slate-500'}`}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>

        {/* Item Grid */}
        <div className="px-4 pt-6 pb-40">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-[#FF733B] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : displayedItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-500">
              {displayedItems.map((item) => {
                const isOwner = session?.user?.id === item.seller_id;
                return (
                  <div 
                    key={item.id} 
                    onClick={() => onSelectItem?.(item)}
                    className="flex flex-col group active:scale-[0.98] transition-all cursor-pointer bg-white rounded-[2rem] p-1.5 border-2 border-[#F6F7F9] shadow-sm hover:border-[#FF733B] hover:shadow-lg hover:shadow-orange-100/30 overflow-hidden"
                  >
                    <div className="relative aspect-[4/5] rounded-[1.75rem] overflow-hidden mb-2 bg-gray-50">
                      <img 
                        src={getThumbnail(item.image_url)} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      />
                      <div className="image-grain-overlay"></div>

                      <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur px-2 py-1 rounded-lg border border-orange-100 shadow-sm z-10 flex items-center justify-center">
                        <span className="text-[7px] font-black text-[#FF733B] uppercase tracking-widest leading-none">{item.condition}</span>
                      </div>

                      {!isOwner && (
                        <button 
                          onClick={(e) => toggleFavorite(e, item.id)}
                          className={`absolute top-2.5 right-2.5 p-2 rounded-full bg-white shadow-md transition-all active:scale-90 z-10 ${
                            burstingId === item.id ? 'animate-heart-burst' : ''
                          }`}
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`h-3.5 w-3.5 ${favorites.has(item.id) ? 'fill-[#FF733B] text-[#FF733B]' : 'text-[#FF733B]'}`} 
                            fill={favorites.has(item.id) ? "currentColor" : "none"} 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    <div className="flex flex-col space-y-1 px-2.5 pb-2.5 h-20 justify-between">
                      <div>
                        <span className="text-[7px] font-black text-orange-400 uppercase tracking-[0.15em] block h-3 truncate leading-none">
                          {item.brand || item.category}
                        </span>
                        <h3 className="font-black text-[#1A1A1A] text-[11px] tracking-tight line-clamp-2 leading-tight min-h-[1.75rem] uppercase break-words">
                          {item.title}
                        </h3>
                      </div>

                      <div className="flex justify-between items-baseline pt-1">
                        <span className="text-xs font-black text-[#FF733B] tracking-tighter shrink-0">
                          ${Number(item.price).toFixed(2)}
                        </span>
                        <span className="text-[7px] font-bold text-[#1A1A1A] uppercase tracking-wider text-right truncate flex-1 ml-2">
                          {item.location}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No matching items</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
