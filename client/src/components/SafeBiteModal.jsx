import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setUser } from '../redux/authSlice';
import api from '../services/api';
import {
  ShieldAlert,
  ShieldCheck,
  X,
  Check,
  AlertTriangle,
  Sparkles,
  Info
} from 'lucide-react';

const COMMON_ALLERGENS = [
  { id: 'peanuts', label: 'Peanuts', icon: '🥜' },
  { id: 'tree_nuts', label: 'Tree Nuts (Almonds/Walnuts)', icon: '🌰' },
  { id: 'dairy', label: 'Dairy / Lactose', icon: '🥛' },
  { id: 'gluten', label: 'Gluten / Wheat', icon: '🌾' },
  { id: 'onion_garlic', label: 'Onion & Garlic (Jain/Satvik)', icon: '🧄' },
  { id: 'soy', label: 'Soybeans', icon: '🌱' },
  { id: 'eggs', label: 'Eggs', icon: '🥚' },
  { id: 'shellfish', label: 'Shellfish / Prawns', icon: '🦐' },
  { id: 'fish', label: 'Fish / Seafood', icon: '🐟' }
];

export default function SafeBiteModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  // Local state initialized with user's saved dietary profile or local guest storage
  const savedProfile = user?.dietaryProfile || JSON.parse(localStorage.getItem('crave_guest_safebite') || '{}');

  const [isJain, setIsJain] = useState(savedProfile.isJain || false);
  const [isVegan, setIsVegan] = useState(savedProfile.isVegan || false);
  const [isPureVeg, setIsPureVeg] = useState(savedProfile.isPureVeg || false);
  const [isGlutenFree, setIsGlutenFree] = useState(savedProfile.isGlutenFree || false);
  const [isDiabeticFriendly, setIsDiabeticFriendly] = useState(savedProfile.isDiabeticFriendly || false);
  const [selectedAllergies, setSelectedAllergies] = useState(savedProfile.allergies || []);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const toggleAllergy = (id) => {
    setSelectedAllergies(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');

    const newProfile = {
      isJain,
      isVegan,
      isPureVeg,
      isGlutenFree,
      isDiabeticFriendly,
      allergies: selectedAllergies
    };

    try {
      if (user) {
        const res = await api.patch('/auth/dietary-profile', newProfile);
        if (res.data?.success) {
          dispatch(setUser({
            ...user,
            dietaryProfile: res.data.dietaryProfile
          }));
        }
      } else {
        // Guest mode support
        localStorage.setItem('crave_guest_safebite', JSON.stringify(newProfile));
      }

      setSuccessMsg('SafeBite Allergen Shield preferences activated!');
      setTimeout(() => {
        onClose();
        setSuccessMsg('');
      }, 1200);
    } catch (err) {
      console.error('Failed to update dietary profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = () => {
    setIsJain(false);
    setIsVegan(false);
    setIsPureVeg(false);
    setIsGlutenFree(false);
    setIsDiabeticFriendly(false);
    setSelectedAllergies([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-200 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold">SafeBite™ Shield</h3>
                <span className="px-2 py-0.5 rounded-full bg-white/25 text-[10px] font-bold uppercase tracking-wider">
                  Health & Allergy Guard
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                Flag unsafe ingredients & highlight 100% verified dishes across menus
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
          
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2 animate-pulse">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Primary Dietary Preferences */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              1. Core Dietary Lifestyle
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { label: 'Pure Veg', state: isPureVeg, set: setIsPureVeg, icon: '🟢' },
                { label: 'Jain Diet (No Onion/Garlic)', state: isJain, set: setIsJain, icon: '🪷' },
                { label: 'Vegan (100% Plant-Based)', state: isVegan, set: setIsVegan, icon: '🌱' },
                { label: 'Gluten-Free Only', state: isGlutenFree, set: setIsGlutenFree, icon: '🌾' },
                { label: 'Diabetic-Friendly (Low GI)', state: isDiabeticFriendly, set: setIsDiabeticFriendly, icon: '🩺' }
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => item.set(!item.state)}
                  className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between gap-2 ${
                    item.state
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.state && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Medical Allergen Exclusions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                2. Medical Allergies (Severe Warning Shield)
              </h4>
              <span className="text-[11px] text-amber-600 font-bold">
                {selectedAllergies.length} Selected
              </span>
            </div>

            <p className="text-[11px] text-stone-500">
              CRAVE will display a prominent red alert whenever an artisanal dish contains any of these ingredients.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {COMMON_ALLERGENS.map((allergen) => {
                const isSelected = selectedAllergies.includes(allergen.id);
                return (
                  <button
                    key={allergen.id}
                    type="button"
                    onClick={() => toggleAllergy(allergen.id)}
                    className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-2xs'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span>{allergen.icon}</span>
                      <span className="truncate">{allergen.label}</span>
                    </span>
                    {isSelected && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-stone-500 hover:text-charcoal-900 underline font-medium"
          >
            Reset Filters
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-600 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{saving ? 'Activating...' : 'Apply SafeBite Shield'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
