import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setCartState } from '../redux/cartSlice';
import api from '../services/api';
import {
  Users,
  Utensils,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  PieChart,
  Percent,
  Plus,
  Minus,
  Flame,
  Wine,
  Trash2,
  PlusCircle,
  X,
  Clock,
  FileText,
  AlertTriangle,
  GlassWater
} from 'lucide-react';

const PARTY_THEMES = [
  { id: 'italian', label: '🍕 Italian Pizza & Pasta Feast', desc: 'Woodfired Neapolitan Pizzas & Handcrafted Truffle Pastas' },
  { id: 'indian', label: '👑 Royal Awadhi & Tandoori Feast', desc: 'Heritage Dum Biryanis, Slow-Cooked Dal & Tandoori Grills' },
  { id: 'asian', label: '🥢 Pan-Asian Dim Sum & Noodle Lounge', desc: 'Handcrafted Dim Sum, Robata Bites & Wok Bowls' },
  { id: 'bistro', label: '🥐 Gourmet French Bistro Spread', desc: 'Artisanal Savory Quiches, Sourdough Platters & Pâtisserie' }
];

const EVENT_PRESETS = [
  { id: 'birthday', label: '🎂 Birthday Bash', tag: 'Balanced + Sweets' },
  { id: 'game_night', label: '🎮 Game Night', tag: 'Pizzas & Finger Food Heavy' },
  { id: 'house_party', label: '🥂 House Party', tag: 'Starters & Mocktails Heavy' },
  { id: 'office', label: '💼 Team Lunch', tag: 'Portioned Platters' }
];

