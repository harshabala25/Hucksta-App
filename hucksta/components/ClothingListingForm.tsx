
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ClothingListingFormProps {
  onBack: () => void;
  onSuccess?: () => void;
  session: any;
}

const locations = [
  'UTD Visitor Center', 'Founders North Plaza', 'Founders South Plaza', 'Comets Landing',
  'Davidson-Gundy Alumni Center', 'Administration Building', 'Bioengineering and Sciences Building',
  'Callier Center Richardson', 'Activity Center', 'Dining Hall West', 'Sirius Hall',
  'Berkner Hall', 'Cecil H. Green Hall', 'Engineering and Computer Science Buildings',
  'Naveen Jindal School of Management', 'McDermott Library', 'Student Union'
];

const ClothingListingForm: React.FC<ClothingListingFormProps> = ({ onBack, onSuccess, session }) => {
  const [itemName, setItemName] = useState('');
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [gender, setGender] = useState<'Mens' | 'Womens' | 'Unisex'>('Unisex');
  const [condition, setCondition] = useState('Like New');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState(locations[0]);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<{file: File, preview: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const conditions = ['New', 'Like New', 'Excellent', 'Good', 'Fair'];
  const genders = ['Mens', 'Womens', 'Unisex'];
  const MAX_PHOTOS = 10;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLocationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (photos.length + files.length > MAX_PHOTOS) {
      alert(`You can only upload up to ${MAX_PHOTOS} photos.`);
      return;
    }
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, { file, preview: reader.result as string }].slice(0, MAX_PHOTOS));
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!itemName.trim()) return alert('Please enter an item name');
    
    const parsedPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return alert('Please enter a valid price (numbers only)');
    }

    if (photos.length === 0) {
      return alert('Please upload at least one photo');
    }

    setIsSubmitting(true);

    try {
      const uploadedUrls: string[] = [];

      for (const photo of photos) {
        const fileExt = photo.file.name.split('.').pop();
        const fileName = `${session.user.id}-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('listings')
          .upload(filePath, photo.file);

        if (uploadError) {
           throw new Error(`[Storage Error] ${uploadError.message}. Make sure you have a "listings" bucket created in Supabase.`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('listings')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      const imageUrlData = uploadedUrls.length > 1 ? JSON.stringify(uploadedUrls) : uploadedUrls[0];
      const { error } = await supabase.from('listings').insert([
        {
          title: itemName.trim(),
          brand: brand.trim(),
          size: size.trim(),
          gender,
          price: parsedPrice,
          condition,
          category: 'Clothing',
          location,
          description: description.trim(),
          seller_id: session?.user?.id,
          image_url: imageUrlData
        }
      ]);

      if (error) {
        throw new Error(`[Database Error] ${error.message} (Code: ${error.code}). Check your RLS policies for the "listings" table.`);
      }
      
      alert('Clothing posted to campus!');
      onSuccess?.();
    } catch (err: any) {
      console.error('Submit Error:', err);
      const msg = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
      alert(`Submission Failed:\n\n${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="bg-[#F15A24] p-6 flex items-start space-x-4 text-white pt-14">
        <button onClick={onBack} className="bg-white/20 p-2 rounded-full active:scale-90 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight">List Clothing</h1>
          <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Campus Marketplace</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pt-10 pb-32 space-y-8 no-scrollbar">
        <div className="space-y-4">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex justify-between px-1">
            <span>Photos *</span>
            <span>{photos.length}/{MAX_PHOTOS}</span>
          </label>
          <div className="flex space-x-4 overflow-x-auto no-scrollbar pt-4 pb-4 -mx-1 px-1">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative flex-shrink-0">
                <img src={photo.preview} className="w-28 h-28 rounded-3xl object-cover border-2 border-gray-50 shadow-sm" alt="Preview" />
                <button 
                  onClick={() => removePhoto(idx)}
                  className="absolute -top-2 -right-2 bg-[#F15A24] text-white rounded-full p-1.5 shadow-md border-2 border-white active:scale-90 transition-transform z-10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-28 h-28 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-400 hover:bg-white hover:border-[#F15A24] transition-all flex-shrink-0 group"
              >
                <div className="bg-white p-2 rounded-xl shadow-sm mb-1 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-[9px] font-black uppercase tracking-tighter">Add</span>
              </button>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
        </div>
        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Brand</label>
            <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Nike, Champion, Adidas" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-[#F15A24] rounded-2xl outline-none transition-all text-sm font-bold" />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Item Name *</label>
            <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="UTD Hoodie" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-[#F15A24] rounded-2xl outline-none transition-all text-sm font-bold" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Size</label>
              <input type="text" value={size} onChange={(e) => setSize(e.target.value)} placeholder="S, M, L, XL" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-[#F15A24] rounded-2xl outline-none transition-all text-sm font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Price ($) *</label>
              <input type="text" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-[#F15A24] rounded-2xl outline-none text-sm font-bold" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Gender</label>
            <div className="flex gap-2">
              {genders.map((g) => (
                <button key={g} onClick={() => setGender(g as any)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${gender === g ? 'bg-[#F15A24] text-white shadow-lg' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>{g}</button>
              ))}
            </div>
          </div>

          <div className="space-y-1 relative" ref={dropdownRef}>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Pickup *</label>
            <button 
              type="button"
              onClick={() => setIsLocationOpen(!isLocationOpen)}
              className={`w-full p-4 bg-gray-50 border-2 rounded-2xl flex justify-between items-center transition-all ${isLocationOpen ? 'border-[#F15A24] bg-white ring-4 ring-orange-50' : 'border-transparent'}`}
            >
              <span className="text-sm font-bold text-gray-900">{location}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-orange-500 transition-transform ${isLocationOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isLocationOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-100 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="max-h-60 overflow-y-auto no-scrollbar py-2">
                  {locations.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => {
                        setLocation(loc);
                        setIsLocationOpen(false);
                      }}
                      className={`w-full px-6 py-4 text-left text-sm font-bold transition-all ${location === loc ? 'text-[#F15A24] bg-orange-50' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Description</label>
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell other students about this item..." className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-[#F15A24] rounded-2xl outline-none resize-none text-sm font-medium leading-relaxed" />
          </div>
          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest px-1 transition-colors ${condition ? 'text-[#F15A24]' : 'text-gray-400'}`}>Condition *</label>
            <div className="flex flex-wrap gap-2">
              {conditions.map((c) => (
                <button 
                  key={c} 
                  onClick={() => setCondition(c)} 
                  className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${condition === c ? 'bg-[#F15A24] text-white shadow-lg shadow-orange-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting} 
          className="w-full text-white font-black py-5 rounded-[2.25rem] shadow-xl shadow-orange-100/20 active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-xs mt-4 bg-[#F15A24] disabled:opacity-50"
        >
          {isSubmitting ? 'Syncing to Campus...' : 'Post Clothing Item'}
        </button>
      </div>
    </div>
  );
};

export default ClothingListingForm;
