import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, Check, Clock, AlertCircle } from 'lucide-react';

interface Notification {
    id: string;
    type: 'contact_request' | 'job_update' | 'system';
    title: string;
    message: string;
    time: string;
    read: boolean;
    data?: any;
}

export const ProviderUpdates = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        setLoading(true);
        const userId = localStorage.getItem('userId');
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            // Fetch contact requests as notifications
            const res = await fetch(`http://localhost:4000/api/contact-requests/provider/${userId}`);
            if (res.ok) {
                const requests = await res.json();

                // Transform requests into notifications
                const newNotifications: Notification[] = Array.isArray(requests) ? requests.map((req: any) => ({
                    id: `req-${req.id}`,
                    type: 'contact_request',
                    title: 'New Client Inquiry',
                    message: `${req.client_name} is interested in your services: "${req.message || 'I would like to discuss a job.'}"`,
                    time: new Date(req.approved_at || req.created_at).toLocaleDateString(),
                    read: false,
                    data: req
                })) : [];

                setNotifications(newNotifications);
            }
        } catch (e) {
            console.error('Failed to fetch updates', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const updateReadCount = (currentNotifications: Notification[]) => {
        // We'll store the number of AS READ notifications or simply the count of viewed items?
        // To match the DashboardLayout logic (count > storedCount = unread), we need to update the stored count
        // effectively when the user "reads" them.

        // Actually, the logic in DashboardLayout is: hasUnread = totalRequests > storedReadCount.
        // So when we mark as read here, we should update 'providerLastReadCount' to be the total number of requests.
        localStorage.setItem('providerLastReadCount', currentNotifications.length.toString());
        // Dispatch event so DashboardLayout updates immediately
        window.dispatchEvent(new Event('storage'));
    };

    const markAsRead = (id: string) => {
        setNotifications(prev => {
            const next = prev.map(n => n.id === id ? { ...n, read: true } : n);
            // If all are read, update the count
            if (next.every(n => n.read)) {
                updateReadCount(next);
            }
            return next;
        });
    };

    const markAllAsRead = () => {
        setNotifications(prev => {
            const next = prev.map(n => ({ ...n, read: true }));
            updateReadCount(next); // Update count since all are read
            return next;
        });
    };

    // Also update count when mounting if we just fetched and user is viewing them? 
    // Maybe best to wait for user interaction, OR if the page is open, consider them 'seen' eventually.
    // For now, let's keep the manual "Mark as read" or click-to-read behavior.

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Updates</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Stay informed about your jobs and client interactions.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchNotifications}
                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors"
                        title="Refresh"
                    >
                        <Clock size={20} />
                    </button>
                    {notifications.some(n => !n.read) && (
                        <button
                            onClick={markAllAsRead}
                            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            Mark all as read
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500 dark:text-slate-400">Loading updates...</p>
                </div>
            ) : notifications.length > 0 ? (
                <div className="space-y-4">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            onClick={() => markAsRead(notification.id)}
                            className={`
                                relative p-6 rounded-2xl border transition-all cursor-pointer group
                                ${notification.read
                                    ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                                    : 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30 shadow-sm'
                                }
                            `}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`
                                    w-12 h-12 rounded-xl flex items-center justify-center shrink-0
                                    ${notification.type === 'contact_request'
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                    }
                                `}>
                                    {notification.type === 'contact_request' ? <MessageSquare size={24} /> : <Bell size={24} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-4 mb-1">
                                        <h3 className={`font-bold text-lg truncate ${notification.read ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-indigo-200'}`}>
                                            {notification.title}
                                        </h3>
                                        <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">{notification.time}</span>
                                    </div>
                                    <p className={`text-sm leading-relaxed ${notification.read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {notification.message}
                                    </p>

                                    {!notification.read && (
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-2 py-1 rounded-md">
                                                New
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-300 dark:text-slate-600">
                        <Bell size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No new updates</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                        You're all caught up! When clients contact you or there are important system alerts, they'll appear here.
                    </p>
                </div>
            )}
        </div>
    );
};
