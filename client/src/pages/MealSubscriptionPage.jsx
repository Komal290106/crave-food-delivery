import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Calendar,
  Clock,
  MapPin,
  Check,
  Pause,
  Play,
  Sparkles,
  Utensils,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function MealSubscriptionPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [deskAddress, setDeskAddress] = useState(
    user?.addresses?.[0]?.addressLine || 'Cyber City Tower B, 4th Floor'
  );
  const [deskDetail, setDeskDetail] = useState('Desk 42B / Innovation Wing');
  const [schedule, setSchedule] = useState([
    {
      dayOfWeek: 'Monday',
      deliveryTime: '13:30',
      itemName: 'Truffle Burrata & Wild Mushroom Pizza',
      price: 239,
      isVeg: true,
      category: 'Artisan Pizza'
    },
    {
      dayOfWeek: 'Tuesday',
      deliveryTime: '13:30',
      itemName: 'Handmade Tagliolini al Tartufo',
      price: 199,
      isVeg: true,
      category: 'Fresh Handmade Pasta'
    },
    {
      dayOfWeek: 'Wednesday',
      deliveryTime: '13:30',
      itemName: 'Classic Margherita di Bufala',
      price: 179,
      isVeg: true,
      category: 'Artisan Pizza'
    },
    {
      dayOfWeek: 'Thursday',
      deliveryTime: '13:30',
      itemName: 'Slow-Cooked Tuscan Lamb Pappardelle',
      price: 239,
      isVeg: false,
      category: 'Gourmet Meat'
    },
    {
      dayOfWeek: 'Friday',
      deliveryTime: '13:30',
      itemName: 'Classic Venetian Tiramisu & Espresso Set',
      price: 119,
      isVeg: true,
      category: 'Friday Treat'
    }
  ]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMySubscription();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchMySubscription = async () => {
    try {
      setLoading(true);
      const res = await api.get('/subscriptions/my');
      if (res.data?.success && res.data.subscription) {
        setSubscription(res.data.subscription);
        if (res.data.subscription.deskLocation) {
          setDeskAddress(res.data.subscription.deskLocation.addressLine);
          setDeskDetail(res.data.subscription.deskLocation.deskOrRoom);
        }
        if (res.data.subscription.weeklySchedule?.length > 0) {
          setSchedule(res.data.subscription.weeklySchedule);
        }
      }
    } catch (err) {
      console.warn('Failed to load subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRoutine = async () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/subscriptions');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');
      setSuccessMsg('');

      // Attach dummy menu/restaurant IDs from existing items if needed
      const payloadSchedule = schedule.map(item => ({
        ...item,
        restaurantId: '6ade230210897f29a59d6111',
        restaurantName: 'Osteria Bellini',
        menuItemId: '6ade523e8fd303c0e2c77616'
      }));

      const res = await api.post('/subscriptions', {
        planName: 'Weekly Executive Desk Routine',
        deskLocation: {
          addressLine: deskAddress,
          city: 'New Delhi',
          pincode: '110001',
          deskOrRoom: deskDetail
        },
        weeklySchedule: payloadSchedule
      });

      if (res.data?.success) {
        setSubscription(res.data.subscription);
        setSuccessMsg('✨ Routine Activated! Daily artisanal lunch will auto-deliver at 1:30 PM!');
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save routine');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePause = async () => {
    try {
      const res = await api.patch('/subscriptions/toggle-status');
      if (res.data?.success) {
        setSubscription(res.data.subscription);
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const weeklyTotal = schedule.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-aubergine-900 via-charcoal-900 to-black text-white p-6 sm:p-8 rounded-3xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-white/10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-citrus-500/20 text-citrus-300 border border-citrus-500/30 text-xs font-bold uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" />
            Set Once, Eat Daily
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold">
            Desk Meal Scheduler & Subscription
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 max-w-xl">
            Never waste 30 minutes deciding lunch. Curate your Monday-to-Friday gourmet routine, delivered automatically to your office desk or cabin at exactly 1:30 PM.
          </p>
        </div>

        {subscription && (
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center space-y-2 w-full md:w-auto">
            <div className="flex items-center justify-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${subscription.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-xs font-bold uppercase tracking-wider">Status: {subscription.status}</span>
            </div>
            <button
              onClick={handleTogglePause}
              className="px-4 py-1.5 rounded-full bg-white text-charcoal-900 text-xs font-bold hover:bg-stone-200 transition-colors flex items-center justify-center gap-1.5 w-full shadow-xs"
            >
              {subscription.status === 'active' ? <Pause className="w-3.5 h-3.5 text-amber-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
              <span>{subscription.status === 'active' ? 'Pause Routine' : 'Resume Routine'}</span>
            </button>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fadeIn shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-2xl text-xs font-bold text-red-800 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Weekly Schedule + Desk Address Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Monday to Friday Weekly Schedule Cards */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-bold text-charcoal-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-citrus-600" />
              <span>Your Weekly Lunch Lineup</span>
            </h3>
            <span className="text-xs font-bold text-stone-500">Auto-dispatched daily @ 1:30 PM</span>
          </div>

          <div className="space-y-3">
            {schedule.map((item, idx) => (
              <div
                key={idx}
                className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-2xs hover:shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-ivory-100 border border-ivory-300 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[10px] uppercase font-bold text-stone-500">{item.dayOfWeek.slice(0, 3)}</span>
                    <span className="text-xs font-bold text-charcoal-900">Day {idx + 1}</span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <h4 className="font-bold text-sm text-charcoal-900">{item.itemName}</h4>
                    </div>
                    <p className="text-xs text-stone-500">{item.category} • Prepared Fresh by Osteria Bellini</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-0 border-stone-100">
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block uppercase font-bold">Daily Price</span>
                    <span className="font-mono font-bold text-sm text-citrus-600">₹{item.price}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    Auto-Order
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Desk Destination & Routine Activation */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-5">
            <div className="flex items-center gap-2 text-charcoal-900 font-serif font-bold text-lg">
              <MapPin className="w-5 h-5 text-citrus-600" />
              <span>Desk Delivery Target</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Office / Campus Address</label>
                <input
                  type="text"
                  value={deskAddress}
                  onChange={(e) => setDeskAddress(e.target.value)}
                  placeholder="e.g. Cyber City Tower B"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-300 focus:outline-none focus:border-citrus-500 text-xs font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Exact Desk / Cabin / Floor</label>
                <input
                  type="text"
                  value={deskDetail}
                  onChange={(e) => setDeskDetail(e.target.value)}
                  placeholder="e.g. 4th Floor, Desk 42B"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-300 focus:outline-none focus:border-citrus-500 text-xs font-medium"
                />
              </div>
            </div>

            {/* Bill Summary */}
            <div className="pt-3 border-t border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>5 Meals Subtotal (Mon-Fri)</span>
                <span className="font-mono font-bold">₹{weeklyTotal}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Subscriber Perk (Free Delivery)</span>
                <span>₹0 (Saved ₹175)</span>
              </div>
              <div className="flex justify-between text-base font-bold text-charcoal-900 pt-2 border-t border-stone-100">
                <span>Weekly Plan Total</span>
                <span className="font-mono text-citrus-600">₹{weeklyTotal}</span>
              </div>
            </div>

            <button
              onClick={handleSaveRoutine}
              disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-citrus-500 to-citrus-600 hover:from-citrus-400 hover:to-citrus-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{saving ? 'Activating Routine...' : 'Activate Weekly Routine'}</span>
            </button>
            <p className="text-[10px] text-stone-400 text-center">Pause or cancel anytime with one click.</p>
          </div>
        </div>

      </div>

    </div>
  );
}
