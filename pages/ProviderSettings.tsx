import React, { useState, useEffect } from 'react';
import {
    Moon, Sun, Bell, Shield, Smartphone, Globe,
    ChevronRight, LogOut, Check, Laptop, Eye,
    Lock, Mail, CreditCard, HelpCircle, Star, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ProviderSettings = () => {
    const navigate = useNavigate();

    // State for settings
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
        return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'light';
    });

    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        sms: false,
        marketing: false
    });
    const [privacy, setPrivacy] = useState({
        profileVisible: true,
        showOnlineStatus: true,
        allowMessages: true
    });

    // Modal States
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showSignOutModal, setShowSignOutModal] = useState(false);

    // Password Form State
    const [passwordForm, setPasswordForm] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    // toggle theme effect
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else if (theme === 'light') {
            root.classList.remove('dark');
        } else if (theme === 'system') {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.new !== passwordForm.confirm) {
            alert("New passwords do not match!");
            return;
        }
        alert("Password updated successfully!");
        setPasswordForm({ current: '', new: '', confirm: '' });
        setShowPasswordModal(false);
    };

    const handleSignOutEverywhere = () => {
        localStorage.clear();
        setShowSignOutModal(false);
        navigate('/login');
    };

    return (
        <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 relative bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-300">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your account preferences and experience.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
                        <nav className="space-y-1">
                            <button className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-xl font-medium transition-colors">
                                <Sun size={20} /> Appearance
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors">
                                <Bell size={20} /> Notifications
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors">
                                <Shield size={20} /> Privacy & Security
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">

                    {/* 1. Appearance Section */}
                    <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <Sun size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Appearance</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Customize how KIND looks on your device.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Light Mode */}
                            <button
                                onClick={() => setTheme('light')}
                                className={`group relative p-4 rounded-2xl border-2 transition-all ${theme === 'light' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                            >
                                <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg mb-3 shadow-inner overflow-hidden relative border border-slate-200 dark:border-slate-700">
                                    <div className="absolute top-2 left-2 w-16 h-2 bg-white dark:bg-slate-700 rounded-full shadow-sm"></div>
                                    <div className="absolute top-6 left-2 w-8 h-8 bg-white dark:bg-slate-700 rounded-full shadow-sm"></div>
                                    <div className="absolute top-6 right-2 w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full opacity-50 -mr-10 -mt-10"></div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className={`font-bold ${theme === 'light' ? 'text-indigo-900 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>Light</span>
                                    {theme === 'light' && <Check size={18} className="text-indigo-600 dark:text-indigo-400" />}
                                </div>
                            </button>

                            {/* Dark Mode */}
                            <button
                                onClick={() => setTheme('dark')}
                                className={`group relative p-4 rounded-2xl border-2 transition-all ${theme === 'dark' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                            >
                                <div className="aspect-video bg-slate-900 rounded-lg mb-3 shadow-inner overflow-hidden relative border border-slate-700">
                                    <div className="absolute top-2 left-2 w-16 h-2 bg-slate-800 rounded-full"></div>
                                    <div className="absolute top-6 left-2 w-8 h-8 bg-slate-800 rounded-full"></div>
                                    <div className="absolute top-6 right-2 w-20 h-20 bg-indigo-500 rounded-full opacity-20 -mr-10 -mt-10"></div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className={`font-bold ${theme === 'dark' ? 'text-indigo-900 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>Dark</span>
                                    {theme === 'dark' && <Check size={18} className="text-indigo-600 dark:text-indigo-400" />}
                                </div>
                            </button>

                            {/* System Mode */}
                            <button
                                onClick={() => setTheme('system')}
                                className={`group relative p-4 rounded-2xl border-2 transition-all ${theme === 'system' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                            >
                                <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-900 dark:from-slate-800 dark:to-slate-950 rounded-lg mb-3 shadow-inner overflow-hidden relative border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                    <Laptop className="text-slate-400 group-hover:text-indigo-500 transition-colors" size={32} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className={`font-bold ${theme === 'system' ? 'text-indigo-900 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>System</span>
                                    {theme === 'system' && <Check size={18} className="text-indigo-600 dark:text-indigo-400" />}
                                </div>
                            </button>
                        </div>
                    </section>

                    {/* 2. Notifications Section */}
                    <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <Bell size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notifications</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Choose what updates you want to receive.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {[
                                { id: 'email', label: 'Email Notifications', desc: 'Receive job updates and daily summaries via email.', icon: Mail },
                                { id: 'push', label: 'Push Notifications', desc: 'Get real-time alerts on your device for new messages.', icon: Smartphone },
                                { id: 'marketing', label: 'Marketing & Tips', desc: 'Receive tips to improve your profile and promotional offers.', icon: Star }
                            ].map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                                            <item.icon size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">{item.label}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={notifications[item.id as keyof typeof notifications]}
                                            onChange={() => setNotifications(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof notifications] }))}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 3. Privacy & Security */}
                    <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Lock size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Privacy & Security</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Manage who can see your profile and secure your account.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Profile Visibility */}
                            <div className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-3">
                                    <Eye className="text-slate-400 dark:text-slate-500" size={20} />
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">Profile Visibility</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Allow clients to find you in search results.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{privacy.profileVisible ? 'Public' : 'Hidden'}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={privacy.profileVisible}
                                            onChange={() => setPrivacy(prev => ({ ...prev, profileVisible: !prev.profileVisible }))}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 dark:peer-checked:bg-emerald-500"></div>
                                    </label>
                                </div>
                            </div>

                            <hr className="border-slate-100 dark:border-slate-800" />

                            <button
                                onClick={() => setShowPasswordModal(true)}
                                className="flex items-center justify-between w-full py-2 group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:border-indigo-300 dark:group-hover:border-indigo-700 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                                        <Lock size={16} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">Change Password</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Last changed 3 months ago</p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:translate-x-1 group-hover:text-indigo-400 transition-all" />
                            </button>

                            <button
                                onClick={() => setShowSignOutModal(true)}
                                className="flex items-center justify-between w-full py-2 group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:border-red-300 dark:group-hover:border-red-800 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">
                                        <LogOut size={16} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Sign out everywhere</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Log out from all other devices</p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:translate-x-1 group-hover:text-red-400 transition-all" />
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => setShowPasswordModal(false)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400">
                                <Lock size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Change Password</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Ensure your account is secure with a strong password.</p>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="Enter current password"
                                    value={passwordForm.current}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="Enter new password"
                                    value={passwordForm.new}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="Confirm new password"
                                    value={passwordForm.confirm}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white font-bold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
                            >
                                Update Password
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Sign Out Everywhere Confirmation Modal */}
            {showSignOutModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-200 text-center border border-slate-100 dark:border-slate-800">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 dark:text-red-400">
                            <LogOut size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Sign Out Everywhere?</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                            This will log you out from all devices, including this one. You'll need to sign in again.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSignOutModal(false)}
                                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSignOutEverywhere}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-200 dark:shadow-none"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
