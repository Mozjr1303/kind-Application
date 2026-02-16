import React, { useState, useEffect } from 'react';
import { Search, Filter, MoreHorizontal } from 'lucide-react';



export const AdminLogs: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('All');
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:4000/api/logs');
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (e) {
            console.error('Failed to fetch logs', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const deleteLog = async (id: number) => {
        try {
            const res = await fetch(`http://localhost:4000/api/logs/${id}`, { method: 'DELETE' });
            if (res.ok) fetchLogs();
        } catch (e) {
            console.error('Failed to delete log', e);
        }
    };

    const clearAllLogs = async () => {
        if (!window.confirm('Are you sure you want to clear all system logs?')) return;
        try {
            const res = await fetch('http://localhost:4000/api/logs', { method: 'DELETE' });
            if (res.ok) fetchLogs();
        } catch (e) {
            console.error('Failed to clear logs', e);
        }
    };

    const filteredLogs = logs.filter(log =>
        (filter === 'All' || log.status === filter) &&
        (log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.detail || '').toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">System Logs</h3>
                <button
                    onClick={clearAllLogs}
                    className="text-sm px-4 py-2 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-colors"
                >
                    Clear All Logs
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Activity Log</h3>
                        <p className="text-sm text-slate-500 mt-1">Audit trail of system activities and user actions</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search logs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <select
                            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            <option value="All">All Status</option>
                            <option value="Success">Success</option>
                            <option value="Failed">Failed</option>
                            <option value="Warning">Warning</option>
                        </select>
                        <button className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Details</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-slate-500">Loading system logs...</p>
                                    </td>
                                </tr>
                            ) : filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900">{log.action}</td>
                                        <td className="px-6 py-4 text-slate-600">{log.user}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${log.status === 'Success' ? 'bg-emerald-50 text-emerald-700' :
                                                log.status === 'Failed' ? 'bg-red-50 text-red-700' :
                                                    'bg-amber-50 text-amber-700'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'Success' ? 'bg-emerald-500' :
                                                    log.status === 'Failed' ? 'bg-red-500' :
                                                        'bg-amber-500'
                                                    }`}></span>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={log.detail}>
                                            {log.detail}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => deleteLog(log.id)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Delete entry"
                                            >
                                                <MoreHorizontal size={14} className="rotate-90" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No logs found matching your criteria
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
