import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  MapPin,
  Star,
  Heart,
  ArrowRight,
  Shield,
  Clock,
  Zap,
  Wrench,
  Hammer,
  Palette,
  Sparkles,
  Snowflake,
  Droplets,
  User,
  X,
  Send,
  MessageCircle,
  Calendar,
  ChevronRight,
  Phone,
  Trash2,
  Navigation,
  AlertTriangle,
  SlidersHorizontal,
  Compass,
  Radio,
} from 'lucide-react';
import ChromaGrid from '../components/ChromaGrid';
import AnimatedList from '../components/AnimatedList';
import { apiFetch } from '../api';
import {
  LILONGWE_CENTER,
  LILONGWE_AREAS,
  isInsideLilongwe,
  calculateDistanceKm,
  reverseGeocodeLilongwe,
} from '../constants/lilongwe';
import { ProviderLocationPicker } from '../components/ProviderLocationPicker';
import type { ProviderItem } from '../components/ClientProvidersMap';

// Lazy load the map to keep bundle small
const ClientProvidersMap = lazy(() => import('../components/ClientProvidersMap'));

const serviceCategories = [
  'All',
  'Plumbing',
  'Electrician',
  'Carpentry',
  'Painting',
  'Cleaning',
  'AC Repair',
];

const categoryIcons: Record<string, React.ReactNode> = {
  Plumbing: <Droplets size={28} />,
  Electrician: <Zap size={28} />,
  Carpentry: <Hammer size={28} />,
  Painting: <Palette size={28} />,
  Cleaning: <Sparkles size={28} />,
  'AC Repair': <Snowflake size={28} />,
};

interface ClientLocation {
  lat: number;
  lng: number;
  areaName: string;
  source: 'gps' | 'manual';
}

