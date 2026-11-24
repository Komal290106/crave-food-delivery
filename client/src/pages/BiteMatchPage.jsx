import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setCartState, addItem } from '../redux/cartSlice';
import { connectSocket } from '../services/socket';
import api from '../services/api';
import confetti from 'canvas-confetti';
import {
  Heart,
  X,
  Star,
  Users,
  Sparkles,
  Share2,
  Copy,
  Check,
  ShoppingBag,
  ArrowRight,
  Flame,
  Utensils,
  RefreshCw,
  Trophy,
  PartyPopper,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  UserCheck
} from 'lucide-react';

export default function BiteMatchPage() {
  const { sessionCode: urlSessionCode } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);

  // Lobby state
  const [sessionCode, setSessionCode] = useState(urlSessionCode ? urlSessionCode.toUpperCase() : '');
  const [userName, setUserName] = useState(user?.name || '');
  const [dietPref, setDietPref] = useState('all');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Swipe Deck state
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [swipedDishes, setSwipedDishes] = useState({});
  const [latestMatch, setLatestMatch] = useState(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showMatchesDrawer, setShowMatchesDrawer] = useState(false);
  const [partnerProgress, setPartnerProgress] = useState(null);

  // Drag physics state
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const activeParticipantName = userName.trim() || user?.name || 'Foodie Explorer';

  const formatRoomCode = (input) => {
    if (!input) return '';
    const clean = input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    return clean.startsWith('MATCH-') ? clean : `MATCH-${clean}`;
  };

  // Load session if urlSessionCode exists
  useEffect(() => {
    if (urlSessionCode) {
      loadSession(urlSessionCode);
    }
  }, [urlSessionCode]);

  // Connect WebSockets for live matching
  useEffect(() => {
    if (!sessionCode) return;

    const cleanCode = formatRoomCode(sessionCode);
    const socket = connectSocket(token || null);
    if (!socket) return;

    socket.emit('join:match', {
      sessionCode: cleanCode,
      participantName: activeParticipantName
    });

    socket.on('bitematch:participant_joined', (data) => {
      loadSession(cleanCode);
    });

    socket.on('bitematch:partner_joined', (data) => {
      loadSession(cleanCode);
    });

    socket.on('bitematch:swipe_update', (data) => {
      if (data.participantName !== activeParticipantName) {
        setPartnerProgress(data);
      }
    });

    socket.on('bitematch:match_found', (data) => {
      triggerConfetti();
      setLatestMatch(data.matchedDish);
      setShowMatchModal(true);
      // update matches list in session
      setSession(prev => prev ? {
        ...prev,
        matches: data.matches || [...(prev.matches || []), data.matchedDish]
      } : prev);
    });

    return () => {
      socket.emit('leave:match', { sessionCode: cleanCode });
      socket.off('bitematch:participant_joined');
      socket.off('bitematch:partner_joined');
      socket.off('bitematch:swipe_update');
      socket.off('bitematch:match_found');
    };
  }, [sessionCode, activeParticipantName, token]);

  const loadSession = async (code) => {
    try {
      setLoading(true);
      setErrorMsg('');
      const cleanCode = formatRoomCode(code);
      const res = await api.get(`/match/${cleanCode}`);
      if (res.data?.success) {
        setSession(res.data.session);
        setSessionCode(res.data.session.sessionCode);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to load BiteMatch room.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (isSolo = false) => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.post('/match/create', {
        creatorName: activeParticipantName,
        dietPreference: dietPref,
        mode: isSolo ? 'solo' : 'duo'
      });
      if (res.data?.success) {
        setSession(res.data.session);
        setSessionCode(res.data.session.sessionCode);
        setCurrentCardIdx(0);
        setSwipedDishes({});
        navigate(`/match/${res.data.session.sessionCode}`);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Could not create BiteMatch room.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async () => {
    if (!sessionCode.trim()) {
      setErrorMsg('Please enter a 4-digit room code.');
      return;
    }
    try {
      setLoading(true);
      setErrorMsg('');
      const cleanCode = formatRoomCode(sessionCode);
      const res = await api.post(`/match/${cleanCode}/join`, {
        partnerName: activeParticipantName
      });
      if (res.data?.success) {
        setSession(res.data.session);
        setSessionCode(res.data.session.sessionCode);
        setCurrentCardIdx(0);
        setSwipedDishes({});
        navigate(`/match/${res.data.session.sessionCode}`);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Could not join room. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  // Swiping Actions
  const handleSwipe = async (liked, isSuper = false) => {
    if (!session || !session.dishes || currentCardIdx >= session.dishes.length) return;

    const currentDish = session.dishes[currentCardIdx];
    setSwipedDishes(prev => ({ ...prev, [currentDish.menuItemId]: liked }));
    
    // Advance card
    setCurrentCardIdx(prev => prev + 1);
    setDragOffset({ x: 0, y: 0 });

    try {
      const res = await api.post(`/match/${session.sessionCode}/swipe`, {
        participantName: activeParticipantName,
        menuItemId: currentDish.menuItemId,
        liked: true
      });

      if (res.data?.matches) {
        setSession(prev => prev ? { ...prev, matches: res.data.matches } : prev);
      }

      // ONLY trigger mutual match celebration in Duo mode when it's a mutual match between 2 people
      if (res.data?.isMatch && session?.mode !== 'solo') {
        triggerConfetti();
        setLatestMatch(res.data.matchedDish);
        setShowMatchModal(true);
      }
    } catch (err) {
      console.warn('Swipe record failed:', err);
    }
  };

  const handlePass = async () => {
    if (!session || !session.dishes || currentCardIdx >= session.dishes.length) return;
    const currentDish = session.dishes[currentCardIdx];
    setSwipedDishes(prev => ({ ...prev, [currentDish.menuItemId]: false }));
    setCurrentCardIdx(prev => prev + 1);
    setDragOffset({ x: 0, y: 0 });

    try {
      const res = await api.post(`/match/${session.sessionCode}/swipe`, {
        participantName: activeParticipantName,
        menuItemId: currentDish.menuItemId,
        liked: false
      });
      if (res.data?.session?.matches) {
        setSession(prev => prev ? { ...prev, matches: res.data.session.matches } : prev);
      }
    } catch (e) {}
  };

  // Drag physics handlers
  const onMouseDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setDragOffset({ x: dx, y: dy });
  };

  const onMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragOffset.x > 100) {
      handleSwipe(true);
    } else if (dragOffset.x < -100) {
      handlePass();
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/match/${sessionCode}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // 1-Click Order Matched Dish
  const handleOrderMatchedDish = (matchedDish) => {
    if (!matchedDish) return;

    dispatch(setCartState({
      restaurant: {
        _id: matchedDish.restaurantId,
        name: matchedDish.restaurantName,
        images: { cover: matchedDish.image }
      },
      items: [{
        menuItemId: matchedDish.menuItemId,
        name: matchedDish.name,
        price: matchedDish.price,
        isVeg: matchedDish.isVeg,
        quantity: 1,
        selectedAddOns: [],
        itemTotal: matchedDish.price
      }],
      deliveryNotes: `[BiteMatch Order] Mutual Craving Match by ${activeParticipantName}`
    }));

    setShowMatchModal(false);
    navigate('/checkout');
  };

  // Keyboard navigation for power users
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showMatchModal || !session || currentCardIdx >= (session.dishes?.length || 0)) return;
      if (e.key === 'ArrowRight') handleSwipe(true);
      if (e.key === 'ArrowLeft') handlePass();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session, currentCardIdx, showMatchModal]);

  // Current Card & Deck
  const activeDish = session?.dishes?.[currentCardIdx];
  const isDeckFinished = session && session.dishes && currentCardIdx >= session.dishes.length;
  const matchesList = session?.matches || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 min-h-[85vh] flex flex-col justify-center">
      
      {/* View 1: Room Lobby / Start Room */}
      {!session ? (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-stone-200 shadow-xl space-y-8 animate-fadeIn max-w-xl mx-auto w-full">
          
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold uppercase tracking-wider">
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500 animate-pulse" />
              <span>BiteMatch™ • Tinder for Food</span>
            </div>
            
            <h1 className="font-serif text-3xl sm:text-4xl font-black text-charcoal-900 leading-tight">
              Swipe to Match What to Eat
            </h1>
            
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
              Tired of the endless <em className="text-rose-600 font-semibold">"Tu bata kya khayein?"</em> debate? Swipe through artisanal dishes together. The second you both swipe right — <strong>IT'S A MATCH!</strong>
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl">
              {errorMsg}
            </div>
          )}

          {/* User Name & Diet Preferences */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600">Your Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Rishita / Rahul"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-medium focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600">Dietary Filter</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'all', label: '🍕 All Gourmet Dishes' },
                  { id: 'pure_veg', label: '🥗 Pure Veg Only' },
                  { id: 'non_veg', label: '🥩 Non-Veg & Seafood' },
                  { id: 'vegan', label: '🌱 100% Vegan' }
                ].map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDietPref(d.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                      dietPref === d.id
                        ? 'bg-rose-50 border-rose-500 text-rose-900 ring-1 ring-rose-500'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions: Start 2-Player Room VS Join With Code */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => handleCreateSession(false)}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Users className="w-4 h-4" />
              <span>Create 2-Player Match Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleCreateSession(true)}
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Solo Mode: Quick Swipe for Myself</span>
            </button>

            {/* Join Code Input */}
            <div className="pt-4 border-t border-stone-100 flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter 4-digit code (e.g. 7215)"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value)}
                className="flex-1 px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs uppercase font-mono font-bold tracking-wider focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={handleJoinSession}
                disabled={loading}
                className="px-5 py-3 rounded-2xl bg-charcoal-900 hover:bg-charcoal-800 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Join Room
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* View 2: Active BiteMatch Swipe Arena */
        <div className="space-y-6 max-w-lg mx-auto w-full">
          
          {/* Top Bar: Code, Share Pill & Matches Counter */}
          <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                {session.sessionCode}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors cursor-pointer"
                title="Copy share link for friend"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Partner Connection Status / Solo Mode Indicator */}
            <div className="flex items-center gap-1.5 text-xs">
              {session.mode === 'solo' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 font-bold border border-rose-200">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Solo Mode</span>
                </span>
              ) : session.partner?.name && session.partner.name !== session.creator?.name ? (
                <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{session.partner.name} joined</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-600 font-medium animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Waiting for partner to enter code...</span>
                </span>
              )}
            </div>

            {/* Matches / Cravings Button */}
            <button
              type="button"
              onClick={() => setShowMatchesDrawer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold cursor-pointer shadow-xs"
            >
              <Heart className="w-3.5 h-3.5 fill-white" />
              <span>{session.mode === 'solo' ? `Cravings (${matchesList.length})` : `Matches (${matchesList.length})`}</span>
            </button>
          </div>

          {/* Duo Mode Tip Banner if waiting for partner */}
          {session.mode === 'duo' && (!session.partner?.name || session.partner.name === session.creator?.name) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between gap-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  Share code <strong className="font-mono text-sm text-charcoal-900">{session.sessionCode}</strong> with your partner to start matching!
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-2.5 py-1 bg-white hover:bg-amber-100 rounded-lg border border-amber-300 font-bold text-[11px] text-amber-800 transition-colors cursor-pointer"
              >
                {copiedLink ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
          )}

          {/* Swipe Arena Container */}
          {!isDeckFinished && activeDish ? (
            <div className="relative flex flex-col items-center">
              
              {/* Tinder Card Stack */}
              <div
                className="relative w-full aspect-[3/4] max-h-[500px] select-none touch-none cursor-grab active:cursor-grabbing"
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onTouchStart={(e) => {
                  setIsDragging(true);
                  dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                }}
                onTouchMove={(e) => {
                  if (!isDragging) return;
                  const dx = e.touches[0].clientX - dragStartRef.current.x;
                  const dy = e.touches[0].clientY - dragStartRef.current.y;
                  setDragOffset({ x: dx, y: dy });
                }}
                onTouchEnd={onMouseUp}
              >
                {/* Visual Card */}
                <div
                  style={{
                    transform: `translate(${dragOffset.x}px, ${dragOffset.y * 0.4}px) rotate(${dragOffset.x * 0.08}deg)`,
                    transition: isDragging ? 'none' : 'transform 0.3s ease-out'
                  }}
                  className="absolute inset-0 bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col"
                >
                  {/* Dish Image */}
                  <div className="relative flex-1 bg-stone-100 overflow-hidden">
                    <img
                      src={activeDish.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'}
                      alt={activeDish.name}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/80 via-transparent to-transparent pointer-events-none" />

                    {/* Drag Stamp: LIKE or NOPE */}
                    {dragOffset.x > 50 && (
                      <div className="absolute top-6 left-6 px-4 py-2 border-4 border-emerald-500 rounded-2xl text-emerald-500 font-black text-2xl uppercase tracking-widest rotate-[-15deg] bg-emerald-500/10 backdrop-blur-xs">
                        CRAVE IT ❤️
                      </div>
                    )}
                    {dragOffset.x < -50 && (
                      <div className="absolute top-6 right-6 px-4 py-2 border-4 border-rose-500 rounded-2xl text-rose-500 font-black text-2xl uppercase tracking-widest rotate-[15deg] bg-rose-500/10 backdrop-blur-xs">
                        PASS ❌
                      </div>
                    )}

                    {/* Veg Badge & Category */}
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-md ${
                        activeDish.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                      }`}>
                        {activeDish.isVeg ? 'Veg' : 'Non-Veg'}
                      </span>
                    </div>

                    {/* Text Over Image */}
                    <div className="absolute bottom-4 left-5 right-5 text-white space-y-1 pointer-events-none">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-citrus-400">
                          {activeDish.restaurantName}
                        </span>
                        <span className="font-mono text-xl font-black text-white">
                          ₹{activeDish.price}
                        </span>
                      </div>
                      <h2 className="font-serif text-2xl font-bold leading-tight">
                        {activeDish.name}
                      </h2>
                      <p className="text-xs text-stone-300 line-clamp-2">
                        {activeDish.description || activeDish.category}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Swipe Controls Bar */}
              <div className="flex items-center justify-center gap-6 mt-6">
                {/* Pass / Skip Button */}
                <button
                  type="button"
                  onClick={handlePass}
                  className="w-14 h-14 rounded-full bg-white border-2 border-rose-200 text-rose-500 hover:bg-rose-50 hover:scale-110 active:scale-95 transition-all shadow-md flex items-center justify-center cursor-pointer"
                  title="Pass / Skip (Left Arrow)"
                >
                  <X className="w-7 h-7 stroke-[2.5]" />
                </button>

                {/* Super Like / Star */}
                <button
                  type="button"
                  onClick={() => handleSwipe(true, true)}
                  className="w-12 h-12 rounded-full bg-white border-2 border-amber-200 text-amber-500 hover:bg-amber-50 hover:scale-110 active:scale-95 transition-all shadow-md flex items-center justify-center cursor-pointer"
                  title="Super Crave ⭐"
                >
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </button>

                {/* Like / Crave It Button */}
                <button
                  type="button"
                  onClick={() => handleSwipe(true)}
                  className="w-14 h-14 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white hover:scale-110 active:scale-95 transition-all shadow-lg flex items-center justify-center cursor-pointer"
                  title="Crave It! (Right Arrow)"
                >
                  <Heart className="w-7 h-7 fill-white stroke-[2]" />
                </button>
              </div>

              {/* Progress Indicator */}
              <div className="mt-4 text-center text-xs text-stone-400">
                Card {currentCardIdx + 1} of {session.dishes.length} • Use Arrow Keys &larr; &rarr; to swipe
              </div>
            </div>
          ) : (
            /* Finished Deck View */
            <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-6 shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <PartyPopper className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="font-serif text-2xl font-bold text-charcoal-900">
                  {session?.mode === 'solo' ? "You've Picked Your Cravings!" : "You've Reached the End of the Deck!"}
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  {session?.mode === 'solo'
                    ? (matchesList.length > 0 
                        ? `You shortlisted ${matchesList.length} craving${matchesList.length > 1 ? 's' : ''}! Order your favorite below:`
                        : 'No dishes liked yet. Try swiping through the deck again!')
                    : (matchesList.length > 0 
                        ? `Woohoo! You found ${matchesList.length} mutual match${matchesList.length > 1 ? 'es' : ''}. Check them out below and order together!`
                        : 'No mutual matches found yet. Try reshuffling or swiping again!')}
                </p>
              </div>

              {matchesList.length > 0 ? (
                <div className="space-y-3 max-w-md mx-auto text-left">
                  {matchesList.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-between gap-3"
                    >
                      <div>
                        <h4 className="font-bold text-xs text-charcoal-900">{m.name}</h4>
                        <p className="text-[10px] text-stone-500">{m.restaurantName} • ₹{m.price}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOrderMatchedDish(m)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Order This
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setCurrentCardIdx(0);
                  setSwipedDishes({});
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Swipe Deck Again</span>
              </button>
            </div>
          )}

        </div>
      )}

      {/* Celebration Modal: "IT'S A MATCH!" (Only in 2-Player Duo mode on genuine mutual match) */}
      {showMatchModal && latestMatch && session?.mode !== 'solo' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 text-center space-y-6 shadow-2xl border-2 border-rose-400 relative overflow-hidden">
            
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center mx-auto shadow-xl animate-bounce">
              <Heart className="w-10 h-10 fill-white" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black tracking-widest uppercase text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                🎉 Mutual Craving Unlocked!
              </span>
              <h2 className="font-serif text-3xl font-black text-charcoal-900 leading-tight">
                IT'S A MATCH!
              </h2>
              <p className="text-xs text-stone-500">
                {session?.creator?.name && session?.partner?.name
                  ? `Both ${session.creator.name} & ${session.partner.name} swiped right on this dish!`
                  : 'Both of you swiped right on this dish!'}
              </p>
            </div>

            {/* Matched Dish Card */}
            <div className="rounded-2xl border border-stone-200 overflow-hidden bg-stone-50 text-left">
              <img
                src={latestMatch.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'}
                alt={latestMatch.name}
                className="w-full h-36 object-cover"
              />
              <div className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-rose-600 uppercase">
                    {latestMatch.restaurantName}
                  </span>
                  <span className="font-mono text-sm font-bold text-charcoal-900">
                    ₹{latestMatch.price}
                  </span>
                </div>
                <h4 className="font-bold text-base text-charcoal-900 leading-snug">
                  {latestMatch.name}
                </h4>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleOrderMatchedDish(latestMatch)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Order This Matched Dish & Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowMatchModal(false)}
                className="w-full py-2.5 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
              >
                Keep Swiping for More Matches
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Matches Drawer */}
      {showMatchesDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[80vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-lg text-charcoal-900 flex items-center gap-2">
                  <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                  <span>{session?.mode === 'solo' ? `My Shortlisted Cravings (${matchesList.length})` : `Your Mutual Matches (${matchesList.length})`}</span>
                </h3>
                <p className="text-xs text-stone-500">
                  {session?.mode === 'solo' ? 'Dishes you swiped right on in this solo session' : 'Dishes both of you loved in this session'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMatchesDrawer(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {matchesList.length > 0 ? (
                matchesList.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/70 hover:border-rose-300 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-charcoal-900 truncate">{m.name}</h4>
                      <p className="text-[10px] text-stone-500">{m.restaurantName} • ₹{m.price}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOrderMatchedDish(m)}
                      className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors cursor-pointer flex-shrink-0"
                    >
                      Order
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-stone-400 space-y-2">
                  <Heart className="w-8 h-8 text-stone-300 mx-auto" />
                  <p>No mutual matches yet.</p>
                  <p className="text-[11px] text-stone-400">Keep swiping to find common cravings!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
