import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, MapPin, Star, Heart, ArrowRight, Shield, Clock, Zap, Wrench, Hammer, Palette, Sparkles, Snowflake, Droplets, User, X, Send, MessageCircle, Calendar, ChevronRight, Phone, MoreVertical, Smile, Trash2, Navigation } from 'lucide-react';
import ChromaGrid from '../components/ChromaGrid';
import AnimatedList from '../components/AnimatedList';

const categories = [
   { name: 'Plumbing', icon: <Droplets size={32} />, color: 'bg-blue-100 text-blue-600' },
   { name: 'Electrician', icon: <Zap size={32} />, color: 'bg-yellow-100 text-yellow-600' },
   { name: 'Carpentry', icon: <Hammer size={32} />, color: 'bg-amber-100 text-amber-600' },
   { name: 'Painting', icon: <Palette size={32} />, color: 'bg-pink-100 text-pink-600' },
   { name: 'Cleaning', icon: <Sparkles size={32} />, color: 'bg-teal-100 text-teal-600' },
   { name: 'AC Repair', icon: <Snowflake size={32} />, color: 'bg-sky-100 text-sky-600' },
];

const popularServices = [
   { id: 1, title: 'Full Home Deep Clean', provider: 'Sparkle Co.', rating: 4.9, reviews: 120, price: '120,000', image: 'https://picsum.photos/seed/cleaning/400/300', tag: 'Best Seller' },
   { id: 2, title: 'Emergency Pipe Repair', provider: 'Mario Bros Plumbing', rating: 4.8, reviews: 85, price: '90,000', image: 'https://picsum.photos/seed/plumbing/400/300', tag: 'Fast Response' },
   { id: 3, title: 'Local Moving Assistance', provider: 'Swift Movers', rating: 4.7, reviews: 200, price: '300,000', image: 'https://picsum.photos/seed/moving/400/300', tag: null },
   { id: 4, title: 'Garden Maintenance', provider: 'Green Thumb', rating: 4.9, reviews: 45, price: '60,000', image: 'https://picsum.photos/seed/garden/400/300', tag: 'Eco Friendly' },
];

const availableServices = [
   'Plumbing',
   'Electrician',
   'Carpentry',
   'Painting',
   'Cleaning',
   'AC Repair',
   'Gardening',
   'Moving',
   'Pest Control'
];

const availableLocations = [
   'Area 3',
   'Area 6',
   'Area 9',
   'Area 10',
   'Area 11',
   'Area 12',
   'Area 15',
   'Area 18',
   'Area 25',
   'Area 43',
   'Area 47',
   'Area 49',
   'City Centre',
   'Kanengo',
   'Old Town',
   'Falls (Area 1)',
   'Likuni',
   'Lumbadzi',
   'Chigwirizano'
];

const heroMessages = [
   {
      title: "Expert help for your",
      highlight: "dream home",
      description: "Connect with verified professionals for cleaning, repairs, and renovations. Quality service, guaranteed."
   },
   {
      title: "Trusted professionals for",
      highlight: "every task",
      description: "From plumbing to painting, find skilled handymen ready to transform your space with excellence."
   },
   {
      title: "Quality service for your",
      highlight: "perfect space",
      description: "Book reliable experts for home improvements, maintenance, and repairs. Fast, affordable, and professional."
   },
   {
      title: "Local experts ready for",
      highlight: "your project",
      description: "Discover vetted professionals in your area. Get quotes, compare ratings, and hire with confidence."
   }
];

