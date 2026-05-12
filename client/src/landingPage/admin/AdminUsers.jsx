import React, { useState, useEffect } from 'react';
import API from '../../api';
import toast from 'react-hot-toast';

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            const res = await API.get('/admin/users');
            setUsers(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch users:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const reviewOwner = async (id, status) => {
        try {
            const rejectionReason = status === 'rejected' ? window.prompt('Reason for rejection', 'Documents could not be verified') : '';
            await API.put(`/admin/owners/${id}/verification`, { status, rejectionReason });
            toast.success(status === 'verified' ? 'Owner verified' : 'Owner rejected');
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Owner review failed');
        }
    };

    const toggleBlockUser = async (id) => {
        try {
            await API.put(`/admin/users/${id}/block`);
            toast.success("User access toggled successfully.");
            const res = await API.get('/admin/users');
            setUsers(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to alter user status.");
        }
    };

    const glassWidget = "glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden";
    const headerTitle = "text-lg font-bold text-white mb-6 tracking-wide";
    const safeString = (val) => String(val || "-");

    const getInitial = (name) => {
        const str = String(name || "U");
        return str.charAt(0).toUpperCase() || "U";
    };

    return (
        <div className="space-y-6">
            <div className={`${glassWidget} min-h-[calc(100vh-140px)] flex flex-col`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className={headerTitle}>Registered Users</h2>
                    <div className="flex gap-2">
                        <span className="bg-blue-500/20 text-blue-400 px-3 py-1 text-xs font-bold rounded-lg border border-blue-500/30">Total Accounts: {users.length}</span>
                    </div>
                </div>
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-white/30 border-b border-white/5 uppercase tracking-widest text-[11px]">
                                <th className="pb-4 font-bold pl-4">Account Profile</th>
                                <th className="pb-4 font-bold">Email Identification</th>
                                <th className="pb-4 font-bold text-center">Access Role</th>
                                <th className="pb-4 font-bold text-center">Join Date</th>
                                <th className="pb-4 font-bold text-center">Verification</th>
                                <th className="pb-4 font-bold text-right pr-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-white/80">
                            {users.length === 0 && !loading && (
                                <tr><td colSpan="5" className="text-center py-12 text-white/40">No users found on the network.</td></tr>
                            )}
                            {loading && (
                                <tr><td colSpan="5" className="text-center py-12 text-white/40">Loading accounts...</td></tr>
                            )}
                            {users.map((u, i) => (
                                <tr key={u._id || i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="py-4 pl-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 shadow-lg flex items-center justify-center text-xl font-black text-white/50 uppercase">
                                                {getInitial(u.name)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white capitalize">{safeString(u.name)}</div>
                                                <div className="text-[9px] text-white/30 font-mono mt-0.5">ID: {u._id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 text-white/60 text-xs">{safeString(u.email)}</td>
                                    <td className="py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${u.role === 'admin' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                            u.role === 'owner' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                                'bg-white/10 text-white/60 border border-white/20'
                                            }`}>
                                            {safeString(u.role)}
                                        </span>
                                    </td>
                                    <td className="py-4 text-center font-mono text-xs text-white/50">
                                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="py-4 text-center font-black text-white/50">
                                        {u.role === 'owner' ? (u.ownerVerification?.status || 'not_submitted') : '-'}
                                    </td>
                                    <td className="py-4 text-right pr-4">
                                        <div className="flex justify-end gap-2">
                                            {u.role === 'owner' && u.ownerVerification?.status !== 'verified' && (
                                                <button onClick={() => reviewOwner(u._id, 'verified')} className="text-[10px] px-3 py-1.5 rounded uppercase font-bold tracking-widest border bg-primary/10 text-primary-light border-primary/30">Verify</button>
                                            )}
                                            {u.role === 'owner' && u.ownerVerification?.status !== 'rejected' && (
                                                <button onClick={() => reviewOwner(u._id, 'rejected')} className="text-[10px] px-3 py-1.5 rounded uppercase font-bold tracking-widest border bg-yellow-500/10 text-yellow-400 border-yellow-500/30">Reject</button>
                                            )}
                                            {u.role !== 'admin' && (
                                                <button
                                                    onClick={() => toggleBlockUser(u._id)}
                                                    className={`text-[10px] px-3 py-1.5 rounded uppercase font-bold tracking-widest border transition-colors ${u.isBlocked ? 'bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/40' : 'bg-white/5 text-white/50 border-white/10 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'}`}
                                                >
                                                    {u.isBlocked ? 'Unblock' : 'Block'}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
