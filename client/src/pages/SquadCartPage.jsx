import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import api from '../services/api';
import { connectSocket, getSocket } from '../services/socket';
import { setCartState } from '../redux/cartSlice';
import {
  Users,
  Share2,
  Copy,
  Check,
  Plus,
  Trash2,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  QrCode,
  DollarSign,
  Utensils,
  CheckCircle2
} from 'lucide-react';

export default function SquadCartPage() {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [squadCart, setSquadCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [memberName, setMemberName] = useState(user?.name || localStorage.getItem('crave_squad_name') || '');
  const [isJoined, setIsJoined] = useState(false);
  const [restaurantMenu, setRestaurantMenu] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [showBillSplit, setShowBillSplit] = useState(true);

  const isHost = user && squadCart?.hostId === user._id;

  useEffect(() => {
    fetchSquadCart();
  }, [shareCode]);

  useEffect(() => {
    if (!shareCode) return;

    // Connect socket for guest or authenticated user
    const socket = connectSocket();
    if (socket) {
      socket.emit('join:squad', { shareCode, memberName });

      socket.on('squad:sync_cart', ({ squadCart: updatedCart }) => {
        setSquadCart(updatedCart);
      });

      socket.on('squad:member_joined', ({ memberName: newMember }) => {
        console.log('[Squad] New member joined:', newMember);
        fetchSquadCart();
      });
    }

    // Auto-polling safety fallback: sync cart every 3 seconds so Host and Friends always see updates
    const pollInterval = setInterval(() => {
      fetchSquadCart(false);
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      if (socket) {
        socket.emit('leave:squad', { shareCode });
        socket.off('squad:sync_cart');
        socket.off('squad:member_joined');
      }
    };
  }, [shareCode, memberName]);

  const fetchSquadCart = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await api.get(`/squad/${shareCode}`);
      if (res.data?.success) {
        setSquadCart(res.data.squadCart);

        // Check if current user or saved name is already in members
        const currentName = user?.name || localStorage.getItem('crave_squad_name');
        if (currentName) {
          const found = res.data.squadCart.members.some(
            m => m.name.toLowerCase() === currentName.toLowerCase()
          );
          if (found) setIsJoined(true);
        }

        // Fetch restaurant menu for in-page browsing & quick add
        if (res.data.squadCart.restaurantId?._id) {
          fetchRestaurantMenu(res.data.squadCart.restaurantId._id);
        }
      }
    } catch (err) {
      console.error('Failed to load squad cart:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurantMenu = async (restaurantId) => {
    try {
      const res = await api.get(`/menu/${restaurantId}`);
      if (res.data?.success) {
        setRestaurantMenu(res.data.data || []);
      }
    } catch (e) {
      console.warn('Failed to load restaurant menu for squad:', e);
    }
  };

  const handleJoinSquad = async (e) => {
    e.preventDefault();
    if (!memberName.trim()) return;

    try {
      const res = await api.post(`/squad/${shareCode}/join`, { memberName: memberName.trim() });
      if (res.data?.success) {
        localStorage.setItem('crave_squad_name', memberName.trim());
        setSquadCart(res.data.squadCart);
        setIsJoined(true);

        const socket = getSocket();
        if (socket) {
          socket.emit('join:squad', { shareCode, memberName: memberName.trim() });
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to join squad');
    }
  };

  const handleAddItem = async (item) => {
    if (!isJoined) {
      alert('Please enter your name to join this squad before adding food!');
      return;
    }

    try {
      const res = await api.post(`/squad/${shareCode}/item`, {
        menuItemId: item._id,
        quantity: 1,
        memberName: memberName.trim()
      });

      if (res.data?.success) {
        setSquadCart(res.data.squadCart);
        const socket = getSocket();
        if (socket) {
          socket.emit('squad:cart_updated', { shareCode, squadCart: res.data.squadCart });
        }
      }
    } catch (err) {
      console.error('Failed to add item to squad:', err);
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      const res = await api.delete(`/squad/${shareCode}/item/${itemId}`);
      if (res.data?.success) {
        setSquadCart(res.data.squadCart);
        const socket = getSocket();
        if (socket) {
          socket.emit('squad:cart_updated', { shareCode, squadCart: res.data.squadCart });
        }
      }
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  };

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate bill split per member
  const calculateBillSplit = () => {
    if (!squadCart || !squadCart.items) return [];

    const memberTotals = {};
    // Initialize members
    squadCart.members.forEach(m => {
      memberTotals[m.name] = {
        name: m.name,
        isHost: m.isHost,
        foodTotal: 0,
        itemsCount: 0
      };
    });

    // Sum food totals
    squadCart.items.forEach(item => {
      const addedBy = item.addedBy?.name || 'Guest';
      if (!memberTotals[addedBy]) {
        memberTotals[addedBy] = { name: addedBy, isHost: false, foodTotal: 0, itemsCount: 0 };
      }
      memberTotals[addedBy].foodTotal += item.itemTotal;
      memberTotals[addedBy].itemsCount += item.quantity;
    });

    const activeMembersCount = Object.keys(memberTotals).length || 1;
    const taxesAndDelivery = 50; // Flat shared taxes & delivery
    const sharedExtraPerPerson = Math.round(taxesAndDelivery / activeMembersCount);

    return Object.values(memberTotals).map(m => ({
      ...m,
      sharedCharges: m.foodTotal > 0 ? sharedExtraPerPerson : 0,
      totalPayable: m.foodTotal > 0 ? m.foodTotal + sharedExtraPerPerson : 0
    }));
  };

  const grandFoodTotal = (squadCart?.items || []).reduce((sum, i) => sum + i.itemTotal, 0);
  const billSplits = calculateBillSplit();

  // Host transfers squad items to standard cart for checkout
  const handleHostCheckout = () => {
    if (!squadCart || squadCart.items.length === 0) return;

    // Save squad items into normal cart state in Redux and localStorage
    const standardItems = squadCart.items.map(si => ({
      menuItemId: si.menuItemId,
      name: `${si.name} (${si.addedBy.name})`,
      price: si.price,
      isVeg: si.isVeg,
      quantity: si.quantity,
      selectedAddOns: si.selectedAddOns || [],
      itemTotal: si.itemTotal
    }));

    dispatch(setCartState({
      restaurant: squadCart.restaurantId,
      items: standardItems
    }));

    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 space-y-6 animate-pulse">
        <div className="h-48 bg-stone-200 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-stone-200 rounded-3xl" />
          <div className="h-96 bg-stone-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!squadCart) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-charcoal-900">Squad Cart Expired or Not Found</h2>
        <p className="text-xs text-stone-500">The group cart link you used may have expired or was removed.</p>
        <Link to="/restaurants" className="inline-block px-5 py-2.5 rounded-full bg-citrus-600 text-white font-bold text-xs">
          Browse Restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Top Banner: Squad Info & Share Link */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-citrus-100 text-citrus-700 text-xs font-bold uppercase tracking-wider">
            <Users className="w-3.5 h-3.5" />
            Live Collaborative SquadCart
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal-900">
            {squadCart.hostName}'s Food Squad
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Ordering from <strong className="text-charcoal-900">{squadCart.restaurantId?.name}</strong> • Share the link with friends to add their favorite dishes!
          </p>
        </div>

        {/* Share Button & Code */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="px-4 py-2 bg-stone-100 rounded-2xl border border-stone-200 text-center">
            <span className="text-[10px] font-bold uppercase text-stone-400 block">Squad Code</span>
            <span className="font-mono font-bold text-citrus-600 tracking-wider text-sm">{squadCart.shareCode}</span>
          </div>

          <button
            onClick={copyShareLink}
            className="flex-1 md:flex-initial px-5 py-3 rounded-2xl bg-charcoal-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-citrus-400" />}
            <span>{copied ? 'Link Copied!' : 'Copy Invite Link'}</span>
          </button>
        </div>
      </div>

      {/* Join Prompt Modal / Banner if not joined yet */}
      {!isJoined && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-charcoal-900">Join the Squad to pick your food</h4>
              <p className="text-xs text-stone-600">Enter your name so your friends know which items belong to you.</p>
            </div>
          </div>

          <form onSubmit={handleJoinSquad} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Your Name (e.g. Aman)"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className="px-4 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-citrus-500 w-full sm:w-48"
              required
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-xs whitespace-nowrap shadow-xs"
            >
              Join Squad
            </button>
          </form>
        </div>
      )}

      {/* Main Grid: Restaurant Menu on Left + Live Squad Cart & Bill Split on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Restaurant Menu to Pick From */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-charcoal-900">
                  {squadCart.restaurantId?.name}'s Menu
                </h3>
                <p className="text-xs text-stone-500">Pick any dish to add directly into the shared squad cart</p>
              </div>
              <Utensils className="w-5 h-5 text-citrus-600" />
            </div>

            {/* Menu Items List */}
            <div className="divide-y divide-stone-100">
              {restaurantMenu.map((item) => (
                <div key={item._id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span className="font-bold text-sm text-charcoal-900">{item.name}</span>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-1">{item.description}</p>
                    <span className="text-xs font-bold text-citrus-600 font-mono">₹{item.price}</span>
                  </div>

                  <button
                    onClick={() => handleAddItem(item)}
                    className="px-3.5 py-1.5 rounded-full bg-citrus-50 hover:bg-citrus-600 text-citrus-700 hover:text-white border border-citrus-200 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs flex-shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Squad</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Shared Squad Cart & Per-Person Bill Breakdown */}
        <div className="lg:col-span-5 space-y-6">

          {/* Real-time Cart Items */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-citrus-600" />
                <h3 className="font-serif text-base font-bold text-charcoal-900">Squad Items ({squadCart.items?.length || 0})</h3>
              </div>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>

            {(!squadCart.items || squadCart.items.length === 0) ? (
              <div className="py-8 text-center text-xs text-stone-400 space-y-2">
                <p>No dishes added yet.</p>
                <p>Select items from the menu on the left!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {squadCart.items.map((item) => (
                  <div
                    key={item._id}
                    className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="font-bold text-charcoal-900">{item.name} x {item.quantity}</span>
                      </div>
                      <span className="text-[10px] text-citrus-600 font-bold block mt-0.5">
                        Added by {item.addedBy?.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-charcoal-900">₹{item.itemTotal}</span>
                      {(item.addedBy?.name === memberName || isHost) && (
                        <button
                          onClick={() => handleRemoveItem(item._id)}
                          className="text-stone-400 hover:text-red-500 transition-colors p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Automatic Per-Person Bill Split Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h3 className="font-serif text-base font-bold text-charcoal-900">Squad Bill Split</h3>
              </div>
              <span className="text-[10px] font-bold uppercase text-stone-400">Equal Shared Taxes</span>
            </div>

            <div className="space-y-2.5">
              {billSplits.map((split, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-ivory-100 border border-ivory-300 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-charcoal-900">{split.name}</span>
                      {split.isHost && (
                        <span className="px-1.5 py-0.5 rounded-md bg-citrus-100 text-citrus-700 text-[9px] font-bold uppercase">
                          Host
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-500">
                      Food: ₹{split.foodTotal} + Taxes/Del: ₹{split.sharedCharges}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block">Total Share</span>
                    <span className="font-mono font-bold text-sm text-emerald-700">₹{split.totalPayable}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Summary */}
            <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-xs">
              <span className="font-bold text-charcoal-900">Squad Grand Total:</span>
              <span className="font-mono text-base font-bold text-citrus-600">
                ₹{grandFoodTotal > 0 ? grandFoodTotal + 50 : 0}
              </span>
            </div>

            {/* Host Checkout Action */}
            {isHost ? (
              <button
                onClick={handleHostCheckout}
                disabled={!squadCart.items || squadCart.items.length === 0}
                className="w-full py-3 rounded-2xl bg-citrus-600 hover:bg-citrus-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Proceed to Checkout as Host</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="p-3 bg-stone-50 rounded-2xl text-center text-xs text-stone-500 border border-stone-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                <span>Your items are synced! Waiting for Host <strong>{squadCart.hostName}</strong> to checkout.</span>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
