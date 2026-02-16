import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, MapPin, Briefcase, Clock, Award, ArrowLeft, Phone, Mail, Calendar, CheckCircle, X, Send } from 'lucide-react';

interface Provider {
    id: number;
    name: string;
    email: string;
    service: string;
    location: string;
    created_at: string;
    motivation?: string;
    qualifications?: string;
    photo_url?: string;
    rating?: number;
    jobs_done?: number;
}

export const ProviderProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [provider, setProvider] = useState<Provider | null>(null);
    const [loading, setLoading] = useState(true);
    const [showContactModal, setShowContactModal] = useState(false);
    const [contactMessage, setContactMessage] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [estimatedBudget, setEstimatedBudget] = useState('');
    const [isSendingRequest, setIsSendingRequest] = useState(false);
    const [requestStatus, setRequestStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Real data for providers
    const stats = {
        completedJobs: provider?.jobs_done || 0,
        rating: provider?.rating || 0,
        totalReviews: provider?.jobs_done || 0,
        responseTime: '< 1 hour',
        memberSince: provider?.created_at || new Date().toISOString()
    };

    const reviews: any[] = []; // Empty for new providers

    useEffect(() => {
        const fetchProvider = async () => {
            try {
                const res = await fetch(`/api/users`);
                if (res.ok) {
                    const users = await res.json();
                    const foundProvider = users.find((u: any) => u.id === parseInt(id || '0'));
                    if (foundProvider) {
                        setProvider(foundProvider);
                    }
                }
            } catch (e) {
                console.error('Failed to fetch provider', e);
            } finally {
                setLoading(false);
            }
        };

        fetchProvider();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading provider profile...</p>
                </div>
            </div>
        );
    }

    if (!provider) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Provider not found</h2>
                    <button
                        onClick={() => navigate(-1)}
                        className="text-indigo-600 hover:underline"
                    >
                        Go back
                    </button>
                </div>
            </div>
        );
    }

    const memberSinceDate = new Date(stats.memberSince).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });

    const handleContactProvider = async () => {
        const clientId = localStorage.getItem('userId');
        const clientName = localStorage.getItem('userName');

        if (!clientId || !clientName) {
            alert('Please log in to contact providers');
            return;
        }

        if (!contactMessage.trim()) {
            alert('Please enter a message');
            return;
        }

        setIsSendingRequest(true);
        setRequestStatus('idle');

        try {
            const res = await fetch('/api/contact-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: parseInt(clientId),
                    client_name: clientName,
                    provider_id: provider?.id,
                    provider_name: provider?.name,
                    message: contactMessage,
                    task_description: taskDescription,
                    estimated_budget: estimatedBudget
                })
            });

            if (res.ok) {
                setRequestStatus('success');
                setContactMessage('');
                setTaskDescription('');
                setEstimatedBudget('');
                setTimeout(() => {
                    setShowContactModal(false);
                    setRequestStatus('idle');
                }, 2000);
            } else {
                setRequestStatus('error');
            }
        } catch (e) {
            console.error('Failed to send contact request', e);
            setRequestStatus('error');
        } finally {
            setIsSendingRequest(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
                    >
                        <ArrowLeft size={20} />
                        Back to search
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Profile Header */}
                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm mb-8">
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 h-32"></div>
                    <div className="px-8 pb-8">
                        <div className="flex flex-col md:flex-row gap-6 -mt-16">
                            {/* Avatar */}
                            <div className="w-32 h-32 bg-white rounded-2xl border-4 border-white shadow-xl flex items-center justify-center text-6xl overflow-hidden">
                                {provider.photo_url ? (
                                    <img src={provider.photo_url} alt={provider.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span>👤</span>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 mt-16 md:mt-4">
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                    <div>
                                        <h1 className="text-3xl font-bold text-slate-900 mb-2">{provider.name}</h1>
                                        <div className="flex flex-wrap items-center gap-4 text-slate-600 mb-4">
                                            <div className="flex items-center gap-2">
                                                <Briefcase size={18} />
                                                <span className="font-medium">{provider.service || 'Service Provider'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin size={18} />
                                                <span>{provider.location || 'Location not set'}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <Calendar size={16} />
                                            <span>Member since {memberSinceDate}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setShowContactModal(true)}
                                        className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-4 rounded-xl font-bold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg text-sm md:text-base"
                                    >
                                        Request for Provider
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center">
                        <div className="text-3xl font-bold text-indigo-600 mb-1">{stats.completedJobs}</div>
                        <div className="text-sm text-slate-600 font-medium">Completed Jobs</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                            <span className="text-3xl font-bold text-slate-900">{stats.rating.toFixed(1)}</span>
                        </div>
                        <div className="text-sm text-slate-600 font-medium">Rating</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center">
                        <div className="text-3xl font-bold text-slate-900 mb-1">{stats.totalReviews}</div>
                        <div className="text-sm text-slate-600 font-medium">Reviews</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Clock className="w-5 h-5 text-emerald-600" />
                            <span className="text-lg font-bold text-slate-900">{stats.responseTime}</span>
                        </div>
                        <div className="text-sm text-slate-600 font-medium">Response Time</div>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Left Column - About & Services */}
                    <div className="md:col-span-2 space-y-6">
                        {/* About / Motivation */}
                        <div className="bg-white p-8 rounded-2xl border border-slate-100">
                            <h2 className="text-xl font-bold text-slate-900 mb-4">Motivation & Vision</h2>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {provider.motivation ||
                                    (provider.service ?
                                        `Professional ${provider.service.toLowerCase()} service provider in ${provider.location}. Ready to help with your needs.` :
                                        'New provider on the KIND platform. Contact for more information about services offered.')
                                }
                            </p>
                        </div>

                        {/* Qualifications */}
                        <div className="bg-white p-8 rounded-2xl border border-slate-100">
                            <h2 className="text-xl font-bold text-slate-900 mb-4">Qualifications & Experience</h2>
                            {provider.qualifications ? (
                                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{provider.qualifications}</p>
                            ) : (
                                <div className="flex items-center gap-3 text-slate-500 italic py-4">
                                    <Award size={20} className="text-slate-300" />
                                    <span>Certifications and experience details coming soon...</span>
                                </div>
                            )}
                        </div>

                        {/* Reviews */}
                        <div className="bg-white p-8 rounded-2xl border border-slate-100">
                            <h2 className="text-xl font-bold text-slate-900 mb-6">Reviews</h2>
                            {reviews.length > 0 ? (
                                <div className="space-y-6">
                                    {reviews.map((review, idx) => (
                                        <div key={idx} className="border-b border-slate-100 last:border-0 pb-6 last:pb-0">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-lg">
                                                    👤
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">{review.clientName}</div>
                                                    <div className="flex items-center gap-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                size={14}
                                                                className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-slate-600">{review.comment}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                        <Star size={32} />
                                    </div>
                                    <h3 className="font-bold text-slate-900 mb-2">No reviews yet</h3>
                                    <p className="text-slate-500 text-sm">This provider is new to the platform</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Contact & Details */}
                    <div className="space-y-6">

                        {/* Verification Badge */}
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl border border-emerald-100">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                    <CheckCircle className="text-emerald-600" size={20} />
                                </div>
                                <h3 className="font-bold text-slate-900">Verified Provider</h3>
                            </div>
                            <p className="text-sm text-slate-600">
                                This provider has been verified by KIND platform
                            </p>
                        </div>

                        {/* Service Details */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100">
                            <h3 className="font-bold text-slate-900 mb-4">Service Details</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 text-sm">Category</span>
                                    <span className="font-semibold text-slate-900 text-sm">{provider.service || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 text-sm">Location</span>
                                    <span className="font-semibold text-slate-900 text-sm">{provider.location || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 text-sm">Availability</span>
                                    <span className="font-semibold text-emerald-600 text-sm">Available</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Request Modal */}
            {showContactModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Project Request</h2>
                                <p className="text-sm text-slate-500 mt-1">Provide project details for review by the administrator.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowContactModal(false);
                                    setContactMessage('');
                                    setRequestStatus('idle');
                                }}
                                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6">
                            {requestStatus === 'success' ? (
                                <div className="text-center py-10 animate-in fade-in zoom-in duration-500">
                                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm animate-bounce">
                                        <CheckCircle className="text-emerald-600" size={40} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Request Received!</h3>
                                    <p className="text-slate-600 leading-relaxed max-w-sm mx-auto">
                                        Thank you for your order! We have received your project details and <span className="text-indigo-600 font-bold">we will get back to you within 10 minutes</span> with an update.
                                    </p>
                                    <button
                                        onClick={() => setShowContactModal(false)}
                                        className="mt-8 px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                                    >
                                        Close Window
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-5 mb-8">
                                        <div className="group">
                                            <label className="block text-sm font-bold text-slate-700 mb-2 group-focus-within:text-indigo-600 transition-colors">
                                                What do you need help with? <span className="text-rose-500">*</span>
                                            </label>
                                            <textarea
                                                value={taskDescription}
                                                onChange={(e) => setTaskDescription(e.target.value)}
                                                placeholder="e.g. Fix a leaking pipe under the kitchen sink..."
                                                rows={3}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                                            />
                                        </div>

                                        <div className="group">
                                            <label className="block text-sm font-bold text-slate-700 mb-2 group-focus-within:text-indigo-600 transition-colors">
                                                What's your estimated budget? (MWK) <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">MWK</span>
                                                <input
                                                    type="text"
                                                    value={estimatedBudget}
                                                    onChange={(e) => setEstimatedBudget(e.target.value)}
                                                    placeholder="e.g. 15,000"
                                                    className="w-full pl-16 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="group">
                                            <label className="block text-sm font-bold text-slate-700 mb-2 group-focus-within:text-indigo-600 transition-colors">
                                                Any special instructions? (Optional)
                                            </label>
                                            <textarea
                                                value={contactMessage}
                                                onChange={(e) => setContactMessage(e.target.value)}
                                                placeholder="Additional details, timeline preference, etc."
                                                rows={2}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                                            />
                                        </div>
                                    </div>

                                    {requestStatus === 'error' && (
                                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
                                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 shrink-0">
                                                <X size={16} />
                                            </div>
                                            <p className="text-sm text-red-700 font-medium">
                                                Something went wrong. Please check your connection and try again.
                                            </p>
                                        </div>
                                    )}

                                    <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 mb-8">
                                        <div className="flex gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl shrink-0 border border-indigo-50">
                                                ⚡
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm mb-0.5">Quick & Secure</h4>
                                                <p className="text-xs text-slate-600 leading-relaxed">
                                                    Your request is sent directly to our team. We'll verify the details and connect you with {provider?.name} internally.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => {
                                                setShowContactModal(false);
                                                setContactMessage('');
                                                setRequestStatus('idle');
                                            }}
                                            className="flex-1 px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleContactProvider}
                                            disabled={isSendingRequest || !taskDescription.trim() || !estimatedBudget.trim()}
                                            className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {isSendingRequest ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={18} />
                                                    Send Message
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