export default function PartyPlannerPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [totalGuests, setTotalGuests] = useState(8);
  const [vegCount, setVegCount] = useState(5);
  const [nonVegCount, setNonVegCount] = useState(3);
  const [selectedTheme, setSelectedTheme] = useState('italian');
  const [selectedEvent, setSelectedEvent] = useState('birthday');
  const [partyTime, setPartyTime] = useState('Today @ 8:30 PM');
  const [partyNotes, setPartyNotes] = useState('Please send paper plates, napkins and pack warm boxes.');
  
  const [loading, setLoading] = useState(false);
  const [partyPlan, setPartyPlan] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    calculatePlan(totalGuests, vegCount, nonVegCount, selectedTheme, selectedEvent);
  }, []);

  const calculatePlan = async (total, veg, nonVeg, theme, event) => {
    try {
      setLoading(true);
      const res = await api.post('/party/calculate', {
        totalGuests: total,
        vegCount: veg,
        nonVegCount: nonVeg,
        cuisineTheme: theme,
        eventType: event
      });
      if (res.data?.success) {
        setPartyPlan(res.data.partyPlan);
      }
    } catch (err) {
      console.error('Party calculation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestsChange = (newTotal) => {
    const val = Math.max(2, Math.min(50, newTotal));
    setTotalGuests(val);
    const newVeg = Math.round((vegCount / totalGuests) * val);
    const newNonVeg = val - newVeg;
    setVegCount(newVeg);
    setNonVegCount(newNonVeg);
    calculatePlan(val, newVeg, newNonVeg, selectedTheme, selectedEvent);
  };

  const handleVegChange = (v) => {
    const vegVal = Math.max(0, Math.min(totalGuests, v));
    setVegCount(vegVal);
    setNonVegCount(totalGuests - vegVal);
    calculatePlan(totalGuests, vegVal, totalGuests - vegVal, selectedTheme, selectedEvent);
  };

  const handleThemeChange = (themeId) => {
    setSelectedTheme(themeId);
    calculatePlan(totalGuests, vegCount, nonVegCount, themeId, selectedEvent);
  };

  const handleEventChange = (eventId) => {
    setSelectedEvent(eventId);
    calculatePlan(totalGuests, vegCount, nonVegCount, selectedTheme, eventId);
  };

  // Allow user to manually tweak dish quantity in party plan
  const handleQuantityAdjust = (dishIdx, delta) => {
    if (!partyPlan || !partyPlan.dishes[dishIdx]) return;
    const updatedDishes = [...partyPlan.dishes];
    const dish = { ...updatedDishes[dishIdx] };
    const newQty = Math.max(1, dish.quantity + delta);
    dish.quantity = newQty;
    dish.itemTotal = newQty * dish.item.price;
    updatedDishes[dishIdx] = dish;

    const newEstimatedTotal = updatedDishes.reduce((sum, d) => sum + d.itemTotal, 0);
    const newPerPerson = Math.round(newEstimatedTotal / totalGuests);

    setPartyPlan({
      ...partyPlan,
      dishes: updatedDishes,
      estimatedTotal: newEstimatedTotal,
      perPersonCost: newPerPerson,
      discountedTotal: Math.round(newEstimatedTotal * 0.85),
      savingsAmount: Math.round(newEstimatedTotal * 0.15)
    });
  };

  // Remove dish from platter
  const handleRemoveDish = (dishIdx) => {
    if (!partyPlan || !partyPlan.dishes[dishIdx]) return;
    const updatedDishes = partyPlan.dishes.filter((_, idx) => idx !== dishIdx);
    const newEstimatedTotal = updatedDishes.reduce((sum, d) => sum + d.itemTotal, 0);
    const newPerPerson = totalGuests > 0 ? Math.round(newEstimatedTotal / totalGuests) : 0;

    setPartyPlan({
      ...partyPlan,
      dishes: updatedDishes,
      estimatedTotal: newEstimatedTotal,
      perPersonCost: newPerPerson,
      discountedTotal: Math.round(newEstimatedTotal * 0.85),
      savingsAmount: Math.round(newEstimatedTotal * 0.15)
    });
  };

  // Add a dish from the restaurant menu modal
  const handleAddCustomDish = (item) => {
    if (!partyPlan) return;
    // Check if item already exists
    const existingIdx = partyPlan.dishes.findIndex(d => d.item._id === item._id);
    if (existingIdx >= 0) {
      handleQuantityAdjust(existingIdx, 1);
      setShowAddModal(false);
      return;
    }

    const newPlatterDish = {
      item,
      category: item.category,
      quantity: 1,
      itemTotal: item.price
    };

    const updatedDishes = [...partyPlan.dishes, newPlatterDish];
    const newEstimatedTotal = updatedDishes.reduce((sum, d) => sum + d.itemTotal, 0);
    const newPerPerson = Math.round(newEstimatedTotal / totalGuests);

    setPartyPlan({
      ...partyPlan,
      dishes: updatedDishes,
      estimatedTotal: newEstimatedTotal,
      perPersonCost: newPerPerson,
      discountedTotal: Math.round(newEstimatedTotal * 0.85),
      savingsAmount: Math.round(newEstimatedTotal * 0.15)
    });

    setShowAddModal(false);
  };

  const handleCheckoutPartyFeast = () => {
    if (!partyPlan || !partyPlan.dishes || partyPlan.dishes.length === 0) return;

    const restaurant = partyPlan.restaurant;

    const standardItems = partyPlan.dishes.map(d => ({
      menuItemId: d.item._id,
      name: `${d.item.name} (${d.category})`,
      price: d.item.price,
      isVeg: d.item.isVeg,
      quantity: d.quantity,
      selectedAddOns: [],
      itemTotal: d.itemTotal
    }));

    dispatch(setCartState({
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
        images: { cover: restaurant.image }
      },
      items: standardItems,
      deliveryNotes: `[Party Feast: ${partyTime}] ${partyNotes}`
    }));

    navigate('/checkout');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-citrus-600 via-amber-600 to-citrus-700 text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-white/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider">
            <Users className="w-3.5 h-3.5" />
            Smart Bulk Catering Planner
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold">
            Host-A-Party Feast Calculator
          </h1>
          <p className="text-xs sm:text-sm text-amber-100 max-w-xl">
            Never under-order or over-spend on party food. Pick your party theme, set your guest ratio, and let CRAVE curate mathematically portioned artisanal platters with 1-click cart checkout.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center w-full md:w-auto flex-shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200 block">Party Savings</span>
          <span className="text-xl font-bold font-mono">15% Bulk Off</span>
          <span className="text-[10px] text-amber-100 block">Applied automatically</span>
        </div>
      </div>

      {/* Event Occasion Presets */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
          1. Select Event Type & Vibe
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {EVENT_PRESETS.map((ev) => {
            const isSelected = selectedEvent === ev.id;
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => handleEventChange(ev.id)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 text-amber-900 shadow-sm ring-1 ring-amber-500 font-bold'
                    : 'bg-white border-stone-200 text-charcoal-700 hover:border-stone-300'
                }`}
              >
                <div className="text-xs font-bold">{ev.label}</div>
                <div className="text-[10px] text-stone-500 mt-0.5">{ev.tag}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme Selector Carousel Bar */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
          2. Select Cuisine & Kitchen Theme
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PARTY_THEMES.map((theme) => {
            const isSelected = selectedTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleThemeChange(theme.id)}
                className={`p-4 rounded-3xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-charcoal-900 border-charcoal-900 text-white shadow-md'
                    : 'bg-white border-stone-200 text-charcoal-900 hover:border-citrus-400'
                }`}
              >
                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-sm leading-tight">{theme.label}</h4>
                  <p className={`text-[11px] line-clamp-2 ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                    {theme.desc}
                  </p>
                </div>
                {isSelected && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-citrus-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Active Theme</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Controls on Left + Platter Breakdown on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Interactive Party Controls */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-6">
            <h3 className="font-serif text-lg font-bold text-charcoal-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-citrus-600" />
              <span>Guest Headcount & Ratio</span>
            </h3>

            {/* Total Guests Counter */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-600 uppercase tracking-wider block">
                Total People Attending: <span className="text-citrus-600 text-base font-bold">{totalGuests}</span>
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleGuestsChange(totalGuests - 2)}
                  className="w-10 h-10 rounded-2xl bg-stone-100 hover:bg-stone-200 text-charcoal-900 flex items-center justify-center font-bold"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min="2"
                  max="30"
                  step="2"
                  value={totalGuests}
                  onChange={(e) => handleGuestsChange(Number(e.target.value))}
                  className="flex-grow accent-citrus-600"
                />
                <button
                  type="button"
                  onClick={() => handleGuestsChange(totalGuests + 2)}
                  className="w-10 h-10 rounded-2xl bg-stone-100 hover:bg-stone-200 text-charcoal-900 flex items-center justify-center font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Veg vs Non-Veg Split */}
            <div className="space-y-3 pt-4 border-t border-stone-100">
              <span className="text-xs font-bold text-stone-600 uppercase tracking-wider block">
                Dietary Split:
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Vegetarian</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-serif font-bold text-xl text-emerald-900">{vegCount}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleVegChange(vegCount - 1)}
                        className="w-6 h-6 rounded-lg bg-emerald-200 hover:bg-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-center"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVegChange(vegCount + 1)}
                        className="w-6 h-6 rounded-lg bg-emerald-200 hover:bg-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-red-800 uppercase block">Non-Vegetarian</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-serif font-bold text-xl text-red-900">{nonVegCount}</span>
                    <span className="text-xs text-red-600 font-semibold">{totalGuests > 0 ? Math.round((nonVegCount/totalGuests)*100) : 0}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Portion Sizing Summary */}
            {partyPlan && (
              <div className="p-4 bg-ivory-100 border border-ivory-300 rounded-2xl space-y-1 text-xs">
                <span className="font-bold text-citrus-600 uppercase tracking-wider block text-[10px]">
                  Catering Science Formula
                </span>
                <p className="font-bold text-charcoal-900">{partyPlan.recommendation}</p>
                <p className="text-stone-500 text-[11px]">
                  Catering curated from <strong className="text-charcoal-900">{partyPlan.restaurant?.name}</strong> • Guaranteed hot & fresh.
                </p>
              </div>
            )}

            {/* Party Logistics: Time & Special Notes */}
            <div className="pt-4 border-t border-stone-100 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-citrus-600" />
                  Party Delivery Slot:
                </label>
                <input
                  type="text"
                  value={partyTime}
                  onChange={(e) => setPartyTime(e.target.value)}
                  placeholder="e.g., Today @ 8:30 PM"
                  className="w-full text-xs font-medium px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-citrus-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-citrus-600" />
                  Catering Notes:
                </label>
                <input
                  type="text"
                  value={partyNotes}
                  onChange={(e) => setPartyNotes(e.target.value)}
                  placeholder="Special instructions for kitchen..."
                  className="w-full text-xs font-medium px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-citrus-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Curated Balanced Feast Cart */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-charcoal-900 flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-citrus-600" />
                  <span>Curated Party Feast Platter</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Customizable quantities • Prepared by {partyPlan?.restaurant?.name || 'Artisan Kitchen'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-citrus-50 text-citrus-700 hover:bg-citrus-100 border border-citrus-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add from Menu</span>
                </button>
                <span className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold font-mono">
                  {partyPlan?.dishes?.length || 0} Dishes
                </span>
              </div>
            </div>

            {/* Dishes Breakdown List */}
            {loading ? (
              <div className="py-12 text-center text-xs text-stone-400">Computing optimal party platters...</div>
            ) : partyPlan?.dishes?.length > 0 ? (
              <div className="space-y-3">
                {partyPlan.dishes.map((d, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between gap-4 text-xs hover:border-stone-300 transition-all"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.item.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <h4 className="font-bold text-charcoal-900 text-sm truncate">{d.item.name}</h4>
                      </div>
                      <p className="text-[11px] text-stone-500 truncate">{d.category}</p>
                      <span className="font-mono text-[11px] text-citrus-600 font-bold">₹{d.item.price} each</span>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Quantity Tweak Stepper */}
                      <div className="flex items-center border border-stone-300 rounded-xl bg-white overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleQuantityAdjust(idx, -1)}
                          className="px-2 py-1 text-stone-600 hover:bg-stone-100 font-bold"
                          title="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="px-2.5 py-1 font-bold text-xs font-mono">{d.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityAdjust(idx, 1)}
                          className="px-2 py-1 text-stone-600 hover:bg-stone-100 font-bold"
                          title="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right w-16">
                        <span className="font-mono font-bold text-charcoal-900 text-sm">₹{d.itemTotal}</span>
                      </div>

                      {/* Remove dish button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveDish(idx)}
                        className="w-7 h-7 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                        title="Remove dish from party feast"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-stone-400 space-y-2">
                <p>No dishes left in feast platter.</p>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="text-citrus-600 font-bold underline"
                >
                  Add dishes from kitchen menu
                </button>
              </div>
            )}

            {/* Bill Summary & 1-Click Checkout */}
            {partyPlan && (
              <div className="pt-4 border-t border-stone-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500">Per Person Cost:</span>
                  <span className="font-mono font-bold text-sm text-emerald-700">~₹{partyPlan.perPersonCost} / guest</span>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-400 line-through">
                  <span>Regular Menu Subtotal:</span>
                  <span className="font-mono">₹{partyPlan.estimatedTotal}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-charcoal-900">Total Party Package:</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Saved ₹{partyPlan.savingsAmount} (15% OFF)
                    </span>
                  </div>
                  <span className="font-mono text-xl font-bold text-citrus-600">₹{partyPlan.discountedTotal}</span>
                </div>

                <button
                  type="button"
                  onClick={handleCheckoutPartyFeast}
                  disabled={!partyPlan?.dishes || partyPlan.dishes.length === 0}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-citrus-500 to-citrus-600 hover:from-citrus-400 hover:to-citrus-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>1-Click Add Feast to Cart & Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Add Custom Dish Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-lg text-charcoal-900">
                  Add Dishes to Party Feast
                </h3>
                <p className="text-xs text-stone-500">
                  From {partyPlan?.restaurant?.name || 'Artisan Kitchen'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-grow">
              {partyPlan?.availableMenuItems?.length > 0 ? (
                partyPlan.availableMenuItems.map((item) => (
                  <div
                    key={item._id}
                    className="p-3 rounded-2xl border border-stone-200 hover:border-citrus-400 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <h4 className="font-bold text-xs text-charcoal-900">{item.name}</h4>
                      </div>
                      <p className="text-[10px] text-stone-500">{item.category}</p>
                      <span className="font-mono text-xs font-bold text-citrus-600">₹{item.price}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddCustomDish(item)}
                      className="px-3 py-1.5 rounded-xl bg-citrus-500 hover:bg-citrus-600 text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-stone-400">
                  No additional items available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