export const ClientDashboard: React.FC = () => {
   const navigate = useNavigate();
   const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
   const [searchQuery, setSearchQuery] = useState('');
   const [locationQuery, setLocationQuery] = useState('');
   const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);
   const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

   // Search State
   const [searchResults, setSearchResults] = useState<any[]>([]);
   const [isSearching, setIsSearching] = useState(false);
   const [hasSearched, setHasSearched] = useState(false);
   const [showResultsModal, setShowResultsModal] = useState(false);
   // Conversations (auto-approved contact requests)
   const [conversations, setConversations] = useState<any[]>([]);
   const [unreadCount, setUnreadCount] = useState(0);
   const [activeTab, setActiveTab] = useState<'bookings' | 'conversations'>('bookings');
   const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
   const [messages, setMessages] = useState<any[]>([]);
   const [newMessage, setNewMessage] = useState('');
   const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
   const [showChatModal, setShowChatModal] = useState(false);
   const [isLocating, setIsLocating] = useState(false);

   const handleAutoDetectLocation = () => {
      if (!navigator.geolocation) {
         alert("Geolocation is not supported by your browser");
         return;
      }

      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
         (position) => {
            // Artificial check if in Lilongwe (broadly)
            // Lilongwe coordinates: Lat ~-13.9, Lng ~33.7
            const { latitude, longitude } = position.coords;

            if (latitude < -13 && latitude > -15 && longitude > 33 && longitude < 35) {
               setLocationQuery('City Centre');
               alert("Detected your location in Lilongwe! Setting area to 'City Centre'.");
            } else {
               alert("Location detected, but you seem to be outside our Lilongwe service area.");
            }
            setIsLocating(false);
         },
         (error) => {
            console.error("Error getting location:", error);
            setIsLocating(false);
            if (error.code === 1) {
               alert("Location access denied. Please enable location permissions in your browser settings.");
            } else {
               alert("Could not determine your exact location. Please type your area manually.");
            }
         },
         { timeout: 10000 }
      );
   };

   // Rotate hero messages every 4 seconds
   React.useEffect(() => {
      const interval = setInterval(() => {
         setCurrentMessageIndex((prev) => (prev + 1) % heroMessages.length);
      }, 4000);
      return () => clearInterval(interval);
   }, []);

   // Fetch conversations (contact requests) for the logged-in client
   React.useEffect(() => {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const fetchConversations = async () => {
         try {
            const res = await fetch(`/api/contact-requests/client/${userId}`);
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

   // Proactively check for location if running as an installed PWA
   React.useEffect(() => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

      // If we are in PWA mode and location isn't set, try to auto-detect
      if (isStandalone && !locationQuery) {
         handleAutoDetectLocation();
      }
   }, []);

   const filteredServices = availableServices.filter(s =>
      s.toLowerCase().includes(searchQuery.toLowerCase())
   );

   const filteredLocations = availableLocations.filter(l =>
      l.toLowerCase().includes(locationQuery.toLowerCase())
   );

   const handleServiceSelect = (service: string) => {
      setSearchQuery(service);
      setShowServiceSuggestions(false);
   };

   const handleLocationSelect = (location: string) => {
      setLocationQuery(location);
      setShowLocationSuggestions(false);
   };

   const handleSearch = async () => {
      performSearch(searchQuery, locationQuery);
   };

   const markConversationsSeen = () => {
      setUnreadCount(0);
      localStorage.setItem('conversationLastSeen', Date.now().toString());
   };

   const openConversation = async (conv: any) => {
      setSelectedConversation(conv);
      setShowChatModal(true);

      // Initial message from the contact request
      const initialMessage = {
         id: `initial-${conv.id}`,
         sender_role: 'CLIENT',
         sender_id: conv.client_id || -1, // Assuming client_id exists on conv, otherwise use a placeholder or handle it
         message: conv.message,
         created_at: conv.created_at || conv.approved_at
      };

      // Fetch messages for this conversation
      try {
         const res = await fetch(`/api/messages/${conv.id}`);
         if (res.ok) {
            const data = await res.json();
            const fetchedMessages = Array.isArray(data) ? data : [];

            // If the API doesn't return the initial contact message (which is usually stored in contact_requests table, not messages table),
            // we manually prepend it for display purposes.
            // Check if it's already there to avoid duplicates (though IDs likely differ)
            const hasInitial = fetchedMessages.some((m: any) => m.message === conv.message && m.sender_role === 'CLIENT'); // Simple check

            if (!hasInitial && conv.message) {
               setMessages([initialMessage, ...fetchedMessages]);
            } else {
               setMessages(fetchedMessages);
            }
         } else {
            // If fetch fails or empty, show at least the initial message
            if (conv.message) {
               setMessages([initialMessage]);
            } else {
               setMessages([]);
            }
         }
      } catch (e) {
         console.error('Failed to load messages', e);
         // Fallback to showing just the initial message
         if (conv.message) {
            setMessages([initialMessage]);
         } else {
            setMessages([]);
         }
      }
   };

   const openProviderDetails = async (conv: any) => {
      try {
         const res = await fetch(`/api/users/${conv.provider_id}`);
         if (res.ok) {
            const provider = await res.json();
            setSelectedProvider(provider);
            setShowChatModal(true);
         }
      } catch (e) {
         console.error('Failed to load provider details', e);
      }
   };

   const sendMessage = async () => {
      if (!newMessage.trim() || !selectedConversation) return;

      const userId = localStorage.getItem('userId');
      const userName = localStorage.getItem('userName');
      if (!userId || !userName) return;

      try {
         const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               contact_request_id: selectedConversation.id,
               sender_id: parseInt(userId),
               sender_name: userName,
               sender_role: 'CLIENT',
               message: newMessage.trim()
            })
         });

         if (res.ok) {
            const sentMessage = await res.json();
            setMessages([...messages, sentMessage]);
            setNewMessage('');
         }
      } catch (e) {
         console.error('Failed to send message', e);
      }
   };

   // Placeholder for delete conversation
   const deleteConversation = (convId: string) => {
      if (window.confirm('Are you sure you want to delete this conversation?')) {
         setConversations(prev => prev.filter(c => c.id !== convId));
         // In real app, call API to delete or archive
      }
   };

   // Extracted search logic to be reusable
   const performSearch = async (service: string, loc: string) => {
      if (!service && !loc) return;

      // Update UI state to match the performed search
      setSearchQuery(service);
      setLocationQuery(loc);

      setIsSearching(true);
      setHasSearched(true);

      try {
         const params = new URLSearchParams();
         if (service) params.append('service', service);
         if (loc) params.append('location', loc);

         const res = await fetch(`/api/providers?${params.toString()}`);
         if (res.ok) {
            const data = await res.json();
            setSearchResults(data);
            setShowResultsModal(true);
         } else {
            setSearchResults([]);
            setShowResultsModal(true);
         }
      } catch (e) {
         console.error('Search failed', e);
         setSearchResults([]);
      } finally {
         setIsSearching(false);
      }
   };

   return (
      <div className="space-y-16 pb-20">
         {/* Hero Search */}
         <div className="relative rounded-[2.5rem] overflow-hidden bg-slate-900 text-white shadow-2xl shadow-slate-200">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581578731117-104f2a863a30?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 via-slate-900/80 to-transparent"></div>

            <div className="relative z-10 p-8 md:p-16 max-w-4xl mx-auto flex flex-col items-center text-center">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-medium text-indigo-300 mb-6">
                  <span className="relative flex h-2 w-2">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  #1 Trusted Service Platform
               </div>

               {/* Animated Hero Messages */}
               <div className="mb-6">
                  <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                     {heroMessages[currentMessageIndex].title} <br />
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-300 inline-block animate-fade-in">
                        {heroMessages[currentMessageIndex].highlight}
                     </span>
                  </h1>
               </div>
               <p className="text-lg text-slate-300 mb-10 max-w-xl leading-relaxed animate-fade-in">
                  {heroMessages[currentMessageIndex].description}
               </p>

               <div className="bg-white p-2 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center gap-2 max-w-2xl mx-auto transform transition-all hover:scale-[1.01] relative z-20">
                  {/* Service Input */}
                  <div className="flex-1 w-full relative">
                     <div className="flex items-center px-4 h-14 w-full bg-slate-50 rounded-xl md:bg-transparent">
                        <Search className="text-slate-400 w-5 h-5 mr-3" />
                        <input
                           type="text"
                           value={searchQuery}
                           onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setShowServiceSuggestions(true);
                           }}
                           onFocus={() => setShowServiceSuggestions(true)}
                           onBlur={() => setTimeout(() => setShowServiceSuggestions(false), 200)}
                           placeholder="What do you need help with?"
                           className="bg-transparent w-full focus:outline-none text-slate-900 placeholder-slate-400 font-medium text-center"
                        />
                     </div>
                     {/* Service Suggestions Dropdown */}
                     {showServiceSuggestions && searchQuery && filteredServices.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-30">
                           {filteredServices.map((service) => (
                              <div
                                 key={service}
                                 onClick={() => handleServiceSelect(service)}
                                 className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-slate-700 font-medium flex items-center gap-2"
                              >
                                 <Search size={14} className="text-slate-400" />
                                 {service}
                              </div>
                           ))}
                        </div>
                     )}
                  </div>

                  <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                  {/* Location Input */}
                  <div className="flex-1 w-full relative mt-2 md:mt-0">
                     <div className="flex items-center px-4 h-14 w-full bg-slate-50 rounded-xl md:bg-transparent">
                        <MapPin className="text-slate-400 w-5 h-5 mr-3" />
                        <input
                           type="text"
                           value={locationQuery}
                           onChange={(e) => {
                              setLocationQuery(e.target.value);
                              setShowLocationSuggestions(true);
                           }}
                           onFocus={() => setShowLocationSuggestions(true)}
                           onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                           placeholder="Location"
                           className="bg-transparent w-full focus:outline-none text-slate-900 placeholder-slate-400 font-medium text-center"
                        />
                        <button
                           onClick={handleAutoDetectLocation}
                           disabled={isLocating}
                           className={`p-2 rounded-lg hover:bg-slate-100 transition-all ${isLocating ? 'animate-pulse text-indigo-600' : 'text-slate-400'}`}
                           title="Use current location"
                        >
                           <Navigation size={18} className={isLocating ? 'animate-spin' : ''} />
                        </button>
                     </div>
                     {/* Location Suggestions Dropdown */}
                     {showLocationSuggestions && locationQuery && filteredLocations.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-30">
                           {filteredLocations.map((location) => (
                              <div
                                 key={location}
                                 onClick={() => handleLocationSelect(location)}
                                 className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-slate-700 font-medium flex items-center gap-2"
                              >
                                 <MapPin size={14} className="text-slate-400" />
                                 {location}
                              </div>
                           ))}
                        </div>
                     )}
                  </div>

                  <button
                     onClick={handleSearch}
                     disabled={isSearching}
                     className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-14 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 w-full md:w-auto flex items-center justify-center gap-2 mt-2 md:mt-0 disabled:opacity-70"
                  >
                     {isSearching ? 'Searching...' : 'Search'}
                  </button>
               </div>

               <div className="mt-8 flex items-center gap-6 text-sm font-medium text-slate-300">
                  <div className="flex items-center gap-2">
                     <Shield className="w-4 h-4 text-emerald-400" /> Verified Pros
                  </div>
                  <div className="flex items-center gap-2">
                     <Zap className="w-4 h-4 text-amber-400" /> Instant Booking
                  </div>
                  <div className="flex items-center gap-2">
                     <Clock className="w-4 h-4 text-blue-400" /> Same-day Service
                  </div>
               </div>
            </div>
         </div>

         {/* Categories */}
         <ChromaGrid>
            <div>
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-slate-900">Explore Categories</h2>
               </div>
               <AnimatedList
                  items={categories.map((cat, index) => ({
                     id: cat.name,
                     content: (
                        <div
                           onClick={() => performSearch(cat.name, '')}
                           className="group bg-white p-6 rounded-3xl border border-slate-100 text-center hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                        >
                           <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${cat.color} group-hover:scale-110 transition-transform duration-300`}>
                              {cat.icon}
                           </div>
                           <h3 className="font-semibold text-slate-700 group-hover:text-slate-900">{cat.name}</h3>
                        </div>
                     )
                  }))}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6"
                  delay={80}
               />
            </div>
         </ChromaGrid>

         {/* My Bookings / Conversations */}
         <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 mt-12">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-900">My Bookings & Conversations</h2>
                  {unreadCount > 0 && <span className="inline-flex h-3 w-3 rounded-full bg-red-500 shadow-sm"></span>}
               </div>
               <button
                  onClick={markConversationsSeen}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
               >
                  Mark as read
               </button>
            </div>

            {conversations.length > 0 ? (
               <div className="space-y-4">
                  {conversations.map((conv) => {
                     const lastSeen = parseInt(localStorage.getItem('conversationLastSeen') || '0', 10);
                     const timestamp = conv.approved_at || conv.created_at;
                     const isNew = timestamp && Date.parse(timestamp) > lastSeen;
                     return (
                        <div
                           key={conv.id}
                           className="flex flex-col gap-3 p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-sm transition-all"
                        >
                           <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                 <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-900 text-lg line-clamp-1">
                                       {conv.provider_name || 'Provider'}
                                    </h3>
                                    {conv.status === 'pending' && (
                                       <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider border border-amber-100">Pending Review</span>
                                    )}
                                 </div>
                                 <div className="mt-2 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Task:</span>
                                       <p className="text-slate-700 text-sm font-medium line-clamp-1">{conv.task_description || 'General Service'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Budget:</span>
                                       <p className="text-indigo-600 text-sm font-bold">MWK {conv.estimated_budget || 'TBD'}</p>
                                    </div>
                                    {conv.message && (
                                       <p className="text-slate-500 text-xs mt-1 italic line-clamp-1">"{conv.message}"</p>
                                    )}
                                 </div>
                              </div>
                              <div className="text-right text-[10px] text-slate-400 font-medium whitespace-nowrap pt-1">
                                 {timestamp ? new Date(timestamp).toLocaleDateString() : ''}
                              </div>
                           </div>
                           <div className="flex gap-2">
                              <button
                                 onClick={() => openConversation(conv)}
                                 className="flex-1 py-2.5 rounded-xl bg-slate-50 text-indigo-600 font-bold text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors border border-transparent hover:border-indigo-100"
                              >
                                 View Conversation
                              </button>
                              <button
                                 onClick={() => deleteConversation(conv.id)}
                                 className="px-4 py-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                              >
                                 <Trash2 size={18} />
                              </button>
                           </div>
                        </div>
                     );
                  })}
               </div>
            ) : (
               <div className="text-center py-10 text-slate-500">
                  <p>No conversations yet. Contact a provider to start chatting.</p>
               </div>
            )}
         </div>

         {/* Search Results Modal */}
         {showResultsModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
                  {/* Modal Header */}
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white z-10">
                     <div>
                        <h2 className="text-2xl font-bold text-slate-900">Search Results</h2>
                        <p className="text-slate-500 text-sm mt-1">
                           Found {searchResults.length} provider{searchResults.length !== 1 && 's'} for "{searchQuery}" in "{locationQuery}"
                        </p>
                     </div>
                     <button
                        onClick={() => setShowResultsModal(false)}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                     >
                        <X size={24} />
                     </button>
                  </div>

                  {/* Modal Body */}
                  <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                     {searchResults.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                           {searchResults.map((provider) => (
                              <div key={provider.id} className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                                 <div className="relative h-48 overflow-hidden bg-slate-100 flex items-center justify-center">
                                    {provider.photo_url ? (
                                       <img src={provider.photo_url} alt={provider.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                       <div className="text-slate-300 flex flex-col items-center">
                                          <User size={48} />
                                          <span className="text-xs font-medium mt-2">No Image</span>
                                       </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>

                                    <button className="absolute top-3 right-3 p-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white hover:text-indigo-500 transition-all">
                                       <Heart className="w-4 h-4" />
                                    </button>

                                    <div className="absolute bottom-3 left-3 text-white">
                                       <div className="font-bold text-lg">Contact for Price</div>
                                    </div>
                                 </div>

                                 <div className="p-5">
                                    <div className="flex items-center gap-1 text-amber-500 text-xs font-bold mb-2">
                                       <Star className="w-3 h-3 fill-current" /> {provider.rating ? provider.rating.toFixed(1) : 'New'}
                                       {provider.jobs_done > 0 && <span className="text-slate-400 font-normal ml-1">({provider.jobs_done} jobs completed)</span>}
                                       {!provider.jobs_done && <span className="text-slate-400 font-normal ml-1">(0 reviews)</span>}
                                    </div>
                                    <h3 className="font-bold text-base text-slate-900 mb-1 line-clamp-1">{provider.service || 'Service Provider'}</h3>
                                    <p className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
                                       <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">🏢</span>
                                       {provider.name}
                                    </p>
                                    <button
                                       onClick={() => navigate(`provider/${provider.id}`)}
                                       className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 hover:shadow-lg transition-all active:scale-[0.98]"
                                    >
                                       View Profile
                                    </button>
                                 </div>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                           <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100 text-slate-300">
                              <Search size={32} />
                           </div>
                           <h3 className="text-xl font-bold text-slate-900 mb-2">No providers found</h3>
                           <p className="text-slate-500 max-w-xs mx-auto mb-8">
                              We couldn't find any providers matching your criteria in this area.
                           </p>
                           <button
                              onClick={() => setShowResultsModal(false)}
                              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-white hover:border-slate-300 transition-colors"
                           >
                              Adjust Search
                           </button>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         )}

         {/* Chat Modal */}
         {showChatModal && selectedConversation && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
               <div className="bg-[#efe7dd] rounded-none md:rounded-2xl w-full h-full md:max-w-md md:h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">

                  {/* WhatsApp Header */}
                  <div className="bg-indigo-600 px-4 py-3 flex items-center gap-3 shadow-md z-10 text-white shrink-0">
                     <button
                        onClick={() => setShowChatModal(false)}
                        className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors"
                     >
                        <ArrowRight className="w-6 h-6 rotate-180" />
                     </button>

                     <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border border-white/30">
                        <User className="w-6 h-6 text-white" />
                     </div>

                     <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/provider/${selectedConversation.provider_id}`)}>
                        <h3 className="font-bold text-lg leading-none truncate">
                           {selectedConversation.provider_name || 'Provider'}
                        </h3>
                        <p className="text-xs text-indigo-100 mt-0.5 truncate opacity-90">
                           {selectedConversation.service || 'Service Provider'}
                        </p>
                     </div>


                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#f0f2f5] relative">
                     <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-[length:400px_400px]"></div>

                     {messages.length > 0 ? (
                        messages.map((msg, idx) => {
                           const isSystem = msg.sender_role === 'SYSTEM';
                           const isClient = !isSystem && (msg.sender_role === 'CLIENT' || msg.sender_id === parseInt(localStorage.getItem('userId') || '0'));

                           if (isSystem) {
                              return (
                                 <div key={idx} className="flex justify-center my-4 relative z-10">
                                    <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2 rounded-xl text-xs font-medium max-w-[90%] text-center shadow-sm">
                                       <div className="flex items-center justify-center gap-1.5 mb-1 text-amber-600">
                                          <Shield size={14} />
                                          <span className="font-bold uppercase tracking-wider">Official KIND Notification</span>
                                       </div>
                                       {msg.message}
                                    </div>
                                 </div>
                              );
                           }

                           return (
                              <div
                                 key={idx}
                                 className={`flex w-full ${isClient ? 'justify-end' : 'justify-start'} relative z-10`}
                              >
                                 <div
                                    className={`
                                       max-w-[85%] px-3 py-2 rounded-lg shadow-sm text-[15px] leading-relaxed relative break-words
                                       ${isClient ? 'bg-indigo-100 text-slate-900 rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none'}
                                    `}
                                 >
                                    <p>{msg.message}</p>
                                    <span className={`text-[10px] block text-right mt-1 ${isClient ? 'text-indigo-800/60' : 'text-slate-400'}`}>
                                       {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                       {isClient && <span className="ml-1 inline-block">✓✓</span>}
                                    </span>
                                 </div>
                              </div>
                           );
                        })
                     ) : (
                        <div className="flex flex-col items-center justify-center py-10 opacity-60">
                           <div className="bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg shadow-sm text-xs text-slate-800 text-center max-w-xs">
                              👋 Start the conversation with {selectedConversation.provider_name}
                           </div>
                        </div>
                     )}
                  </div>

                  {/* Input Area */}
                  <div className="p-2 bg-[#f8fafc] flex items-end gap-2 shrink-0 pb-safe border-t border-slate-200">
                     <div className="flex-1 bg-white rounded-2xl flex items-center px-4 py-2 shadow-sm border border-slate-100 min-h-[50px]">
                        <input
                           type="text"
                           value={newMessage}
                           onChange={(e) => setNewMessage(e.target.value)}
                           placeholder="Message..."
                           className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-slate-900 placeholder-slate-400 text-base"
                           onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        />
                     </div>
                     <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className={`p-3 rounded-full shadow-md transition-all transform active:scale-95 mb-0.5 flex items-center justify-center ${newMessage.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-400'}`}
                     >
                        <Send size={20} className={newMessage.trim() ? 'ml-0.5' : ''} />
                     </button>
                  </div>
               </div>
            </div>
         )}


         {/* How It Works */}
         <div>
            <div className="text-center mb-12">
               <h2 className="text-3xl font-bold text-slate-900 mb-3">Get Help in 4 Easy Steps</h2>
               <p className="text-slate-500 text-lg">Find trusted professionals quickly and easily.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center hover:shadow-lg transition-all">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-100 flex items-center justify-center text-4xl">
                     🔍
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">Search for a Service</h3>
                  <p className="text-slate-500 text-sm">Enter what you need and where...</p>
               </div>
               <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center hover:shadow-lg transition-all">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-100 flex items-center justify-center text-4xl">
                     💬
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">Chat & Book</h3>
                  <p className="text-slate-500 text-sm">Connect with providers, discuss your needs...</p>
               </div>
               <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center hover:shadow-lg transition-all">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-100 flex items-center justify-center text-4xl">
                     🛠️
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">Get the Job Done</h3>
                  <p className="text-slate-500 text-sm">Professionals arrive on time...</p>
               </div>
               <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center hover:shadow-lg transition-all bg-slate-50">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-100 flex items-center justify-center text-4xl">
                     ✅
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">Leave a Review</h3>
                  <p className="text-slate-500 text-sm">Help others find great service pros by sharing your experience.</p>
               </div>
            </div>
         </div>

         {/* Register as Provider CTA */}
         <div className="relative rounded-[2.5rem] p-12 md:p-16 overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700">
            <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[20rem] h-[20rem] bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

            <div className="relative z-10 text-center text-white max-w-3xl mx-auto">
               <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-sm font-bold mb-6 text-indigo-100">
                  For Professionals
               </div>
               <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                  Become a <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-emerald-200">KIND Provider</span>
               </h2>
               <p className="text-indigo-100 text-lg md:text-xl mb-10 leading-relaxed opacity-90 max-w-2xl mx-auto">
                  Join our platform and connect with clients who need your expertise. Manage your schedule, grow your business, and earn more.
               </p>
               <div className="flex justify-center">
                  <a
                     href="#/register"
                     className="bg-gradient-to-r from-purple-600 to-violet-600 text-white px-10 py-5 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-violet-700 transition-all shadow-2xl shadow-purple-900/30 hover:scale-105 active:scale-95"
                  >
                     Register as Provider
                  </a>
               </div>

               {/* Benefits */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl">
                     <div className="text-4xl mb-3">💰</div>
                     <h3 className="font-bold text-lg mb-2">Earn More</h3>
                     <p className="text-indigo-100 text-sm opacity-80">Set your own rates and keep more of what you earn</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl">
                     <div className="text-4xl mb-3">📅</div>
                     <h3 className="font-bold text-lg mb-2">Flexible Schedule</h3>
                     <p className="text-indigo-100 text-sm opacity-80">Work when you want, manage your own calendar</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl">
                     <div className="text-4xl mb-3">⭐</div>
                     <h3 className="font-bold text-lg mb-2">Build Reputation</h3>
                     <p className="text-indigo-100 text-sm opacity-80">Get reviews and grow your professional profile</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};
