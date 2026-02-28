
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ElectronicsListingFormProps {
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

const ElectronicsListingForm: React.FC<ElectronicsListingFormProps> = ({ onBack, onSuccess, session }) => {
  const [itemName, setItemName] = useState('');
  const [brand, setBrand] = useState('');
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
          throw new Error(`[Storage Error] ${uploadError.message}`);
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
          price: parsedPrice,
          condition,
          category: 'Electronics',
          location,
          description: description.trim(),
          seller_id: session?.user?.id,
          image_url: imageUrlData
        }
      ]);

      if (error) {
        throw new Error(`[Database Error] ${error.message}`);
      }

      alert('Electronics listed successfully!');
      onSuccess?.();
    } catch (err: any) {
      alert(`Submission Failed:\n\n${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="bg-purple-600 p-6 flex items-start space-x-4 pt-14 text-white">
        <button onClick={onBack} className="bg-white/20 p-2 rounded-full text-white active:scale-90 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-white text-xl font-black uppercase tracking-tight">List Electronics</h1>
          <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Tech & Gadgets</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32 no-scrollbar">
        <div className="space-y-3">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex justify-between">
            <span>Photos *</span>
            <span>{photos.length}/{MAX_PHOTOS}</span>
          </label>
          <div className="flex space-x-3 overflow-x-auto no-scrollbar pt-4 pb-2">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative flex-shrink-0">
                <img src={photo.preview} className="w-28 h-28 rounded-3xl object-cover border border-gray-100 shadow-sm" alt="Preview" />
                <button 
                  onClick={() => removePhoto(idx)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg border-2 border-white active:scale-90 transition-transform z-10"
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
                className="w-28 h-28 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-400 hover:bg-white hover:border-purple-300 transition-all flex-shrink-0 group"
              >
                <div className="bg-white p-2 rounded-xl shadow-sm mb-1 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-[9px] font-black uppercase tracking-tighter">Add</span>
              </button>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
        </div>

        <div className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Brand</label>
            <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Apple, Dell, Sony, Nintendo" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-bold" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Item Name *</label>
            <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="MacBook Pro" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-bold" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Price ($) *</label>
            <input type="text" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none px-4 text-sm font-bold" />
          </div>
          
          <div className="space-y-1 relative" ref={dropdownRef}>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Pickup *</label>
            <button 
              type="button"
              onClick={() => setIsLocationOpen(!isLocationOpen)}
              className={`w-full h-14 bg-gray-50 border rounded-2xl flex justify-between items-center transition-all ${isLocationOpen ? 'border-purple-500 bg-white ring-4 ring-purple-50' : 'border-gray-100'}`}
            >
              <span className="text-sm font-bold text-gray-900 truncate pr-2 pl-4">{location}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-purple-500 transition-transform shrink-0 mr-4 ${isLocationOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isLocationOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="max-h-60 overflow-y-auto no-scrollbar py-2">
                  {locations.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => {
                        setLocation(loc);
                        setIsLocationOpen(false);
                      }}
                      className={`w-full px-6 py-4 text-left text-sm font-bold transition-all ${location === loc ? 'text-purple-600 bg-purple-50' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Description</label>
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Specs, battery life, condition details..." className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none resize-none text-sm font-medium leading-relaxed" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Condition *</label>
            <div className="flex flex-wrap gap-2">
              {conditions.map((c) => (
                <button key={c} onClick={() => setCondition(c)} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${condition === c ? 'bg-purple-600 text-white shadow-lg shadow-purple-100 scale-105' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>{c}</button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={isSubmitting} className="w-full text-white font-black py-5 rounded-[2rem] shadow-xl active:scale-[0.98] transition-all uppercase tracking-widest text-sm mt-4 bg-purple-600 shadow-purple-100 hover:bg-purple-700 disabled:opacity-50">
          {isSubmitting ? 'Syncing to Campus...' : 'Post Tech Item'}
        </button>
      </div>
    </div>
  );
};

export default ElectronicsListingForm;
