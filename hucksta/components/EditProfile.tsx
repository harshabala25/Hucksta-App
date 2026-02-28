
import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface EditProfileProps {
  onBack: () => void;
  user: {
    firstName: string;
    lastName: string;
    username: string;
    avatar: string;
  };
  session: any;
}

const EditProfile: React.FC<EditProfileProps> = ({ onBack, user, session }) => {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [username, setUsername] = useState(user.username);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Completed missing string from truncated file
  const GENERIC_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='35' fill='white'/%3E%3Crect x='2' y='2' width='96' height='96' rx='34' fill='none' stroke='%23FF8C42' stroke-width='1.5' stroke-opacity='0.2'/%3E%3Ccircle cx='50' cy='44' r='18' fill='%23B0B0B0'/%3E%3Cpath d='M22 86c0-15 12-25 28-25s28 10 28 25v4H22v-4z' fill='%23B0B0B0'/%3E%3C/svg%3E";

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fixed the truncated component by implementing the save logic and returning the UI
  const handleSave = async () => {
    if (!firstName.trim() || !username.trim()) {
      alert('First name and username are required.');
      return;
    }

    setIsSaving(true);
    try {
      let avatarUrl = user.avatar;

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${session.user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('listings')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('listings')
          .getPublicUrl(filePath);
        
        avatarUrl = publicUrl;
      }

      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        username: username.trim().toLowerCase().replace(/[^a-z0-9]/g, ''),
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;
      
      alert('Profile updated successfully!');
      onBack();
    } catch (err: any) {
      alert(`Error updating profile: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="bg-[#FF733B] p-6 pt-14 flex items-start space-x-4 text-white">
        <button onClick={onBack} className="bg-white/20 p-2 rounded-full active:scale-90 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight">Edit Identity</h1>
          <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Personalize your comet profile</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pt-12 pb-32 space-y-10 no-scrollbar">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative group">
            <img 
              src={previewUrl || user.avatar || GENERIC_AVATAR} 
              className="w-32 h-32 rounded-[3rem] border-4 border-orange-50 object-cover shadow-2xl bg-white" 
              alt="Avatar Preview" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 bg-[#FF733B] text-white p-3 rounded-2xl shadow-xl border-4 border-white active:scale-90 transition-transform"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
          </div>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Upload Profile Photo</p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">First Name</label>
              <input 
                type="text" 
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)} 
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-[#FF733B] rounded-2xl outline-none transition-all text-sm font-bold" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Last Name</label>
              <input 
                type="text" 
                value={lastName} 
                onChange={(e) => setLastName(e.target.value)} 
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-[#FF733B] rounded-2xl outline-none transition-all text-sm font-bold" 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-black">@</span>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                className="w-full p-4 pl-8 bg-gray-50 border-2 border-transparent focus:border-[#FF733B] rounded-2xl outline-none transition-all text-sm font-bold" 
              />
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full bg-[#FF733B] text-white font-black py-5 rounded-[2.25rem] shadow-xl shadow-orange-100 active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-xs disabled:opacity-50 mt-4"
        >
          {isSaving ? 'Saving Changes...' : 'Update Identity'}
        </button>
      </div>
    </div>
  );
};

// Added missing default export to fix the Module has no default export error
export default EditProfile;