export const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Location State
  const [clientLocation, setClientLocation] = useState<ClientLocation | null>(() => {
    try {
      const saved = localStorage.getItem('kind_client_location');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [hasPromptedLocation, setHasPromptedLocation] = useState<boolean>(() => {
    return localStorage.getItem('kind_location_prompted') === 'true';
  });

  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isLiveGps, setIsLiveGps] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [outsideLilongweError, setOutsideLilongweError] = useState<boolean>(false);
  const [pendingModalLocation, setPendingModalLocation] = useState<{
    area_name: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Sync client location to Supabase DB + localStorage
  const persistClientLocation = (newLoc: ClientLocation) => {
    setClientLocation(newLoc);
    localStorage.setItem('kind_client_location', JSON.stringify(newLoc));
    localStorage.setItem('kind_location_prompted', 'true');
    setHasPromptedLocation(true);

    const userId = localStorage.getItem('userId');
    if (userId && isInsideLilongwe(newLoc.lat, newLoc.lng)) {
      apiFetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: newLoc.areaName,
          area_name: newLoc.areaName,
          latitude: newLoc.lat,
          longitude: newLoc.lng,
        }),
      }).catch(() => {});
    }
  };

  // Load saved client location from DB on mount
  useEffect(() => {
    const loadProfileLocation = async () => {
      try {
        const res = await apiFetch('/api/me');
        if (res.ok) {
          const data = await res.json();
          const u = data?.user;
          if (u?.id) localStorage.setItem('userId', String(u.id));
          if (
            typeof u?.latitude === 'number' &&
            typeof u?.longitude === 'number' &&
            isInsideLilongwe(u.latitude, u.longitude)
          ) {
            const dbLoc: ClientLocation = {
              lat: u.latitude,
              lng: u.longitude,
              areaName: u.area_name || u.location || 'City Centre',
              source: 'manual',
            };
            setClientLocation(dbLoc);
            localStorage.setItem('kind_client_location', JSON.stringify(dbLoc));
          }
        }
      } catch {
        // Ignore if offline
      }
    };
    loadProfileLocation();
  }, []);

  // Search & Filter State
  const [selectedService, setSelectedService] = useState<string>('All');
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState<boolean>(false);
  const [providersError, setProvidersError] = useState<string | null>(null);

  // Mobile View Toggle ('map' | 'list')
  const [mobileView, setMobileView] = useState<'split' | 'map' | 'list'>('split');

  // Conversations State
  const [conversations, setConversations] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [showChatModal, setShowChatModal] = useState<boolean>(false);

  // 1. Fetch Providers when Location, Radius, or Service changes (+ 10s Live Poll)
  const fetchNearbyProviders = async (
    loc: ClientLocation,
    radius: number,
    service: string,
    silent = false
  ) => {
    if (!silent) {
      setIsLoadingProviders(true);
      setProvidersError(null);
    }
    try {
      const params = new URLSearchParams({
        lat: String(loc.lat),
        lng: String(loc.lng),
        radiusKm: String(radius),
      });

      if (service && service !== 'All') {
        params.append('service', service);
      }

      const res = await apiFetch(`/api/providers?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to search providers.');
      }

      const data = await res.json();
      setProviders(Array.isArray(data.providers) ? data.providers : []);
    } catch (err: any) {
      if (!silent) {
        console.error('Error fetching nearby providers:', err);
        setProvidersError(err.message || 'Failed to connect to provider service.');
        setProviders([]);
      }
    } finally {
      if (!silent) {
        setIsLoadingProviders(false);
      }
    }
  };

  useEffect(() => {
    if (!clientLocation) return;
    fetchNearbyProviders(clientLocation, radiusKm, selectedService, false);

    // Poll every 10 seconds so moving provider pins update in real time
    const pollInterval = setInterval(() => {
      fetchNearbyProviders(clientLocation, radiusKm, selectedService, true);
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [clientLocation?.lat, clientLocation?.lng, radiusKm, selectedService]);

  const stopLiveGps = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLiveGps(false);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // 2. Real-Time Geolocation Watcher (Browser GPS + OpenStreetMap Nominatim)
  const handleRequestGeolocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Please select an area manually.');
      setShowLocationModal(true);
      return;
    }

    if (isLiveGps) {
      stopLiveGps();
      return;
    }

    setIsLocating(true);
    setOutsideLilongweError(false);

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsAccuracy(Math.round(accuracy));
        setIsLiveGps(true);

        // If browser GPS is inside Lilongwe, use exact coordinates;
        // if desktop ISP IP resolves outside Lilongwe (e.g. Blantyre gateway), calibrate to Lilongwe
        const useLat = isInsideLilongwe(latitude, longitude)
          ? latitude
          : clientLocation && isInsideLilongwe(clientLocation.lat, clientLocation.lng)
          ? clientLocation.lat
          : -13.9535;
        const useLng = isInsideLilongwe(latitude, longitude)
          ? longitude
          : clientLocation && isInsideLilongwe(clientLocation.lat, clientLocation.lng)
          ? clientLocation.lng
          : 33.7885;

        const resolvedAreaName = await reverseGeocodeLilongwe(useLat, useLng);

        const newLoc: ClientLocation = {
          lat: Number(useLat.toFixed(5)),
          lng: Number(useLng.toFixed(5)),
          areaName: resolvedAreaName,
          source: 'gps',
        };

        persistClientLocation(newLoc);
        setShowLocationModal(false);
      },
      (err) => {
        setIsLocating(false);
        stopLiveGps();
        console.warn('Geolocation failed or denied:', err.message);
        setShowLocationModal(true);
      },
      { timeout: 12000, enableHighAccuracy: true, maximumAge: 3000 }
    );

    watchIdRef.current = watchId;
  };

  // 3. Manual Area Selection or Interactive Map Pin Drag Handler
  const handleSelectArea = (areaName: string) => {
    stopLiveGps();
    const area = LILONGWE_AREAS.find((a) => a.name === areaName);
    if (!area) return;

    const newLoc: ClientLocation = {
      lat: area.lat,
      lng: area.lng,
      areaName: area.name,
      source: 'manual',
    };

    persistClientLocation(newLoc);
    setOutsideLilongweError(false);
    setShowLocationModal(false);
  };

  const handleMapPinMove = async (lat: number, lng: number) => {
    stopLiveGps();
    const resolvedAreaName = await reverseGeocodeLilongwe(lat, lng);
    const newLoc: ClientLocation = {
      lat: Number(lat.toFixed(5)),
      lng: Number(lng.toFixed(5)),
      areaName: resolvedAreaName,
      source: 'manual',
    };
    persistClientLocation(newLoc);
  };

  // 4. Fetch Client Conversations
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const fetchConversations = async () => {
      try {
        const res = await apiFetch(`/api/contact-requests/client/${userId}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          setConversations(list);

          const lastSeen = parseInt(localStorage.getItem('conversationLastSeen') || '0', 10);
          const newItems = list.filter((c) => c.approved_at && Date.parse(c.approved_at) > lastSeen);
          setUnreadCount(newItems.length);
        }
      } catch (e) {
        console.error('Failed to load conversations', e);
      }
    };

    fetchConversations();
  }, []);

  const openConversation = async (conv: any) => {
    setSelectedConversation(conv);
    setShowChatModal(true);

    const initialMessage = {
      id: `initial-${conv.id}`,
      sender_role: 'CLIENT',
      sender_id: conv.client_id || -1,
      message: conv.message,
      created_at: conv.created_at || conv.approved_at,
    };

    try {
      const res = await apiFetch(`/api/messages/${conv.id}`);
      if (res.ok) {
        const data = await res.json();
        const fetchedMessages = Array.isArray(data) ? data : [];
        const hasInitial = fetchedMessages.some(
          (m: any) => m.message === conv.message && m.sender_role === 'CLIENT'
        );
        if (!hasInitial && conv.message) {
          setMessages([initialMessage, ...fetchedMessages]);
        } else {
          setMessages(fetchedMessages);
        }
      } else {
        setMessages(conv.message ? [initialMessage] : []);
      }
    } catch {
      setMessages(conv.message ? [initialMessage] : []);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    if (!userId || !userName) return;

    try {
      const res = await apiFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_request_id: selectedConversation.id,
          sender_id: parseInt(userId),
          sender_name: userName,
          sender_role: 'CLIENT',
          message: newMessage.trim(),
        }),
      });

      if (res.ok) {
        const sentMessage = await res.json();
        setMessages((prev) => [...prev, sentMessage]);
        setNewMessage('');
      }
    } catch (e) {
      console.error('Failed to send message', e);
    }
  };

  return (
    <div className="space-y-12 pb-24">
      {/* ------------------------------------------------------------- */}
      {/* 1. Header & Location Status Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-[2rem] p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-indigo-300 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Lilongwe Service Marketplace
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Find Trusted Pros Near You
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-1 max-w-xl">
              Plumbers, electricians, and technicians verified and operating exclusively across Lilongwe.
            </p>
          </div>

          {/* Location Badge & Switcher */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/80 flex items-center justify-center text-white shrink-0">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200 flex items-center gap-1.5">
                  Your Area
                  {isLiveGps && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      LIVE {gpsAccuracy ? `±${gpsAccuracy}m` : 'GPS'}
                    </span>
                  )}
                </p>
                <p className="font-extrabold text-white text-base">
                  {clientLocation ? clientLocation.areaName : 'Not Set'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRequestGeolocation}
                disabled={isLocating}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 ${
                  isLiveGps
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                }`}
              >
                <Navigation size={13} className={isLocating ? 'animate-spin' : ''} />
                <span>{isLocating ? 'GPS...' : isLiveGps ? 'Live ON' : 'Live GPS'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowLocationModal(true)}
                className="px-3 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm"
              >
                Change
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. First Visit Location Prompt (if no location set yet) */}
      {/* ------------------------------------------------------------- */}
      {!clientLocation && (
        <div className="p-6 sm:p-8 bg-indigo-50/80 dark:bg-indigo-950/30 rounded-3xl border border-indigo-100 dark:border-indigo-900/40 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in duration-300">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Compass size={28} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Set your location in Lilongwe
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
                KIND uses your location to calculate exact travel distances and show verified providers closest to you.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={handleRequestGeolocation}
              disabled={isLocating}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Navigation size={18} className={isLocating ? 'animate-spin' : ''} />
              <span>{isLocating ? 'Detecting GPS...' : 'Use My Location'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowLocationModal(true)}
              className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors text-center"
            >
              Choose Area Manually
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. Search & Interactive Filters Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-4">
        {/* Service Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {serviceCategories.map((service) => (
            <button
              key={service}
              type="button"
              onClick={() => setSelectedService(service)}
              className={`px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                selectedService === service
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-indigo-300'
              }`}
            >
              {service}
            </button>
          ))}
        </div>

        {/* Radius & View Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal size={14} /> Radius:
            </span>
            {[2, 5, 10, 25].map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => setRadiusKm(km)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  radiusKm === km
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {km} km
              </button>
            ))}
          </div>

          {/* Mobile view toggle */}
          <div className="flex sm:hidden items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setMobileView('map')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                mobileView === 'map' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                mobileView === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              List ({providers.length})
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Map & Nearest Providers Grid */}
      {/* ------------------------------------------------------------- */}
      {clientLocation && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Nearest Providers ({providers.length})
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Sorted by distance from {clientLocation.areaName}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Map Column (Hidden on mobile if user chose 'list') */}
            <div
              className={`lg:col-span-6 ${
                mobileView === 'list' ? 'hidden sm:block' : 'block'
              }`}
            >
              <Suspense
                fallback={
                  <div className="w-full h-[380px] sm:h-[460px] rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold">Loading Lilongwe Map...</span>
                    </div>
                  </div>
                }
              >
                <ClientProvidersMap
                  userLocation={{
                    lat: clientLocation.lat,
                    lng: clientLocation.lng,
                    areaName: clientLocation.areaName,
                  }}
                  providers={providers}
                  radiusKm={radiusKm}
                  isLiveGps={isLiveGps}
                  onUserPinMove={handleMapPinMove}
                  onSelectProvider={(p) => navigate(`/client/provider/${p.id}`)}
                />
              </Suspense>
            </div>

            {/* Providers List Column (Hidden on mobile if user chose 'map') */}
            <div
              className={`lg:col-span-6 space-y-4 ${
                mobileView === 'map' ? 'hidden sm:block' : 'block'
              }`}
            >
              {isLoadingProviders ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 animate-pulse flex items-center gap-4"
                    >
                      <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-xl shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : providersError ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-red-100 dark:border-red-900/30">
                  <AlertTriangle className="mx-auto text-rose-500 mb-2" size={32} />
                  <p className="font-bold text-slate-900 dark:text-white text-base">
                    Search Error
                  </p>
                  <p className="text-slate-500 text-xs mt-1">{providersError}</p>
                  <button
                    type="button"
                    onClick={() =>
                      clientLocation &&
                      fetchNearbyProviders(clientLocation, radiusKm, selectedService)
                    }
                    className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200"
                  >
                    Try Again
                  </button>
                </div>
              ) : providers.length > 0 ? (
                <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
                  {providers.map((p) => (
                    <div
                      key={p.id}
                      className="group bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                          {p.photo_url ? (
                            <img
                              src={p.photo_url}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <User className="text-indigo-600 dark:text-indigo-400" size={24} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                              {p.name}
                            </h3>
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">
                              {p.service}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span className="flex items-center gap-1 font-medium">
                              <MapPin size={13} className="text-indigo-500" />
                              {p.area_name}
                            </span>
                            <span>•</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {p.distance_km} km away
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-amber-500 font-semibold">
                              <Star size={12} fill="currentColor" />
                              {p.rating && p.rating > 0 ? p.rating.toFixed(1) : 'New'}
                            </span>
                          </div>

                          {p.qualifications && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1 italic">
                              "{p.qualifications}"
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/client/provider/${p.id}`)}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-indigo-600 dark:hover:bg-indigo-100 transition-colors shrink-0 flex items-center justify-center gap-1.5"
                      >
                        <span>View Profile</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <Search size={28} />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    No providers found near you
                  </h3>
                  <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                    No verified {selectedService !== 'All' ? selectedService : ''} providers found within {radiusKm} km of {clientLocation.areaName}.
                  </p>
                  {radiusKm < 25 && (
                    <button
                      type="button"
                      onClick={() => setRadiusKm(25)}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all"
                    >
                      Expand Radius to 25 km
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. My Bookings & Conversations Section */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              My Requests & Conversations
            </h2>
            {unreadCount > 0 && (
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></span>
            )}
          </div>
        </div>

        {conversations.length > 0 ? (
          <div className="space-y-4">
            {conversations.map((conv) => {
              const timestamp = conv.approved_at || conv.created_at;
              return (
                <div
                  key={conv.id}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                        {conv.provider_name || 'Provider'}
                      </h3>
                      {conv.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-xs mt-1 line-clamp-1">
                      Task: {conv.task_description || 'General Service'} • Budget: MWK{' '}
                      {conv.estimated_budget || 'TBD'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openConversation(conv)}
                    className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-50 transition-colors"
                  >
                    Open Chat
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-400 text-xs sm:text-sm text-center py-6">
            No active conversations yet. Find a provider on the map above to get started.
          </p>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. Location Switcher Modal */}
      {/* ------------------------------------------------------------- */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowLocationModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <MapPin size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Set Your Location in Lilongwe
                </h3>
                <p className="text-xs text-slate-500">
                  Pick your area, use Live GPS, or drag your blue pin on the map.
                </p>
              </div>
            </div>

            <ProviderLocationPicker
              mode="client"
              initialAreaName={clientLocation?.areaName || 'City Centre'}
              initialLat={clientLocation?.lat ?? -13.9535}
              initialLng={clientLocation?.lng ?? 33.7885}
              onLocationChange={(loc) => {
                setPendingModalLocation(loc);
              }}
            />

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const chosen = pendingModalLocation || {
                    area_name: clientLocation?.areaName || 'City Centre',
                    latitude: clientLocation?.lat ?? -13.9535,
                    longitude: clientLocation?.lng ?? 33.7885,
                  };
                  persistClientLocation({
                    lat: chosen.latitude,
                    lng: chosen.longitude,
                    areaName: chosen.area_name,
                    source: 'manual',
                  });
                  setOutsideLilongweError(false);
                  setShowLocationModal(false);
                }}
                className="flex-1 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors"
              >
                Save My Location
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. Chat Modal */}
      {/* ------------------------------------------------------------- */}
      {showChatModal && selectedConversation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-0 sm:p-4">
          <div className="bg-[#efe7dd] rounded-none sm:rounded-2xl w-full h-full sm:max-w-md sm:h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
            <div className="bg-indigo-600 px-4 py-3 flex items-center gap-3 text-white shrink-0">
              <button
                type="button"
                onClick={() => setShowChatModal(false)}
                className="p-1 -ml-1 hover:bg-white/10 rounded-full"
              >
                <ArrowRight className="w-6 h-6 rotate-180" />
              </button>
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border border-white/30">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base truncate">
                  {selectedConversation.provider_name || 'Provider'}
                </h3>
                <p className="text-xs text-indigo-100 truncate opacity-90">
                  {selectedConversation.service || 'Verified Provider'}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#f0f2f5]">
              {messages.map((msg, idx) => {
                const isMe =
                  msg.sender_role === 'CLIENT' ||
                  msg.sender_id === parseInt(localStorage.getItem('userId') || '0', 10);
                return (
                  <div
                    key={idx}
                    className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-lg text-sm shadow-sm leading-relaxed ${
                        isMe
                          ? 'bg-indigo-100 text-slate-900 rounded-tr-none'
                          : 'bg-white text-slate-900 rounded-tl-none'
                      }`}
                    >
                      <p>{msg.message}</p>
                      <span className="text-[10px] block text-right mt-1 text-slate-400">
                        {msg.created_at
                          ? new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Now'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2.5 bg-[#f8fafc] flex items-center gap-2 border-t border-slate-200">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-white rounded-xl px-4 py-2.5 text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;
