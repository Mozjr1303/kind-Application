import React, { useEffect, useState } from 'react';
import { Users, Briefcase, AlertTriangle, Activity, MoreHorizontal, Search, Filter, Trash2 } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const mockChartData = [
  { name: 'Mon', users: 400, jobs: 240 },
  { name: 'Tue', users: 300, jobs: 139 },
  { name: 'Wed', users: 200, jobs: 980 },
  { name: 'Thu', users: 278, jobs: 390 },
  { name: 'Fri', users: 189, jobs: 480 },
  { name: 'Sat', users: 239, jobs: 380 },
  { name: 'Sun', users: 349, jobs: 430 },
];

type ApiUser = {
  id: number | string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
};

const recentUsersFallback = [
  { id: '1', name: 'Alice Freeman', role: 'Provider', status: 'Active', date: '2 mins ago' },
  { id: '2', name: 'Bob Smith', role: 'Client', status: 'Pending', date: '15 mins ago' },
  { id: '3', name: 'Charlie Kim', role: 'Provider', status: 'Active', date: '1 hour ago' },
  { id: '4', name: 'David Lee', role: 'Client', status: 'Inactive', date: '3 hours ago' },
];

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [pendingProviders, setPendingProviders] = useState<ApiUser[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [contactRequests, setContactRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {

    const fetchUsers = async (isBackground = false) => {
      if (!isBackground) setLoadingUsers(true);
      setUsersError(null);
      try {
        const res = await fetch('http://localhost:4000/api/users');
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        setUsers(data || []);
      } catch (e: any) {
        if (!isBackground) setUsersError(e.message || 'Error fetching users');
      } finally {
        if (!isBackground) setLoadingUsers(false);
      }
    };


    const fetchPendingProviders = async (isBackground = false) => {
      if (!isBackground) setLoadingPending(true);
      try {
        const res = await fetch('http://localhost:4000/api/admin/pending-providers');
        if (res.ok) {
          const data = await res.json();
          // avoid unnecessary re-renders if data is same (deep check omitted for simplicity, relying on React)
          setPendingProviders(data || []);
        }
      } catch (e) {
        console.error('Failed to fetch pending providers', e);
      } finally {
        if (!isBackground) setLoadingPending(false);
      }
    };

    const fetchContactRequests = async (isBackground = false) => {
      if (!isBackground) setLoadingRequests(true);
      try {
        const res = await fetch('http://localhost:4000/api/contact-requests');
        if (res.ok) {
          const data = await res.json();
          setContactRequests(data || []);
        }
      } catch (e) {
        console.error('Failed to fetch contact requests', e);
      } finally {
        if (!isBackground) setLoadingRequests(false);
      }
    };

    // Initial fetch
    fetchUsers(false);
    fetchPendingProviders(false);
    fetchContactRequests(false);

    // Polling every 5 seconds
    const interval = setInterval(() => {
      fetchUsers(true);
      fetchPendingProviders(true);
      fetchContactRequests(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleProviderStatus = async (id: number | string, status: 'active' | 'rejected') => {
    try {
      const res = await fetch(`http://localhost:4000/api/admin/providers/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        // Refresh pending list
        const refreshRes = await fetch('http://localhost:4000/api/admin/pending-providers');
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setPendingProviders(data || []);
        }
        // Refresh all users list
        const usersRes = await fetch('http://localhost:4000/api/users');
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(data || []);
        }
      }
    } catch (e) {
      console.error(`Failed to ${status} provider`, e);
    }
  };

  const handleDeleteUser = async (userId: number | string) => {
    if (!window.confirm('Are you sure you want to permanently delete this user account? This cannot be undone.')) return;
    try {
      const res = await fetch(`http://localhost:4000/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setPendingProviders(prev => prev.filter(p => p.id !== userId));
        setUsers(prev => prev.filter(u => u.id !== userId));
      }
    } catch (e) {
      console.error('Error deleting user:', e);
    }
  };

  const handleContactRequestStatus = async (id: number | string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`http://localhost:4000/api/contact-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        const refreshRes = await fetch('http://localhost:4000/api/contact-requests');
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setContactRequests(data || []);
        }
      }
    } catch (e) {
      console.error(`Failed to ${status} contact request`, e);
    }
  };

  const handleDeleteContactRequest = async (id: number | string) => {
    if (!window.confirm('Delete this request? This action cannot be undone.')) return;
    try {
      const res = await fetch(`http://localhost:4000/api/contact-requests/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setContactRequests(prev => prev.filter(r => r.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete contact request', e);
    }
  };

  return (
    <div className="space-y-8">
      {/* ... (existing header and stats) */}

      {/* Pending Provider Approvals */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Pending Provider Approvals</h3>
              <p className="text-sm text-slate-500 mt-1">Review and approve new service provider accounts</p>
            </div>
            <button
              onClick={() => {
                const fetchPendingProviders = async () => {
                  setLoadingPending(true);
                  try {
                    const res = await fetch('http://localhost:4000/api/admin/pending-providers');
                    if (res.ok) {
                      const data = await res.json();
                      console.log('Refreshed pending providers:', data);
                      setPendingProviders(data || []);
                    }
                  } catch (e) {
                    console.error('Failed to fetch pending providers', e);
                  } finally {
                    setLoadingPending(false);
                  }
                };
                fetchPendingProviders();
              }}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Refresh List"
            >
              <Activity size={18} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loadingPending ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Loading pending providers...</p>
            </div>
          ) : pendingProviders.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Service</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingProviders.map((provider) => (
                  <tr key={provider.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{provider.name}</td>
                    <td className="px-6 py-4 text-slate-600">{provider.email}</td>
                    <td className="px-6 py-4 text-slate-600">{provider.service || '—'}</td>
                    <td className="px-6 py-4 text-slate-600">{provider.location || '—'}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {provider.created_at ? new Date(provider.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end items-center">
                        <button
                          onClick={() => handleProviderStatus(provider.id, 'active')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleProviderStatus(provider.id, 'rejected')}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleDeleteUser(provider.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                          title="Delete Account"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Briefcase size={24} />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">No pending approvals</h3>
              <p className="text-slate-500 text-sm">New providers waiting for approval will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Platform Activity</h3>
            <select className="text-sm border-none bg-slate-50 rounded-lg px-3 py-1 text-slate-600 focus:ring-0">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="users" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="jobs" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Recent Registrations</h3>
            <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700">View All</button>
          </div>
          <div className="space-y-4">
            {loadingUsers && <div className="text-sm text-slate-500">Loading users...</div>}
            {usersError && <div className="text-sm text-rose-600">{usersError}</div>}
            {!loadingUsers && !usersError && (users.length ? (
              users
                .slice()
                .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
                .slice(0, 6)
                .map((u) => (
                  <div key={String(u.id)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                      <img src={`https://picsum.photos/seed/${u.id}-${u.email}/100`} alt={u.name} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.role} • {u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</p>
                    </div>
                    <Badge status={'Active'} />
                  </div>
                ))
            ) : (
              recentUsersFallback.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                    <img src={`https://picsum.photos/seed/${user.id + user.name}/100`} alt={user.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.role} • {user.date}</p>
                  </div>
                  <Badge status={user.status} />
                </div>
              ))
            ))}
          </div>
        </div>
        <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
          <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-bold text-amber-800">Action Needed</h4>
            <p className="text-xs text-amber-700 mt-1">
              {pendingProviders.length > 0
                ? `${pendingProviders.length} providers are waiting for approval. Review their applications to maintain service quality.`
                : 'All provider applications have been reviewed. No pending actions.'}
            </p>
            {pendingProviders.length > 0 && (
              <button
                onClick={() => document.querySelector('.overflow-x-auto')?.scrollIntoView({ behavior: 'smooth' })}
                className="mt-2 text-xs font-semibold text-amber-800 hover:text-amber-900 underline"
              >
                Review Applications
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contact Requests */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Contact & Service Requests</h3>
            <p className="text-sm text-slate-500 mt-1">Review and approve requests from clients to connect with specific providers</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loadingRequests ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Loading requests...</p>
            </div>
          ) : contactRequests.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Provider</th>
                  <th className="px-6 py-4">Task</th>
                  <th className="px-6 py-4">Budget</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contactRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{request.client_name}</div>
                      <div className="text-xs text-slate-500">ID: {request.client_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{request.provider_name}</div>
                      <div className="text-xs text-slate-500">ID: {request.provider_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-[200px] truncate font-medium text-slate-800" title={request.task_description}>
                        {request.task_description || 'N/A'}
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5" title={request.message}>
                        {request.message || 'No additional message'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">
                        {request.estimated_budget ? `MWK ${request.estimated_budget}` : 'TBD'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {request.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                          Pending
                        </span>
                      )}
                      {request.status === 'approved' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Approved
                        </span>
                      )}
                      {request.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end items-center">
                        {request.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleContactRequestStatus(request.id, 'approved')}
                              className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleContactRequestStatus(request.id, 'rejected')}
                              className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No action needed</span>
                        )}
                        <button
                          onClick={() => handleDeleteContactRequest(request.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-2"
                          title="Delete Request"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                📬
              </div>
              <h3 className="font-bold text-slate-900 mb-2">No contact requests</h3>
              <p className="text-slate-500 text-sm">Contact requests will appear here when clients want to reach providers</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
