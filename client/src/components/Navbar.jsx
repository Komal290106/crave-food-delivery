import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/authSlice';
import { resetToDemoCluster } from '../redux/locationSlice';
import LocationModal from './LocationModal';
import SafeBiteModal from './SafeBiteModal';
import {
  ShoppingBag,
  MapPin,
  User,
  Compass,
  Tag,
  Clock,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Radio,
  Flame,
  Edit2,
  ShieldCheck,
  Calendar,
  Users,
  Dices,
  Sparkles,
  Heart
} from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.cart);
  const activeLocation = useSelector((state) => state.location);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [safeBiteModalOpen, setSafeBiteModalOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  // Auto-correct any stale Nurpur/Delhi mismatched state in localStorage
  useEffect(() => {
    if (
      activeLocation?.city?.toLowerCase().includes('nurpur') ||
      (activeLocation?.pincode?.startsWith('110') && activeLocation?.city !== 'New Delhi')
    ) {
      dispatch(resetToDemoCluster());
    }
  }, [activeLocation, dispatch]);

  // Close dropdowns on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
    setMoreDropdownOpen(false);
  }, [location.pathname]);

  const totalCartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleLogout = () => {
    dispatch(logout());
    setProfileDropdownOpen(false);
    navigate('/');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-ivory-50/95 backdrop-blur-md border-b border-ivory-200 transition-all">
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 lg:gap-4 xl:gap-6 h-20">
          
          {/* Left: Brand & Location */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-aubergine-900 flex items-center justify-center text-ivory-50 shadow-md group-hover:bg-citrus-600 transition-colors">
                <Flame className="w-6 h-6 text-citrus-500 group-hover:text-white transition-colors" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-black tracking-tight text-charcoal-900 leading-none">
                  CRAVE
                </span>
                <span className="text-[10px] tracking-widest uppercase font-semibold text-citrus-600">
                  Haute Cuisine
                </span>
              </div>
            </Link>

            {/* Interactive Location Selector Button */}
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-ivory-100 hover:bg-ivory-200 border border-ivory-300 text-xs text-charcoal-800 transition-all group whitespace-nowrap flex-shrink-0 cursor-pointer"
              title="Change Delivery Location"
            >
              <MapPin className="w-3.5 h-3.5 text-citrus-600 group-hover:scale-110 transition-transform flex-shrink-0" />
              <span className="font-semibold truncate max-w-[110px] sm:max-w-[140px] xl:max-w-[170px]">
                {activeLocation?.city && !activeLocation.city.toLowerCase().includes('nurpur')
                  ? `${activeLocation.city} (${activeLocation.pincode || '110001'})`
                  : 'New Delhi (110001)'}
              </span>
              <ChevronDown className="w-3 h-3 text-stone-400 group-hover:text-charcoal-700 flex-shrink-0" />
            </button>
          </div>

          {/* Center: Role-Based Navigation Links */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-5 2xl:gap-6 text-xs xl:text-[13px] 2xl:text-sm font-medium text-stone-700 whitespace-nowrap">
            {/* 1. Restaurant / Chef Owner Navigation */}
            {user?.role === 'restaurant' && (
              <>
                <Link
                  to="/restaurant-dashboard"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors whitespace-nowrap ${
                    location.pathname === '/restaurant-dashboard' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  <Flame className="w-4 h-4 text-citrus-600 flex-shrink-0" />
                  <span>Kitchen Console</span>
                </Link>
                <Link
                  to="/support"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors whitespace-nowrap ${
                    location.pathname === '/support' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  <span>Customer Care</span>
                </Link>
              </>
            )}

            {/* 2. Courier / Delivery Partner Navigation */}
            {user?.role === 'delivery_partner' && (
              <>
                <Link
                  to="/partner-dashboard"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors whitespace-nowrap ${
                    location.pathname === '/partner-dashboard' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  <Radio className="w-4 h-4 text-citrus-600 animate-pulse flex-shrink-0" />
                  <span>Courier Fleet Portal</span>
                </Link>
                <Link
                  to="/support"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors whitespace-nowrap ${
                    location.pathname === '/support' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  <span>Customer Care</span>
                </Link>
              </>
            )}

            {/* 3. Platform Admin Navigation */}
            {user?.role === 'admin' && (
              <>
                <Link
                  to="/admin-dashboard"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors whitespace-nowrap ${
                    location.pathname === '/admin-dashboard' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  <span>Platform Governance</span>
                </Link>
                <Link
                  to="/restaurant-dashboard"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors whitespace-nowrap ${
                    location.pathname === '/restaurant-dashboard' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  <Flame className="w-4 h-4 text-citrus-600 flex-shrink-0" />
                  <span>Kitchen Console</span>
                </Link>
                <Link
                  to="/restaurants"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors whitespace-nowrap ${
                    location.pathname === '/restaurants' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  <Compass className="w-4 h-4 flex-shrink-0" />
                  <span>Inspect Diners</span>
                </Link>
                <Link
                  to="/support"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors whitespace-nowrap ${
                    location.pathname === '/support' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  <span>Customer Care</span>
                </Link>
              </>
            )}

            {/* 4. Diner / Customer / Guest Navigation */}
            {(!user || user.role === 'customer') && (
              <>
                <Link
                  to="/restaurants"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors whitespace-nowrap ${
                    location.pathname === '/restaurants' ? 'text-citrus-600 font-bold' : ''
                  }`}
                >
                  <Compass className="w-4 h-4 flex-shrink-0" />
                  <span>Restaurants</span>
                </Link>

                <Link
                  to="/match"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all whitespace-nowrap ${
                    location.pathname.startsWith('/match')
                      ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold shadow-2xs'
                      : 'hover:bg-rose-50/80 border-rose-200/80 text-rose-600 font-semibold'
                  }`}
                  title="BiteMatch - Food Swipe & Match with Friends / Partner"
                >
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 flex-shrink-0 animate-pulse" />
                  <span>BiteMatch</span>
                </Link>

                <Link
                  to="/mystery-box"
                  className={`flex items-center gap-1.5 hover:text-amber-600 transition-colors whitespace-nowrap ${
                    location.pathname === '/mystery-box' ? 'text-amber-600 font-semibold' : ''
                  }`}
                  title="Chef's Culinary Roulette & Mystery Tasting Vault"
                >
                  <Dices className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>Mystery Vault</span>
                </Link>

                <Link
                  to="/party-planner"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors whitespace-nowrap ${
                    location.pathname === '/party-planner' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                  title="Host-A-Party Bulk Feast Planner"
                >
                  <Users className="w-4 h-4 text-citrus-600 flex-shrink-0" />
                  <span>Party Planner</span>
                </Link>

                <Link
                  to="/subscriptions"
                  className={`hidden xl:flex items-center gap-1.5 hover:text-citrus-600 transition-colors whitespace-nowrap ${
                    location.pathname === '/subscriptions' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                  title="Daily Lunch Desk Scheduler"
                >
                  <Calendar className="w-4 h-4 text-citrus-600 flex-shrink-0" />
                  <span>Desk Lunch</span>
                </Link>

                {/* Visible on 2xl ultra-wide monitors */}
                <Link
                  to="/offers"
                  className={`hidden 2xl:flex items-center gap-1.5 hover:text-citrus-600 transition-colors whitespace-nowrap ${
                    location.pathname === '/offers' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  <Tag className="w-4 h-4 flex-shrink-0" />
                  <span>Offers</span>
                </Link>

                <Link
                  to="/tracking"
                  className={`hidden 2xl:flex items-center gap-1.5 hover:text-citrus-600 transition-colors whitespace-nowrap ${
                    location.pathname.startsWith('/tracking') ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  <Radio className="w-4 h-4 text-emerald-600 animate-pulse flex-shrink-0" />
                  <span>Live Tracker</span>
                </Link>

                {/* More Dropdown for mid-screen laptops/desktops */}
                <div className="relative 2xl:hidden flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                    className="flex items-center gap-1 hover:text-citrus-600 transition-colors py-1 cursor-pointer font-medium"
                  >
                    <span>More</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreDropdownOpen ? 'rotate-180 text-citrus-600' : 'text-stone-400'}`} />
                  </button>

                  {moreDropdownOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 animate-fadeIn"
                      onMouseLeave={() => setMoreDropdownOpen(false)}
                    >
                      <Link
                        to="/subscriptions"
                        onClick={() => setMoreDropdownOpen(false)}
                        className="xl:hidden flex items-center gap-2.5 px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 hover:text-citrus-600"
                      >
                        <Calendar className="w-4 h-4 text-citrus-600" />
                        <div>
                          <div className="font-semibold text-charcoal-900">Desk Lunch</div>
                          <div className="text-[10px] text-stone-400">Meal subscriptions</div>
                        </div>
                      </Link>

                      <Link
                        to="/offers"
                        onClick={() => setMoreDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 hover:text-citrus-600"
                      >
                        <Tag className="w-4 h-4 text-amber-500" />
                        <div>
                          <div className="font-semibold text-charcoal-900">Offers & Coupons</div>
                          <div className="text-[10px] text-stone-400">Gourmet deals</div>
                        </div>
                      </Link>

                      <Link
                        to="/tracking"
                        onClick={() => setMoreDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 hover:text-citrus-600"
                      >
                        <Radio className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div className="font-semibold text-charcoal-900">Live Order Tracker</div>
                          <div className="text-[10px] text-stone-400">GPS tracking</div>
                        </div>
                      </Link>

                      <Link
                        to="/support"
                        onClick={() => setMoreDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 hover:text-citrus-600 border-t border-stone-100"
                      >
                        <ShieldCheck className="w-4 h-4 text-indigo-500" />
                        <div>
                          <div className="font-semibold text-charcoal-900">Customer Care</div>
                          <div className="text-[10px] text-stone-400">Concierge & support</div>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </nav>

          {/* Right: Cart & Auth */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 flex-shrink-0">
            {/* SafeBite Dietary & Allergy Guard Button */}
            {(!user || user.role === 'customer') && (
              <button
                type="button"
                onClick={() => setSafeBiteModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold transition-all shadow-2xs group whitespace-nowrap flex-shrink-0"
                title="Configure SafeBite Dietary & Allergen Shield"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform flex-shrink-0" />
                <span className="hidden sm:inline">SafeBite™ Shield</span>
              </button>
            )}

            {/* Cart Button: Visible exclusively to Customers & Guests */}
            {(!user || user.role === 'customer') && (
              <Link
                to="/cart"
                className="relative p-2 rounded-full bg-ivory-100 hover:bg-ivory-200 text-charcoal-900 border border-ivory-300 transition-colors flex items-center justify-center group flex-shrink-0"
                title="View Cart"
              >
                <ShoppingBag className="w-5 h-5 text-charcoal-900 group-hover:scale-105 transition-transform flex-shrink-0" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-citrus-600 text-white text-[10px] font-bold h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center shadow-sm">
                    {totalCartCount}
                  </span>
                )}
              </Link>
            )}

            {/* User Profile / Auth */}
            {isAuthenticated ? (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 pl-2.5 sm:pl-3 pr-2 py-1.5 rounded-full bg-ivory-100 hover:bg-ivory-200 border border-ivory-300 text-sm font-medium text-charcoal-900 transition-colors whitespace-nowrap"
                >
                  <div className="w-7 h-7 rounded-full bg-aubergine-800 text-white flex items-center justify-center text-xs font-bold uppercase flex-shrink-0">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden sm:inline font-semibold text-xs max-w-[100px] truncate">
                    {user?.name?.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-stone-100">
                      <p className="text-xs text-stone-500">Signed in as</p>
                      <p className="text-sm font-bold text-charcoal-900 truncate">{user?.name}</p>
                      <span className="inline-block px-2 py-0.5 mt-1 bg-ivory-200 text-aubergine-900 rounded text-[10px] font-semibold uppercase tracking-wider">
                        {user?.role?.replace('_', ' ')}
                      </span>
                    </div>

                    {user?.role === 'restaurant' && (
                      <Link
                        to="/restaurant-dashboard"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-citrus-600"
                      >
                        Restaurant Console
                      </Link>
                    )}

                    {user?.role === 'delivery_partner' && (
                      <Link
                        to="/partner-dashboard"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-citrus-600"
                      >
                        Delivery Partner Portal
                      </Link>
                    )}

                    {user?.role === 'admin' && (
                      <Link
                        to="/admin-dashboard"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-citrus-600"
                      >
                        Platform Admin Suite
                      </Link>
                    )}

                    {(!user || user.role === 'customer') && (
                      <Link
                        to="/orders"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-citrus-600"
                      >
                        Past Orders
                      </Link>
                    )}

                    <Link
                      to="/support"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-citrus-600"
                    >
                      Customer Care
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-stone-100 mt-1 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <Link
                  to="/login"
                  className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-charcoal-900 hover:text-citrus-600 transition-colors whitespace-nowrap"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3 sm:px-4 py-1.5 rounded-full bg-citrus-600 hover:bg-citrus-500 text-white text-xs font-semibold shadow-sm transition-all whitespace-nowrap"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-stone-600 hover:text-stone-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Role-Specific Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-ivory-50 border-b border-ivory-300 px-4 pt-2 pb-6 space-y-3">
          {user?.role === 'restaurant' && (
            <>
              <Link
                to="/restaurant-dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-bold text-charcoal-900 hover:text-citrus-600"
              >
                Kitchen Console
              </Link>
              <Link
                to="/support"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-stone-800 hover:text-citrus-600"
              >
                Customer Care & Concierge
              </Link>
            </>
          )}

          {user?.role === 'delivery_partner' && (
            <>
              <Link
                to="/partner-dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-bold text-charcoal-900 hover:text-citrus-600"
              >
                Courier Fleet Portal
              </Link>
              <Link
                to="/support"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-stone-800 hover:text-citrus-600"
              >
                Customer Care & Concierge
              </Link>
            </>
          )}

          {user?.role === 'admin' && (
            <>
              <Link
                to="/admin-dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-bold text-charcoal-900 hover:text-citrus-600"
              >
                Platform Governance Suite
              </Link>
              <Link
                to="/restaurants"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-stone-800 hover:text-citrus-600"
              >
                Inspect Restaurants
              </Link>
              <Link
                to="/support"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-stone-800 hover:text-citrus-600"
              >
                Customer Care & Concierge
              </Link>
            </>
          )}

          {(!user || user.role === 'customer') && (
            <>
              <Link
                to="/restaurants"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-stone-800 hover:text-citrus-600"
              >
                Explore Restaurants
              </Link>
              <Link
                to="/mystery-box"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-bold text-amber-600 hover:text-amber-700"
              >
                🎲 Chef's Mystery Vault
              </Link>
              <Link
                to="/match"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-2 text-base font-bold text-rose-600 hover:text-rose-700"
              >
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                <span>BiteMatch (Swipe to Match)</span>
              </Link>
              <Link
                to="/offers"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-stone-800 hover:text-citrus-600"
              >
                Offers & Coupons
              </Link>
              <Link
                to="/tracking"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-stone-800 hover:text-citrus-600"
              >
                Live Order Tracking
              </Link>
              {isAuthenticated && (
                <Link
                  to="/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-base font-medium text-stone-800 hover:text-citrus-600"
                >
                  My Orders
                </Link>
              )}
              <Link
                to="/support"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-stone-800 hover:text-citrus-600"
              >
                Customer Care & FAQs
              </Link>
            </>
          )}
        </div>
      )}
    </header>
    {/* Interactive Delivery Location Selector Modal */}
    <LocationModal
      isOpen={locationModalOpen}
      onClose={() => setLocationModalOpen(false)}
    />

    {/* SafeBite Dietary & Allergy Guard Modal */}
    <SafeBiteModal
      isOpen={safeBiteModalOpen}
      onClose={() => setSafeBiteModalOpen(false)}
    />
  </>
);
}
