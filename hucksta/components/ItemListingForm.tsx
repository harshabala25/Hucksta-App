
import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Category } from '../types';

interface ItemListingFormProps {
  category: Category;
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

const ItemListingForm: React.FC<ItemListingFormProps> = ({ category, onBack, onSuccess, session }) => {
  const [itemName, setItemName] = useState('');
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [gender, setGender] = useState<'Mens' | 'Womens' | 'Unisex'>('Unisex');
  const [condition, setCondition] = useState('Like New');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState(locations[0]);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<{file: File, preview: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const theme = {
    'Clothing': 'bg-orange-600',
    'Furniture': 'bg-emerald-600',
    'Electronics': 'bg-purple-600'
  }[category];

  const conditions = ['New', 'Like New', 'Excellent', 'Good', 'Fair'];
  const MAX_PHOTOS = 10;
  const MIN_RESOLUTION = 800; // Minimum width or height in pixels

  const validateImage = (file: File): Promise<{valid: boolean, width: number, height: number}> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const valid = img.naturalWidth >= MIN_RESOLUTION && img.naturalHeight >= MIN_RESOLUTION;
        resolve({ valid, width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => resolve({ valid: false, width: 0, height: 0 });
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (photos.length + files.length > MAX_PHOTOS) {
      alert(`Limit is ${MAX_PHOTOS} photos.`);
      return;
    }
    
    setIsValidating(true);
    const newPhotos: {file: File, preview: string}[] = [];

    for (const file of files) {
      const result = await validateImage(file);
      if (!result.valid) {
        alert(`Photo "${file.name}" is too low resolution (${result.width}x${result.height}).\n\nPlease use a photo that is at least ${MIN_RESOLUTION}x${MIN_RESOLUTION} pixels to ensure it looks great on the marketplace!`);
        continue;
      }

      const preview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      newPhotos.push({ file, preview });
    }

    setPhotos(prev => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
    setIsValidating(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!itemName.trim() || !price || photos.length === 0) {
      return alert('Name, price, and at least one photo are required.');
    }

    const parsedPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
    if (isNaN(parsedPrice)) return alert('Invalid price');

    setIsSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const photo of photos) {
        const fileExt = photo.file.name.split('.').pop();
        const fileName = `${session.user.id}-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('listings').upload(fileName, photo.file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
      }

      const { error } = await supabase.from('listings').insert([{
        title: itemName.trim(),
        brand: brand.trim(),
        size: category === 'Clothing' ? size.trim() : null,
        gender: category === 'Clothing' ? gender : null,
        price: parsedPrice,
        condition,
        category,
        location,
        description: description.trim(),
        seller_id: session?.user?.id,
        image_url: JSON.stringify(uploadedUrls) // ALWAYS JSON
      }]);

      if (error) throw error;
      onSuccess?.();
    } catch (err: any) {
      alert(`Error: ${err.message || 'Check your Supabase configuration'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className={`${theme} p-6 pt-14 flex items-start space-x-4 text-white`}>
        <button onClick={onBack} className="bg-white/20 p-2 rounded-full">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight">List {category}</h1>
          <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Campus Community</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-6 pt-10 pb-32 space-y-8 no-scrollbar">
        <div className="space-y-4">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex justify-between px-1">
            <span>Photos *</span>
            <span className="flex items-center">
              {isValidating && <span className="mr-2 animate-pulse text-orange-500">Checking...</span>}
              {photos.length}/{MAX_PHOTOS}
            </span>
          </label>
          <div className="flex space-x-4 overflow-x-auto no-scrollbar pt-4 pb-4 -mx-1 px-1">
            {photos.map((p, i) => (
              <div key={i} className="relative flex-shrink-0">
                <img src={p.preview} className="w-28 h-28 rounded-3xl object-cover border-2 border-gray-50 shadow-sm" alt="Preview" />
                <button 
                  onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))} 
                  className="absolute -top-2 -right-2 bg-[#F15A24] text-white rounded-full p-1.5 border-2 border-white shadow-md active:scale-75 transition-all z-10"
                >
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button 
                onClick={() => !isValidating && fileInputRef.current?.click()}
                disabled={isValidating}
                className={`w-28 h-28 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-400 hover:bg-white hover:border-[#F15A24] transition-all flex-shrink-0 ${isValidating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isValidating ? (
                  <div className="w-6 h-6 border-3 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="h-7 w-7 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-[9px] font-black uppercase tracking-tighter">Add</span>
                  </>
                )}
              </button>
            )}
          </div>
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest text-center">Use high-res photos (Min. 800x800px)</p>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
        </div>

        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Item Title *</label>
            <input 
              type="text" 
              value={itemName} 
              onChange={(e) => setItemName(e.target.value)} 
              placeholder="e.g. UTD Hoodie" 
              className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-[#F15A24] rounded-2xl outline-none transition-all font-bold text-sm" 
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Brand (Optional)</label>
            <input 
              type="text" 
              value={brand} 
              onChange={(e) => setBrand(e.target.value)} 
              placeholder="e.g. Champion" 
              className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-[#F15A24] rounded-2xl outline-none transition-all font-bold text-sm" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Price ($) *</label>
              <input 
                type="text" 
                value={price} 
                onChange={(e) => setPrice(e.target.value)} 
                placeholder="0.00" 
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-[#F15A24] rounded-2xl outline-none transition-all font-bold text-sm" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Pickup Location *</label>
              <select 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-[#F15A24] rounded-2xl outline-none transition-all font-bold text-sm"
              >
                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Condition *</label>
            <div className="flex flex-wrap gap-2">
              {conditions.map(c => (
                <button 
                  key={c} 
                  onClick={() => setCondition(c)} 
                  className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${condition === c ? 'bg-black text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Description</label>
            <textarea 
              rows={4} 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Tell other students about this item..." 
              className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-[#F15A24] rounded-2xl outline-none transition-all font-medium text-sm resize-none" 
            />
          </div>
        </div>

        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting || isValidating} 
          className="w-full bg-black text-white font-black py-5 rounded-[2.25rem] active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-xs disabled:opacity-50 mt-4 shadow-xl"
        >
          {isSubmitting ? 'Syncing to Campus...' : `List ${category}`}
        </button>
      </div>
    </div>
  );
};

export default ItemListingForm;
