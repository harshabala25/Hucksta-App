import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface Message {
  id: string;
  text: string;
  sender_id: string;
  conversation_id: string;
  created_at: string;
}

interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  other_user_id: string;
}

interface MessagesProps {
  session: any;
  initialConversationId?: string | null;
}

const Messages: React.FC<MessagesProps> = ({ session, initialConversationId }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [userHandles, setUserHandles] = useState<Record<string, string>>({});
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [unreadConversationIds, setUnreadConversationIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const GENERIC_AVATAR = "https://t4.ftcdn.net/jpg/02/15/84/43/360_F_215844325_ttX9vtII6CHedAMhp8asW807z9vhS6CI.jpg";
  const currentUserId = session?.user?.id;

  useEffect(() => {
    if (currentUserId) {
      fetchConversations(currentUserId);
      setupGlobalMessageListener();
    } else {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!initialConversationId || conversations.length === 0) return;
    const match = conversations.find((c) => c.id === initialConversationId);
    if (match) handleSelectConversation(match);
  }, [initialConversationId, conversations]);

  const setupGlobalMessageListener = () => {
    if (!isSupabaseConfigured || !currentUserId) return;

    const channel = supabase
      .channel('global-unread-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const newMsg = payload.new as Message;
        if (newMsg.sender_id !== currentUserId && (!selectedConversation || selectedConversation.id !== newMsg.conversation_id)) {
          setUnreadConversationIds(prev => new Set(prev).add(newMsg.conversation_id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const fetchConversations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`id, listing_id, buyer_id, seller_id, created_at`)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const grouped = data.reduce((acc: Conversation[], conv: any) => {
          const otherId = conv.buyer_id === userId ? conv.seller_id : conv.buyer_id;
          if (otherId === userId) return acc;
          const alreadyExists = acc.find(c => c.other_user_id === otherId);
          if (!alreadyExists) {
            acc.push({ ...conv, other_user_id: otherId });
          }
          return acc;
        }, []);

        setConversations(grouped);
        grouped.forEach((conv: any) => {
          fetchAndCacheUserProfile(conv.other_user_id);
        });
      }
    } catch (err: any) {
      console.error('Error fetching conversations:', err.message || err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAndCacheUserProfile = async (userId: string) => {
    if (!userId) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, username')
        .eq('id', userId)
        .maybeSingle();
        
      if (profile) {
        const identity = profile.full_name || (profile.username ? `@${profile.username}` : `Student ${userId.slice(0, 4).toUpperCase()}`);
        setUserNames((s) => ({ ...s, [userId]: identity }));
        setUserHandles((s) => ({ ...s, [userId]: profile.username ? profile.username.toUpperCase() : 'STUDENT' }));
        if (profile.avatar_url) {
          setUserAvatars((s) => ({ ...s, [userId]: profile.avatar_url }));
        }
      }
    } catch (err) {}
  };

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setUnreadConversationIds(prev => {
      const next = new Set(prev);
      next.delete(conv.id);
      return next;
    });
  };

  useEffect(() => {
    if (!selectedConversation) return;
    fetchMessages(selectedConversation.id);
    
    const channel = supabase
      .channel(`chat-room-${selectedConversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${selectedConversation.id}`
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedConversation || !currentUserId) return;
    const text = inputValue.trim();
    setInputValue('');

    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConversation.id,
      sender_id: currentUserId,
      text: text
    });

    if (error) {
      console.error('Failed to send:', error);
    }
  };

  if (selectedConversation) {
    return (
      <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-300">
        <div className="pt-12 pb-4 px-6 flex items-center border-b border-gray-100 space-x-4 bg-white/90 backdrop-blur-md sticky top-0 z-50">
          <button onClick={() => setSelectedConversation(null)} className="p-2 -ml-2 text-gray-400 active:scale-90 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center space-x-3">
            <img src={userAvatars[selectedConversation.other_user_id] || GENERIC_AVATAR} className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 object-cover" alt="Avatar" />
            <div>
              <h3 className="text-sm font-black text-gray-900 tracking-tight leading-none">{userNames[selectedConversation.other_user_id] || 'Student'}</h3>
              <p className="text-[9px] font-black text-[#FF733B] uppercase tracking-widest mt-1">@{userHandles[selectedConversation.other_user_id] || 'STUDENT'}</p>
            </div>
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar scroll-smooth">
          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in zoom-in duration-200`}>
                <div className={`max-w-[80%] px-5 py-3 rounded-[1.5rem] text-sm break-words ${
                  isMe 
                    ? 'bg-[#FF733B] text-white rounded-br-none shadow-lg shadow-orange-100/30' 
                    : 'bg-gray-100 text-gray-800 rounded-bl-none font-medium'
                }`}>{msg.text}</div>
              </div>
            );
          })}
        </div>
        <div className="p-4 pb-28 bg-white border-t border-gray-100">
          <div className="flex items-center space-x-2 max-w-md mx-auto">
            <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type a message..." className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
            <button onClick={handleSendMessage} className="bg-[#FF733B] text-white p-3.5 rounded-2xl shadow-lg shadow-orange-100 active:scale-90 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#FF733B] overflow-hidden">
      <div className="pt-16 pb-6 px-8 bg-[#FF733B] sticky top-0 z-10">
        <h1 className="text-4xl font-black text-white tracking-tight">Messages</h1>
      </div>
      <div className="flex-1 overflow-y-auto pb-24 p-4 space-y-4 no-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center px-8 opacity-40">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mb-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <p className="text-xs font-black text-white uppercase tracking-widest">Inbox Empty</p>
          </div>
        ) : (
          conversations.map((chat) => {
            const hasUnread = unreadConversationIds.has(chat.id);
            return (
              <div 
                key={chat.id} 
                onClick={() => handleSelectConversation(chat)}
                className="p-5 flex items-center space-x-4 bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all cursor-pointer active:scale-[0.98] group relative border-2 border-transparent hover:border-white/50"
              >
                <div className="relative">
                  <img src={userAvatars[chat.other_user_id] || GENERIC_AVATAR} className="w-14 h-14 rounded-2xl bg-orange-50 object-cover shadow-sm transition-transform group-hover:scale-105 border border-gray-100" alt="Avatar" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-black text-gray-900 text-lg tracking-tight truncate">{userNames[chat.other_user_id] || 'Student'}</h3>
                    {hasUnread && (
                      <div className="w-2.5 h-2.5 bg-[#FF733B] rounded-full animate-pulse shadow-[0_0_8px_rgba(255,115,59,0.5)] flex-shrink-0 border-2 border-white" title="New Message"></div>
                    )}
                  </div>
                  <span className="text-[10px] font-black text-[#FF733B] uppercase tracking-widest block mt-0.5">@{userHandles[chat.other_user_id] || 'STUDENT'}</span>
                </div>
                
                <div className="text-gray-300 group-hover:text-[#FF733B] transition-colors ml-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Messages;
