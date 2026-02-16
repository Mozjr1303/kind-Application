import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Star, MapPin, Clock, ChevronRight, ChevronLeft, CheckCircle, Briefcase, Camera, X, Upload, AlertCircle, MessageCircle, Send, Smile, Phone, MoreVertical, ArrowRight, User, FileText, Shield, Navigation } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';

const serviceCategories = [
   'Plumbing',
   'Electrician',
   'Carpentry',
   'Painting',
   'Cleaning',
   'AC Repair'
];

const lilongweAreas = [
   'Area 3', 'Area 6', 'Area 9', 'Area 10', 'Area 11', 'Area 12',
   'Area 15', 'Area 18', 'Area 25', 'Area 43', 'Area 47', 'Area 49',
   'City Centre', 'Kanengo', 'Old Town', 'Falls (Area 1)',
   'Likuni', 'Lumbadzi', 'Chigwirizano'
];

const mockJobs = [
   { id: 1, title: 'House Plumbing', client: 'Moses Aaron Makunganga', time: 'Today, 2:00 PM', location: 'Blantyre', price: '45,000', status: 'confirmed' },
];

interface ProviderDashboardProps {
   providerName?: string;
}

export const ProviderDashboard: React.FC<ProviderDashboardProps> = ({ providerName = 'Professional' }) => {
   // State for onboarding/setup status
   const [isSetupComplete, setIsSetupComplete] = useState(() => {
      return localStorage.getItem('providerSetupComplete') === 'true';
   });

   // State for service and location
   const [selectedService, setSelectedService] = useState(() => {
      return localStorage.getItem('providerService') || '';
   });
   const [selectedLocation, setSelectedLocation] = useState(() => {
      return localStorage.getItem('providerLocation') || '';
   });

   // State for stats and data
   const [stats, setStats] = useState({
      earnings: 0,
      jobsCompleted: 0,
      rating: 0,
      ratingCount: 0
   });

   const [jobs, setJobs] = useState<any[]>(mockJobs); // Initialize with mock jobs
   const [reviews] = useState<any[]>([]); // Empty for new providers

   // Profile Update State
   const [showProfileModal, setShowProfileModal] = useState(false);
   const [displayName, setDisplayName] = useState(providerName);
   const [onboardingStep, setOnboardingStep] = useState(1);
   const [profileForm, setProfileForm] = useState({
      name: providerName,
      bio: '',
      hourlyRate: '',
      service: selectedService,
      location: selectedLocation,
      motivation: '',
      qualifications: '',
      photo_url: '',
      certificates_url: ''
   });
   const [isSaving, setIsSaving] = useState(false);
   const [contactRequests, setContactRequests] = useState<any[]>([]);
   const [loadingRequests, setLoadingRequests] = useState(false);

   // Chat State
   const [showChatModal, setShowChatModal] = useState(false);
   const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
   const [messages, setMessages] = useState<any[]>([]);
   const [newMessage, setNewMessage] = useState('');

   // Calendar State
   const [showCalendarModal, setShowCalendarModal] = useState(false);
   const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
   const [isLocating, setIsLocating] = useState(false);

   const handleDetectLocation = () => {
      if (!navigator.geolocation) {
         alert("Geolocation not supported");
         return;
      }
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
         (position) => {
            const { latitude, longitude } = position.coords;
            // Basic Lilongwe bounds check
            if (latitude < -13 && latitude > -15 && longitude > 33 && longitude < 35) {
               setProfileForm(prev => ({ ...prev, location: 'City Centre' }));
               alert("Detected Lilongwe! Setting area to 'City Centre'.");
            } else {
               alert("You seem to be outside Lilongwe. Please select your area manually.");
            }
            setIsLocating(false);
         },
         () => {
            setIsLocating(false);
            alert("Could not detect location. Please select manually.");
         }
      );
   };

   const openConversation = async (req: any) => {
      setSelectedRequest(req);
      setShowChatModal(true);

      // Initial message from the contact request (Client sent this)
      const initialMessage = {
         id: `initial-${req.id}`,
         sender_role: 'CLIENT',
         sender_id: req.client_id, // This should be in the request object
         name: req.client_name,
         message: req.message,
         created_at: req.created_at || req.approved_at
      };

      try {
         const res = await fetch(`http://localhost:4000/api/messages/${req.id}`);
         if (res.ok) {
            const data = await res.json();
            const fetchedMessages = Array.isArray(data) ? data : [];

            // If the API doesn't return the initial contact message, prepend it
            const hasInitial = fetchedMessages.some((m: any) => m.message === req.message && m.sender_role === 'CLIENT');

            if (!hasInitial && req.message) {
               setMessages([initialMessage, ...fetchedMessages]);
            } else {
               setMessages(fetchedMessages);
            }
         } else {
            if (req.message) {
               setMessages([initialMessage]);
            } else {
               setMessages([]);
            }
         }
      } catch (e) {
         console.error('Failed to load messages', e);
         if (req.message) {
            setMessages([initialMessage]);
         } else {
            setMessages([]);
         }
      }
   };

   const sendMessage = async () => {
      if (!newMessage.trim() || !selectedRequest) return;

      const userId = localStorage.getItem('userId');
      const userName = localStorage.getItem('userName'); // or displayName
      if (!userId) return;

      try {
         const res = await fetch('http://localhost:4000/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               contact_request_id: selectedRequest.id,
               sender_id: parseInt(userId),
               sender_name: userName || displayName,
               sender_role: 'PROVIDER',
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

   const [status, setStatus] = useState<string>(() => {
      return localStorage.getItem('userStatus') || 'active';
   });

   // Sync displayName with prop if it changes (and we haven't locally modified it yet)
   useEffect(() => {
      setDisplayName(providerName);
      setProfileForm(prev => ({ ...prev, name: providerName }));
   }, [providerName]);

   // Sync service/location with local storage on mount
   useEffect(() => {
      setProfileForm(prev => ({
         ...prev,
         service: selectedService,
         location: selectedLocation
      }));
   }, [selectedService, selectedLocation]);

   // Fetch user ID and Status from DB
   useEffect(() => {
      const fetchUserData = async () => {
         const token = localStorage.getItem('token');
         if (token) {
            try {
               const res = await fetch('http://localhost:4000/api/me', {
                  headers: { Authorization: `Bearer ${token}` }
               });
               if (res.ok) {
                  const data = await res.json();
                  if (data.user) {
                     if (data.user.id) localStorage.setItem('userId', data.user.id);
                     if (data.user.status) setStatus(data.user.status);

                     // Check if service and location are set in DB
                     if (data.user.service && data.user.location) {
                        setIsSetupComplete(true);
                        setSelectedService(data.user.service);
                        setSelectedLocation(data.user.location);

                        // Update stats from DB
                        setStats({
                           earnings: 0, // Still mock for now as we don't have earnings table
                           jobsCompleted: data.user.jobs_done || 0,
                           rating: data.user.rating || 0,
                           ratingCount: data.user.jobs_done > 0 ? 1 : 0 // Mock count
                        });

                        // Sync profile form
                        setProfileForm({
                           name: data.user.name,
                           bio: data.user.motivation || '', // Map bio to motivation
                           hourlyRate: '',
                           service: data.user.service,
                           location: data.user.location,
                           motivation: data.user.motivation || '',
                           qualifications: data.user.qualifications || '',
                           photo_url: data.user.photo_url || '',
                           certificates_url: data.user.certificates_url || ''
                        });

                        // Sync local storage
                        localStorage.setItem('providerSetupComplete', 'true');
                        localStorage.setItem('providerService', data.user.service);
                        localStorage.setItem('providerLocation', data.user.location);
                     } else {
                        // If missing in DB, force setup
                        setIsSetupComplete(false);
                     }
                  }
               }
            } catch (e) {
               console.error('Failed to fetch user data', e);
            }
         }
      };

      fetchUserData();
   }, []);

   // Calculate Completion Percentage & Missing Tasks
   const [completionPercentage, setCompletionPercentage] = useState(0);
   const [missingTasks, setMissingTasks] = useState<string[]>([]);

   useEffect(() => {
      const tasks = [
         { id: 'name', label: 'Full Name', value: profileForm.name },
         { id: 'service', label: 'Service Category', value: profileForm.service },
         { id: 'location', label: 'Operating Location', value: profileForm.location },
         { id: 'motivation', label: 'Motivation Statement', value: profileForm.motivation },
         { id: 'qualifications', label: 'Experience & Certificates', value: profileForm.qualifications },
         { id: 'photo', label: 'Profile Photo', value: profileForm.photo_url },
         { id: 'docs', label: 'Professional PDF Documents', value: profileForm.certificates_url }
      ];

      const missing = tasks.filter(t => !t.value || (typeof t.value === 'string' && t.value.trim() === '')).map(t => t.label);
      const filledCount = tasks.length - missing.length;

      setMissingTasks(missing);
      setCompletionPercentage(Math.round((filledCount / tasks.length) * 100));
   }, [profileForm]);



   // Fetch contact requests AND merge into jobs
   const fetchContactRequests = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      setLoadingRequests(true);
      try {
         const res = await fetch(`http://localhost:4000/api/contact-requests/provider/${userId}`);
         if (res.ok) {
            const data = await res.json();
            const requests = Array.isArray(data) ? data : [];
            setContactRequests(requests);

            // Convert requests to job-like objects
            const requestJobs = requests.map((req: any) => ({
               id: `req-${req.id}`,
               originalRequest: req, // Keep original request for chat
               title: req.task_description || 'Service Request',
               client: req.client_name,
               time: new Date(req.approved_at).toLocaleDateString(),
               location: 'Local Client',
               price: req.estimated_budget || 'TBD',
               status: 'pending_chat', // Custom status
               isRequest: true
            }));

            // Merge with existing mock jobs (avoiding duplicates if multiple calls)
            // For this demo, we reset jobs to mock + fetched requests each time to avoid duplication
            setJobs([...mockJobs, ...requestJobs]);
         }
      } catch (e) {
         console.error('Failed to fetch contact requests', e);
      } finally {
         setLoadingRequests(false);
      }
   };

   useEffect(() => {
      if (isSetupComplete) {
         fetchContactRequests();
      }
   }, [isSetupComplete]);


   // ... (Rest of component functions)




   const handleServiceChange = (service: string) => {
      setSelectedService(service);
   };

   const handleLocationChange = (location: string) => {
      setSelectedLocation(location);
   };

   const handleOnboardingComplete = async () => {
      if (selectedService && selectedLocation) {
         setIsSaving(true);
         try {
            const userId = localStorage.getItem('userId');
            if (userId) {
               const res = await fetch(`http://localhost:4000/api/users/${userId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                     name: profileForm.name,
                     service: selectedService,
                     location: selectedLocation,
                     motivation: profileForm.motivation,
                     qualifications: profileForm.qualifications,
                     photo_url: profileForm.photo_url,
                     certificates_url: profileForm.certificates_url
                  })
               });

               if (!res.ok) throw new Error('Failed to sync data');

               localStorage.setItem('providerSetupComplete', 'true');
               localStorage.setItem('providerService', selectedService);
               localStorage.setItem('providerLocation', selectedLocation);
               localStorage.setItem('userName', profileForm.name);
               setIsSetupComplete(true);
            }
         } catch (e) {
            console.error('Failed to sync onboarding data', e);
            alert('Something went wrong. Please try again.');
         } finally {
            setIsSaving(false);
         }
      }
   };

   const handleProfileUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);

      try {
         const userId = localStorage.getItem('userId');
         if (!userId) throw new Error('User ID not found');

         // 1. Update User Basic Info via API
         const res = await fetch(`http://localhost:4000/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               name: profileForm.name,
               service: profileForm.service,
               location: profileForm.location,
               motivation: profileForm.motivation,
               qualifications: profileForm.qualifications,
               photo_url: profileForm.photo_url,
               certificates_url: profileForm.certificates_url
            })
         });

         if (!res.ok) throw new Error('Failed to update profile');

         // 2. Update Local Storage & State
         localStorage.setItem('userName', profileForm.name);
         localStorage.setItem('providerService', profileForm.service);
         localStorage.setItem('providerLocation', profileForm.location);

         setDisplayName(profileForm.name);
         setSelectedService(profileForm.service);
         setSelectedLocation(profileForm.location);

         // Close Modal
         setShowProfileModal(false);
         alert('Profile updated successfully!');
      } catch (err) {
         console.error(err);
         alert('Error updating profile. Please try again.');
      } finally {
         setIsSaving(false);
      }
   };

   // ----------------------------------------------------------------------
   // VIEW 1: SETUP SCREEN (Multi-step Onboarding)
   // ----------------------------------------------------------------------
   if (!isSetupComplete) {
      return (
         <div className="min-h-screen flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 md:p-12 max-w-2xl w-full shadow-2xl border border-slate-100 dark:border-slate-700 relative overflow-hidden">
               {/* Progress indicator */}
               <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 dark:bg-slate-700">
                  <div
                     className="h-full bg-indigo-600 transition-all duration-500"
                     style={{ width: `${(onboardingStep / 3) * 100}%` }}
                  ></div>
               </div>

               <div className="mb-10 flex items-center justify-between">
                  <div>
                     <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
                        {onboardingStep === 1 && "Basic Information"}
                        {onboardingStep === 2 && "Professional Profile"}
                        {onboardingStep === 3 && "Identity Verification"}
                     </h2>
                     <p className="text-slate-500 dark:text-slate-400 font-medium">Step {onboardingStep} of 3</p>
                  </div>
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-3xl">
                     {onboardingStep === 1 && "👤"}
                     {onboardingStep === 2 && "🌟"}
                     {onboardingStep === 3 && "🛡️"}
                  </div>
               </div>

               {onboardingStep === 1 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Display Name</label>
                        <input
                           type="text"
                           value={profileForm.name}
                           onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                           placeholder="Full Name"
                           className="w-full px-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                           <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Service Category</label>
                           <div className="relative">
                              <select
                                 value={selectedService}
                                 onChange={(e) => handleServiceChange(e.target.value)}
                                 className="w-full px-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-purple-600 dark:text-purple-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none font-bold"
                              >
                                 <option value="">Select service...</option>
                                 {serviceCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400" size={18} />
                           </div>
                        </div>
                        <div>
                           <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Working Location</label>
                           <div className="relative">
                              <select
                                 value={selectedLocation}
                                 onChange={(e) => handleLocationChange(e.target.value)}
                                 className="w-full px-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-purple-600 dark:text-purple-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none font-bold"
                              >
                                 <option value="">Select location...</option>
                                 <option value="Blantyre">Blantyre</option>
                                 <option value="Lilongwe">Lilongwe</option>
                                 <option value="Mzuzu">Mzuzu</option>
                              </select>
                              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400" size={18} />
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {onboardingStep === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                     <div className="flex items-center gap-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                        <input type="file" id="onboarding-photo" accept="image/*" className="hidden" onChange={() => setProfileForm({ ...profileForm, photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop' })} />
                        <label htmlFor="onboarding-photo" className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center cursor-pointer hover:bg-slate-300 transition-colors overflow-hidden shrink-0">
                           {profileForm.photo_url ? <img src={profileForm.photo_url} className="w-full h-full object-cover" /> : <Camera className="text-slate-500" size={30} />}
                        </label>
                        <div>
                           <p className="font-bold text-slate-900 dark:text-white">Profile Photo</p>
                           <p className="text-xs text-slate-500">Clients prefer seeing who they hire.</p>
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Motivation Statement</label>
                        <textarea
                           rows={3}
                           value={profileForm.motivation}
                           onChange={e => setProfileForm({ ...profileForm, motivation: e.target.value })}
                           placeholder="Why should clients choose you?"
                           className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        ></textarea>
                     </div>

                     <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Qualifications</label>
                        <textarea
                           rows={3}
                           value={profileForm.qualifications}
                           onChange={e => setProfileForm({ ...profileForm, qualifications: e.target.value })}
                           placeholder="List your experience and certifications..."
                           className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        ></textarea>
                     </div>
                  </div>
               )}

               {onboardingStep === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                     <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/10">
                        <div className="flex items-start gap-4 mb-4">
                           <AlertCircle className="text-indigo-600 mt-1 shrink-0" size={24} />
                           <div>
                              <h4 className="font-bold text-slate-900 dark:text-white">Professional Documents</h4>
                              <p className="text-sm text-slate-500 dark:text-slate-400">Please upload your ID or professional certificates in PDF format for account verification.</p>
                           </div>
                        </div>

                        {profileForm.certificates_url ? (
                           <div className="p-4 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-between shadow-sm">
                              <div className="flex items-center gap-3">
                                 <FileText className="text-emerald-500" />
                                 <span className="text-sm font-bold text-slate-700 dark:text-white">document_ready.pdf</span>
                              </div>
                              <CheckCircle className="text-emerald-500" size={20} />
                           </div>
                        ) : (
                           <label className="block border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 rounded-xl p-8 text-center cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-all">
                              <input type="file" accept=".pdf" className="hidden" onChange={() => setProfileForm({ ...profileForm, certificates_url: 'mock_pdf' })} />
                              <Upload className="mx-auto text-indigo-400 mb-2" size={30} />
                              <p className="text-indigo-600 font-bold mb-1">Click to Upload PDF</p>
                              <p className="text-xs text-slate-400">Maximum size: 5MB</p>
                           </label>
                        )}
                     </div>
                  </div>
               )}

               <div className="flex gap-4 mt-12">
                  {onboardingStep > 1 && (
                     <button
                        onClick={() => setOnboardingStep(s => s - 1)}
                        className="px-8 py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white font-bold rounded-2xl hover:bg-slate-200 transition-all"
                     >
                        Back
                     </button>
                  )}
                  <button
                     onClick={() => onboardingStep < 3 ? setOnboardingStep(s => s + 1) : handleOnboardingComplete()}
                     disabled={(onboardingStep === 1 && (!selectedService || !selectedLocation || !profileForm.name)) || isSaving}
                     className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                     {isSaving ? (
                        <>
                           <Clock className="animate-spin" size={20} />
                           Saving Profile...
                        </>
                     ) : (
                        onboardingStep === 3 ? "Complete Registration" : "Continue"
                     )}
                     {onboardingStep < 3 && !isSaving && <ArrowRight size={20} />}
                  </button>
               </div>
            </div>
         </div>
      );
   }


   // ----------------------------------------------------------------------
   // VIEW 1.5: STATUS CHECKS (After setup is complete)
   // ----------------------------------------------------------------------
   if (status === 'pending') {
      return (
         <div className="min-h-[80vh] flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 md:p-12 max-w-lg w-full shadow-xl border border-slate-100 dark:border-slate-700 text-center">
               <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-100">
                  <Clock className="text-amber-600" size={40} />
               </div>
               <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Awaiting Approval</h2>
               <p className="text-slate-500 dark:text-slate-400 text-lg mb-6">
                  Your provider account is currently under review by our administrators. You will be notified once your account is approved.
               </p>
               <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/40 text-amber-800 dark:text-amber-400 text-sm">
                  <strong>Note:</strong> You cannot accept jobs or appear in search results until approved.
               </div>
            </div>
         </div>
      );
   }

   if (status === 'rejected') {
      return (
         <div className="min-h-[80vh] flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 md:p-12 max-w-lg w-full shadow-xl border border-slate-100 dark:border-slate-700 text-center">
               <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-100">
                  <AlertCircle className="text-red-600" size={40} />
               </div>
               <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Account Rejected</h2>
               <p className="text-slate-500 dark:text-slate-400 text-lg mb-6">
                  Your provider account application has been rejected by our administrators.
               </p>
               <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-800 text-sm">
                  Please contact support for more information.
               </div>
            </div>
         </div>
      );
   }

   // ----------------------------------------------------------------------
   // VIEW 2: MAIN DASHBOARD (For existing providers)
   // ----------------------------------------------------------------------
   return (
      <div className="space-y-12 pb-20">
         {/* Hero Header */}
         <div className="relative rounded-[2.5rem] overflow-hidden bg-slate-900 text-white shadow-2xl shadow-slate-200 dark:shadow-none">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581578731117-104f2a863a30?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 via-slate-900/80 to-transparent"></div>

            <div className="relative z-10 p-8 md:p-12">
               <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-medium text-indigo-300 mb-4">
                        <span className="relative flex h-2 w-2">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        Active Provider
                     </div>
                     <h1 className="text-3xl md:text-5xl font-bold mb-2">
                        Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-300">{displayName}!</span>
                     </h1>
                     <p className="text-indigo-100 text-lg">Here's what's happening with your business today.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-6 w-full md:w-auto items-start sm:items-center">
                     {/* Service Badge */}
                     <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 min-w-[160px]">
                        <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Service</p>
                        <div className="flex items-center gap-2 text-white font-bold text-lg">
                           <Briefcase size={20} className="text-indigo-400" />
                           {selectedService || 'General'}
                        </div>
                        <p className="text-white/60 text-xs mt-1">{selectedLocation}</p>
                     </div>

                     {/* Earnings */}
                     <div className="text-left sm:text-right">
                        <p className="text-indigo-100 text-sm font-medium mb-1">Earnings (Oct)</p>
                        <p className="text-3xl font-bold">MWK {stats.earnings.toLocaleString()}</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Stats Row */}
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard
               title="Jobs Completed"
               value={stats.jobsCompleted.toString()}
               icon={CheckCircle}
               colorClass="text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400"
            />
            <StatCard
               title="Total Earnings"
               value={`MWK ${stats.earnings.toLocaleString()}`}
               trend={stats.earnings > 0 ? "8% vs last mo" : "No earnings yet"}
               trendUp={stats.earnings > 0}
               icon={(props: { size?: number }) => (
                  <span className="font-black leading-none flex items-center justify-center" style={{ fontSize: props.size ? props.size - 4 : 20 }}>MK</span>
               )}
               colorClass="text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400"
            />
            <StatCard
               title="Client Rating"
               value={stats.rating > 0 ? stats.rating.toString() : "New"}
               icon={Star}
               colorClass="text-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
            />
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Completion Status */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Profile Completion</h3>
                  <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                     {completionPercentage}% Complete
                  </span>
               </div>

               <div className="relative h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-6">
                  <div
                     style={{ width: `${completionPercentage}%` }}
                     className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                  ></div>
               </div>

               <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  Maximize your visibility! Complete the following to stand out:
               </p>

               {missingTasks.length > 0 && (
                  <div className="space-y-3 mb-8">
                     {missingTasks.slice(0, 3).map((task, i) => (
                        <div key={i} className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                           <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-700 flex-shrink-0"></div>
                           <span className="text-sm font-medium">{task}</span>
                        </div>
                     ))}
                     {missingTasks.length > 3 && (
                        <p className="text-xs text-indigo-500 font-bold pl-8">+{missingTasks.length - 3} more items</p>
                     )}
                  </div>
               )}

               <button
                  onClick={() => setShowProfileModal(true)}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all transform active:scale-[0.98]"
               >
                  {missingTasks.length > 0 ? 'Complete My Profile' : 'Update Profile'}
               </button>
            </div>

            {/* Side Panel (Profile/Notifications) */}
            <div className="space-y-6">
               <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Completion Status</h3>
                  <div className="relative pt-1">
                     <div className="flex mb-2 items-center justify-between">
                        <div>
                           <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-100">
                              Profile
                           </span>
                        </div>
                        <div className="text-right">
                           <span className="text-xs font-semibold inline-block text-indigo-600">
                              {completionPercentage}%
                           </span>
                        </div>
                     </div>
                     <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-100 dark:bg-slate-700">
                        <div style={{ width: `${completionPercentage}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-500"></div>
                     </div>
                     <p className="text-xs text-slate-500 dark:text-slate-400">Complete your bio and add portfolio photos to increase visibility.</p>
                     <button
                        onClick={() => setShowProfileModal(true)}
                        className="mt-4 w-full py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                     >
                        Update Profile
                     </button>
                  </div>
               </div>

               <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Recent Reviews</h3>
                  <div className="space-y-4">
                     {reviews.length > 0 ? (
                        reviews.map((review, i) => (
                           <div key={i} className="pb-4 border-b border-slate-50 dark:border-slate-800 last:border-0 last:pb-0">
                              <div className="flex items-center gap-1 text-amber-400 mb-1">
                                 {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-slate-200 dark:text-slate-700"} />
                                 ))}
                              </div>
                              <p className="text-sm text-slate-600 italic">"{review.text}"</p>
                              <p className="text-xs text-slate-400 mt-2">- {review.client}, {review.date}</p>
                           </div>
                        ))
                     ) : (
                        <div className="text-center py-6">
                           <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-300 dark:text-amber-500">
                              <Star size={20} />
                           </div>
                           <p className="text-slate-500 dark:text-slate-400 text-sm">No reviews yet</p>
                           <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Reviews will appear here after you complete jobs.</p>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>

         {/* Chat Modal */}
         {showChatModal && selectedRequest && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
               <div className="bg-[#efe7dd] rounded-none md:rounded-2xl w-full h-full md:max-w-md md:h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">

                  {/* WhatsApp Header - Provider Side */}
                  <div className="bg-indigo-600 px-4 py-3 flex items-center gap-3 shadow-md z-10 text-white shrink-0">
                     <button
                        onClick={() => setShowChatModal(false)}
                        className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors"
                     >
                        <ArrowRight className="w-6 h-6 rotate-180" />
                     </button>

                     <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border border-white/30">
                        <span className="font-bold text-lg">{selectedRequest.client_name?.charAt(0)}</span>
                     </div>

                     <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg leading-none truncate">
                           {selectedRequest.client_name || 'Client'}
                        </h3>
                        <p className="text-xs text-indigo-100 mt-0.5 truncate opacity-90">
                           Potential Client
                        </p>
                     </div>


                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#f0f2f5] relative">
                     <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-[length:400px_400px]"></div>

                     {messages.length > 0 ? (
                        messages.map((msg, idx) => {
                           const isSystem = msg.sender_role === 'SYSTEM';
                           const isMe = !isSystem && (msg.sender_role === 'PROVIDER' || msg.sender_id === parseInt(localStorage.getItem('userId') || '0'));

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
                                 className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} relative z-10`}
                              >
                                 <div
                                    className={`
                                       max-w-[85%] px-3 py-2 rounded-lg shadow-sm text-[15px] leading-relaxed relative break-words
                                       ${isMe ? 'bg-indigo-100 text-slate-900 rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none'}
                                    `}
                                 >
                                    <p>{msg.message}</p>
                                    <span className={`text-[10px] block text-right mt-1 ${isMe ? 'text-indigo-800/60' : 'text-slate-400'}`}>
                                       {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                       {isMe && <span className="ml-1 inline-block">✓✓</span>}
                                    </span>
                                 </div>
                              </div>
                           );
                        })
                     ) : (
                        <div className="flex flex-col items-center justify-center py-10 opacity-60">
                           <div className="bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg shadow-sm text-xs text-slate-800 text-center max-w-xs">
                              👋 Reply to {selectedRequest.client_name}
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

         {/* Profile Update Modal */}
         {showProfileModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
               <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-8">
                     <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Update Profile</h2>
                     <button
                        onClick={() => setShowProfileModal(false)}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                     >
                        <X size={24} />
                     </button>
                  </div>

                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                     {/* Profile Photo */}
                     <div className="flex items-center gap-6">
                        <div className="relative group">
                           <input
                              type="file"
                              id="photo-upload"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                 // For demo: pretend we uploaded and got a URL
                                 // In real app, this would be a FileReader or API call
                                 setProfileForm({ ...profileForm, photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop' });
                              }}
                           />
                           <label
                              htmlFor="photo-upload"
                              className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden relative group cursor-pointer hover:border-indigo-400 transition-all shadow-inner"
                           >
                              {profileForm.photo_url ? (
                                 <img src={profileForm.photo_url} alt="Profile" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              ) : (
                                 <Camera className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-500" size={32} />
                              )}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Upload className="text-white" size={20} />
                              </div>
                           </label>
                        </div>
                        <div>
                           <h3 className="font-bold text-slate-900 dark:text-white">Profile Photo</h3>
                           <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 font-medium">Click the circle to upload a professional photo.</p>
                           <label htmlFor="photo-upload" className="text-indigo-600 text-sm font-bold hover:underline cursor-pointer">Change Photo</label>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 gap-6">
                        <div>
                           <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
                           <input
                              type="text"
                              value={profileForm.name}
                              onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                           />
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Short Motivation Statement</label>
                        <textarea
                           rows={3}
                           value={profileForm.motivation}
                           onChange={e => setProfileForm({ ...profileForm, motivation: e.target.value })}
                           placeholder="Why should clients choose you?..."
                           className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        ></textarea>
                     </div>

                     <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Qualifications & Certificates</label>
                        <textarea
                           rows={3}
                           value={profileForm.qualifications}
                           onChange={e => setProfileForm({ ...profileForm, qualifications: e.target.value })}
                           placeholder="List your professional certifications, degrees, and work experience..."
                           className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        ></textarea>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                           <label className="block text-sm font-bold text-slate-700 mb-2">Service Category</label>
                           <select
                              value={profileForm.service}
                              onChange={e => setProfileForm({ ...profileForm, service: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                           >
                              {serviceCategories.map(cat => (
                                 <option key={cat} value={cat}>{cat}</option>
                              ))}
                           </select>
                        </div>
                        <div>
                           <div className="flex gap-2">
                              <select
                                 value={profileForm.location}
                                 onChange={e => setProfileForm({ ...profileForm, location: e.target.value })}
                                 className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                 <option value="">Select Area</option>
                                 {lilongweAreas.map(area => (
                                    <option key={area} value={area}>{area}</option>
                                 ))}
                              </select>
                              <button
                                 type="button"
                                 onClick={handleDetectLocation}
                                 disabled={isLocating}
                                 className={`p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors ${isLocating ? 'text-indigo-600 animate-pulse' : 'text-slate-400'}`}
                                 title="Detect current location"
                              >
                                 <Navigation size={20} className={isLocating ? 'animate-spin' : ''} />
                              </button>
                           </div>
                        </div>
                     </div>

                     {/* Document Upload */}
                     <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Professional Documents (PDF)</label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Upload your certificates, licenses, or ID in PDF format for verification.</p>

                        {profileForm.certificates_url ? (
                           <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-800 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <FileText size={20} />
                                 </div>
                                 <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Document Uploaded</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">verification_documents.pdf</p>
                                 </div>
                              </div>
                              <button
                                 type="button"
                                 onClick={() => setProfileForm({ ...profileForm, certificates_url: '' })}
                                 className="text-xs font-bold text-rose-500 hover:underline"
                              >
                                 Remove
                              </button>
                           </div>
                        ) : (
                           <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                              <input
                                 type="file"
                                 accept=".pdf"
                                 className="hidden"
                                 id="pdf-upload"
                                 onChange={() => setProfileForm({ ...profileForm, certificates_url: 'mock_pdf_url' })}
                              />
                              <label htmlFor="pdf-upload" className="cursor-pointer">
                                 <FileText className="mx-auto text-slate-400 mb-3 group-hover:text-indigo-500 transition-colors" size={40} />
                                 <p className="text-slate-700 dark:text-slate-200 font-bold mb-1">Click to upload PDF</p>
                                 <p className="text-slate-400 text-xs">Maximum size: 5MB • PDF Only</p>
                              </label>
                           </div>
                        )}
                     </div>

                     <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
                        <button
                           type="button"
                           onClick={() => setShowProfileModal(false)}
                           className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                           Cancel
                        </button>
                        <button
                           type="submit"
                           disabled={isSaving}
                           className="px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors disabled:opacity-50"
                        >
                           {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}
         {/* Calendar Modal */}
         {showCalendarModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
               <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-8">
                     <h2 className="text-2xl font-bold text-slate-900">Schedule</h2>
                     <button
                        onClick={() => setShowCalendarModal(false)}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                     >
                        <X size={24} />
                     </button>
                  </div>

                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-6">
                     <h3 className="text-xl font-bold text-slate-800">
                        {currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                     </h3>
                     <div className="flex items-center gap-2">
                        <button
                           onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1)))}
                           className="p-2 rounded-full hover:bg-slate-100 text-slate-600"
                        >
                           <ChevronLeft size={20} />
                        </button>
                        <button
                           onClick={() => setCurrentCalendarDate(new Date())}
                           className="text-sm font-medium text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-lg"
                        >
                           Today
                        </button>
                        <button
                           onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1)))}
                           className="p-2 rounded-full hover:bg-slate-100 text-slate-600"
                        >
                           <ChevronRight size={20} />
                        </button>
                     </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden border border-slate-200">
                     {/* Weekday Headers */}
                     {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="bg-slate-50 p-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                           {day}
                        </div>
                     ))}

                     {/* Days */}
                     {(() => {
                        const days = [];
                        const year = currentCalendarDate.getFullYear();
                        const month = currentCalendarDate.getMonth();

                        const firstDayOfMonth = new Date(year, month, 1).getDay();
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const daysInPrevMonth = new Date(year, month, 0).getDate();

                        // Previous month days
                        for (let i = 0; i < firstDayOfMonth; i++) {
                           const day = daysInPrevMonth - firstDayOfMonth + 1 + i;
                           days.push(
                              <div key={`prev-${day}`} className="bg-white p-2 min-h-[100px] bg-slate-50 text-slate-400 opacity-50">
                                 <span className="text-sm font-medium">{day}</span>
                              </div>
                           );
                        }

                        // Current month days
                        for (let day = 1; day <= daysInMonth; day++) {
                           const date = new Date(year, month, day);
                           const isToday = new Date().toDateString() === date.toDateString();

                           // Check for jobs on this day
                           const dayJobs = jobs.filter(job => {
                              // Very basic date matching for demo purposes
                              // In production, parse job.time properly
                              if (job.time.includes('Today') && isToday) return true;
                              // Approximate check for other dates
                              return false;
                           });

                           days.push(
                              <div key={`curr-${day}`} className={`bg-white p-2 min-h-[100px] hover:bg-slate-50 transition-colors ${isToday ? 'ring-1 ring-inset ring-indigo-500' : ''}`}>
                                 <div className="flex justify-between items-start">
                                    <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}>
                                       {day}
                                    </span>
                                 </div>
                                 <div className="mt-2 space-y-1">
                                    {dayJobs.map(job => (
                                       <div key={job.id} className="text-[10px] p-1 rounded bg-indigo-100 text-indigo-700 font-medium truncate">
                                          {job.title}
                                       </div>
                                    ))}
                                    {/* Mock indicator for demo density */}
                                    {day === 15 && <div className="text-[10px] p-1 rounded bg-emerald-100 text-emerald-700 font-medium truncate">Completed Job</div>}
                                 </div>
                              </div>
                           );
                        }

                        // Next month filler
                        const totalSlots = Math.ceil((days.length) / 7) * 7;
                        const remaining = totalSlots - days.length;
                        for (let i = 1; i <= remaining; i++) {
                           days.push(
                              <div key={`next-${i}`} className="bg-white p-2 min-h-[100px] bg-slate-50 text-slate-400 opacity-50">
                                 <span className="text-sm font-medium">{i}</span>
                              </div>
                           );
                        }

                        return days;
                     })()}
                  </div>
               </div>
            </div>
         )}

      </div>
   );
};

