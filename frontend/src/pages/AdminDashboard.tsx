import { useState, useEffect } from 'react';
import { FloatingNav } from '@/components/FloatingNav';
import { BackgroundVideo } from '@/components/BackgroundVideo';
import {
  getAdminUsers,
  updateUserRole,
  getAdminStats,
  type UserAdminItem,
  type AdminStats,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldCheck,
  Users,
  Activity,
  LogIn,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Sparkles,
  UserCheck,
  Shield,
  Layers,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const { user: currentUser } = useAuth();

  // State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserAdminItem[]>([]);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    loadUsersList();
  }, [searchQuery, roleFilter, currentPage]);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const statsData = await getAdminStats();
      setStats(statsData);
    } catch (err: any) {
      console.error('Error fetching admin stats:', err);
      setError(err?.message || 'Could not load administrative statistics.');
    } finally {
      setLoading(false);
    }
  };

  const loadUsersList = async () => {
    setUsersLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      const resp = await getAdminUsers({
        query: searchQuery,
        role: roleFilter || undefined,
        limit: pageSize,
        offset,
      });
      setUsers(resp.users || []);
      setTotalUsersCount(resp.total || 0);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleRoleToggle = async (targetUser: UserAdminItem) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';

    if (currentUser?.id === targetUser.id && newRole === 'user') {
      setError('You cannot remove the admin role from your own active session.');
      return;
    }

    setUpdatingUserId(targetUser.id);
    setError(null);
    setSuccessMsg(null);

    try {
      await updateUserRole(targetUser.id, newRole);
      setSuccessMsg(`Role for ${targetUser.email || targetUser.full_name} updated to ${newRole.toUpperCase()}.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await Promise.all([loadUsersList(), loadOverview()]);
    } catch (err: any) {
      console.error('Error updating role:', err);
      setError(err?.message || 'Failed to update user role.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalUsersCount / pageSize));

  // Render Activity Timeline Chart (Pure SVG)
  const renderActivityTimeline = () => {
    const points = stats?.classification_stats.classification_activity_over_time || [];

    if (points.length === 0) {
      return (
        <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-white/10 rounded-xl">
          <Activity className="w-8 h-8 text-slate-600 mb-2" />
          <span>No historical classification activity recorded yet.</span>
        </div>
      );
    }

    const maxVal = Math.max(...points.map((p) => p.count), 5);
    const chartHeight = 140;
    const chartWidth = 500;
    const stepX = chartWidth / Math.max(points.length - 1, 1);

    const coordinates = points.map((p, idx) => {
      const x = idx * stepX;
      const y = chartHeight - (p.count / maxVal) * (chartHeight - 20) - 10;
      return { x, y, ...p };
    });

    const pathD = coordinates.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');

    const areaD = `${pathD} L ${coordinates[coordinates.length - 1].x} ${chartHeight} L ${coordinates[0].x} ${chartHeight} Z`;

    return (
      <div className="w-full">
        <div className="h-44 w-full relative">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Area Fill */}
            <path d={areaD} fill="url(#cyanGradient)" />
            {/* Trend Line */}
            <path d={pathD} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Data Points */}
            {coordinates.map((pt, idx) => (
              <g key={idx}>
                <circle cx={pt.x} cy={pt.y} r="4" fill="#06b6d4" stroke="#0f172a" strokeWidth="2" />
                <title>{`${pt.date}: ${pt.count} classifications`}</title>
              </g>
            ))}
          </svg>
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 px-1">
          <span>{points[0]?.date}</span>
          <span className="text-cyan-400 font-semibold">Active Classification Timeline</span>
          <span>{points[points.length - 1]?.date}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden pt-24 px-4 pb-12 flex flex-col items-center bg-slate-950">
      <BackgroundVideo />
      <FloatingNav />

      <main className="w-full max-w-6xl mt-4 space-y-6 z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/85 border border-purple-500/30 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                DERMO-AI Admin Dashboard
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                  Administrator
                </span>
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Real-time operational intelligence, user management, and AI inference metrics
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              loadOverview();
              loadUsersList();
            }}
            className="self-start md:self-auto px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/10 transition-all flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Refresh Analytics
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. KEY SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Registered Users */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered Users</span>
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {loading ? <Loader2 className="w-6 h-6 animate-spin text-cyan-400" /> : stats?.user_stats.total_registered_users ?? 0}
              </span>
              <span className="text-xs text-slate-400">total accounts</span>
            </div>
            <div className="mt-2 text-[11px] text-cyan-400 font-medium flex items-center gap-1">
              <span>{stats?.user_stats.admins_count ?? 0} Admins</span>
              <span>•</span>
              <span>{stats?.user_stats.regular_users_count ?? 0} Normal Users</span>
            </div>
          </div>

          {/* Distinct Users Signed In */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Users</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {loading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-400" /> : stats?.user_stats.distinct_users_signed_in ?? 0}
              </span>
              <span className="text-xs text-slate-400">distinct signed-in</span>
            </div>
            <p className="mt-2 text-[11px] text-emerald-400 font-medium">
              Verified authenticated accounts
            </p>
          </div>

          {/* Total Sign-in Events */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sign-In Events</span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <LogIn className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {loading ? <Loader2 className="w-6 h-6 animate-spin text-blue-400" /> : stats?.user_stats.total_sign_in_events ?? 0}
              </span>
              <span className="text-xs text-slate-400">login events</span>
            </div>
            <p className="mt-2 text-[11px] text-blue-400 font-medium">
              Discrete authentication logins
            </p>
          </div>

          {/* Completed Classifications */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Classifications</span>
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {loading ? <Loader2 className="w-6 h-6 animate-spin text-purple-400" /> : stats?.classification_stats.total_classifications ?? 0}
              </span>
              <span className="text-xs text-slate-400">inferences run</span>
            </div>
            <p className="mt-2 text-[11px] text-purple-400 font-medium">
              {stats?.classification_stats.distinct_users_classified ?? 0} distinct users classified
            </p>
          </div>
        </div>

        {/* 2. ANALYTICS ROW: Activity Timeline & 7-Class Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Classification Activity Timeline */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Classification Activity Over Time
                </h2>
                <p className="text-slate-400 text-xs">Daily volume of AI diagnosis submissions</p>
              </div>
            </div>
            {renderActivityTimeline()}
          </div>

          {/* Actual 7 Model Prediction Classes Breakdown */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  Model Class Breakdown
                </h2>
                <p className="text-slate-400 text-xs">Distribution across the 7 trained skin disease classes</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Total: {stats?.classification_stats.total_classifications ?? 0}
              </span>
            </div>

            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {(stats?.classification_stats.breakdown_by_class || []).map((item) => (
                <div key={item.code} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-200">
                      {item.name} <span className="text-slate-500 font-mono">({item.code})</span>
                    </span>
                    <span className="text-slate-400 font-mono">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(item.percentage, item.count > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. SEARCHABLE & PAGINATED REGISTERED USERS TABLE */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                User Management & Visibility
              </h2>
              <p className="text-slate-400 text-xs">
                Audit registered users, sign-in activity, and classification counts
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-800/90 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 w-48 sm:w-56"
                />
              </div>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="py-1.5 px-3 rounded-xl bg-slate-800/90 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="">All Roles</option>
                <option value="user">Normal Users</option>
                <option value="admin">Administrators</option>
              </select>
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4">Last Sign-In</th>
                  <th className="py-3 px-4 text-center">Classifications</th>
                  <th className="py-3 px-4 text-right">Role Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {usersLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto mb-2" />
                      Loading user accounts...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No matching registered users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-white font-bold text-xs">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                u.full_name?.charAt(0) || u.email?.charAt(0) || 'U'
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                {u.full_name}
                                {isSelf && (
                                  <span className="text-[10px] text-cyan-400 px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/20 font-normal">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-400 text-[11px]">{u.email || 'No email record'}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              <ShieldCheck className="w-3 h-3" /> Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              <UserCheck className="w-3 h-3" /> User
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-400">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                        </td>

                        <td className="py-3.5 px-4 text-slate-400">
                          {u.last_sign_in_at ? (
                            <span title={new Date(u.last_sign_in_at).toLocaleString()}>
                              {new Date(u.last_sign_in_at).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-slate-600 italic">Never</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-white/5 font-mono text-cyan-300">
                            {u.classifications_count}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            disabled={updatingUserId === u.id || isSelf}
                            onClick={() => handleRoleToggle(u)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
                              u.role === 'admin'
                                ? 'bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border-white/10 hover:border-red-500/30'
                                : 'bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border-purple-500/40'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                            title={isSelf ? 'Cannot demote self' : undefined}
                          >
                            {updatingUserId === u.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                            ) : u.role === 'admin' ? (
                              'Demote to User'
                            ) : (
                              'Promote to Admin'
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
            <span>
              Showing {users.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, totalUsersCount)} of {totalUsersCount} registered users
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1 || usersLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-slate-800 border border-white/10 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages || usersLoading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-slate-800 border border-white/10 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
