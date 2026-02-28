
import React from 'react';
import { Tab } from '../types';

interface NavigationProps {
  activeTab: Tab;
  userAvatar?: string;
  onTabChange: (tab: Tab) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, userAvatar, onTabChange }) => {
  const GENERIC_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='35' fill='white'/%3E%3Crect x='2' y='2' width='96' height='96' rx='34' fill='none' stroke='%23FF8C42' stroke-width='1.5' stroke-opacity='0.2'/%3E%3Ccircle cx='50' cy='44' r='18' fill='%23B0B0B0'/%3E%3Cpath d='M22 86c0-15 12-25 28-25s28 10 28 25v4H22v-4z' fill='%23B0B0B0'/%3E%3C/svg%3E";
  const displayAvatar = userAvatar || GENERIC_AVATAR;

  const HOUSE_PATH = "M12 5.5L3.5 12.5V20a1 1 0 001 1h4.5a1 1 0 001-1v-4.5a2 2 0 114 0V20a1 1 0 001 1h4.5a1 1 0 001-1v-7.5L12 5.5z";

  return (
    <nav className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-8 pt-6 pb-8 flex justify-between items-center z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
      <button 
        onClick={() => onTabChange(Tab.HOME)}
        className={`flex flex-col items-center space-y-1 transition-all duration-300 ${activeTab === Tab.HOME ? 'text-[#FF733B] scale-110' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-7 w-7" 
          viewBox="0 0 24 24" 
          fill={activeTab === Tab.HOME ? "currentColor" : "none"} 
          stroke="currentColor"
          strokeWidth={activeTab === Tab.HOME ? "0.5" : "2"}
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d={HOUSE_PATH} />
        </svg>
      </button>

      <button 
        onClick={() => onTabChange(Tab.MESSAGES)}
        className={`flex flex-col items-center space-y-1 relative transition-all duration-300 ${activeTab === Tab.MESSAGES ? 'text-[#FF733B] scale-110' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill={activeTab === Tab.MESSAGES ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      </button>

      <button 
        onClick={() => onTabChange(Tab.SELL)}
        className={`flex flex-col items-center transition-all duration-300 transform translate-y-0.5 ${activeTab === Tab.SELL ? 'scale-110' : 'hover:scale-105 active:scale-95'}`}
      >
        <div className={`
          px-4 py-1.5 rounded-full flex items-center justify-center transition-all duration-300 border-2
          ${activeTab === Tab.SELL 
            ? 'bg-[#FF733B] border-[#FF733B] shadow-md shadow-orange-100' 
            : 'bg-white border-[#FF733B] shadow-sm'}
        `}>
          <span className={`text-[11px] font-black uppercase tracking-widest ${activeTab === Tab.SELL ? 'text-white' : 'text-[#FF733B]'}`}>
            Sell
          </span>
        </div>
      </button>

      <button 
        onClick={() => onTabChange(Tab.PROFILE)}
        className={`flex flex-col items-center transition-all duration-300 ${activeTab === Tab.PROFILE ? 'scale-110' : 'hover:scale-105'}`}
      >
        <div className={`w-8 h-8 rounded-xl overflow-hidden border-2 transition-all bg-white ${activeTab === Tab.PROFILE ? 'border-[#FF733B] ring-4 ring-orange-50' : 'border-gray-200'}`}>
          <img 
            src={displayAvatar} 
            alt="Profile" 
            className="w-full h-full object-cover" 
          />
        </div>
      </button>
    </nav>
  );
};

export default Navigation;
