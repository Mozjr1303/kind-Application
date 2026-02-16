import React, { useState, useEffect } from 'react';
import { Users, Briefcase, Search, Filter, MoreHorizontal, Trash2, MapPin } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';

type ApiUser = {
    id: number | string;
    name: string;
    email: string;
    role: string;
    created_at?: string;
    location?: string;
    service?: string;
};

export const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<ApiUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userSearch, setUserSearch] = useState('');

    useEffect(() => {
        const fetchUsers = async (isBackground = false) => {
            if (!isBackground) setLoading(true);
            setError(null);
            try {
                const res = await fetch('http://localhost:4000/api/users');
                if (!res.ok) throw new Error('Failed to fetch users');
                const data = await res.json();
                setUsers(data || []);
            } catch (e: any) {
                if (!isBackground) setError(e.message || 'Error fetching users');
            } finally {
                if (!isBackground) setLoading(false);
            }
        };

        fetchUsers();

        const interval = setInterval(() => {
            fetchUsers(true);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const clientCount = users.filter(u => u.role?.toLowerCase() === 'client').length;
    const providerCount = users.filter(u => u.role?.toLowerCase() === 'provider').length;

    const handleDeleteUser = async (userId: number | string) => {
        if (!window.confirm('Are you sure you want to remove this provider? This action cannot be undone.')) return;

        try {
            const res = await fetch(`http://localhost:4000/api/users/${userId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setUsers(users.filter(u => u.id !== userId));
            } else {
                alert('Failed to delete user');
            }
        } catch (e) {
            console.error('Error deleting user:', e);
            alert('Error connecting to server');
        }
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.role?.toLowerCase().includes(userSearch.toLowerCase())
    );

    const clients = filteredUsers.filter(u => u.role?.toLowerCase() === 'client');
    const providers = filteredUsers.filter(u => u.role?.toLowerCase() === 'provider');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Users & Providers Directory</h3>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Users"
                    value={users.length}
                    icon={Users}
                    trend="+12%"
                    trendUp={true}
                    colorClass="text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400"
                />
                <StatCard
                    title="Total Clients"
                    value={clientCount}
                    icon={Users}
                    colorClass="text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400"
                />
                <StatCard
                    title="Total Providers"
                    value={providerCount}
                    icon={Briefcase}
                    colorClass="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
                />
            </div>

            {/* Split View: Clients & Providers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Clients List */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Clients</h3>
                            <p className="text-sm text-slate-500 mt-1">Registered customers</p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                            {clients.length}
                        </span>
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        {loading ? (
                            <div className="p-8 text-center text-slate-500">Loading clients...</div>
                        ) : clients.length > 0 ? (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                        <th className="px-4 py-3">User</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {clients.map(client => (
                                        <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                                                        <img src={`https://picsum.photos/seed/${client.id}/100`} alt={client.name} />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900">{client.name}</div>
                                                        <div className="text-xs text-slate-500">{client.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge status="Active" color="blue" />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleDeleteUser(client.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Remove Client"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-slate-500">
                                No clients found
                            </div>
                        )}
                    </div>
                </div>

                {/* Providers List */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Providers</h3>
                            <p className="text-sm text-slate-500 mt-1">Service professionals</p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                            {providers.length}
                        </span>
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        {loading ? (
                            <div className="p-8 text-center text-slate-500">Loading providers...</div>
                        ) : providers.length > 0 ? (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                        <th className="px-4 py-3">Provider</th>
                                        <th className="px-4 py-3">Service & Location</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {providers.map(provider => (
                                        <tr key={provider.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                                                        <img src={`https://picsum.photos/seed/${provider.id}/100`} alt={provider.name} />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900">{provider.name}</div>
                                                        <div className="text-xs text-slate-500">{provider.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium text-slate-700">{provider.service || 'General Service'}</span>
                                                    <div className="flex items-center text-xs text-slate-500">
                                                        <MapPin className="w-3 h-3 mr-1" />
                                                        {provider.location || 'Remote/TBD'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge status="Active" color="green" />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleDeleteUser(provider.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Remove Provider"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-slate-500">
                                No providers found
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
