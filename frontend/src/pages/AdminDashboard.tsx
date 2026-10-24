import { useState, useEffect } from 'react';
import { FloatingNav } from '@/components/FloatingNav';
import { Footer } from '@/components/Footer';
import {
  getAdminUsers,
  updateUserRole,
  getAdminStats,
  type UserAdminItem,
  type AdminStats,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Activity,
  LogIn,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

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

  // Render Activity Timeline Chart (Clean Monochromatic SVG)
  const renderActivityTimeline = () => {
    const points = stats?.classification_stats.classification_activity_over_time || [];

    if (points.length === 0) {
      return (
        <div className="h-44 flex flex-col items-center justify-center text-muted text-xs border border-dashed border-border rounded-sm">
          <Activity className="w-6 h-6 text-muted mb-2" />
          <span className="font-mono">No historical classification activity recorded.</span>
        </div>
      );
    }

    const maxVal = Math.max(...points.map((p) => p.count), 5);
    const chartHeight = 140;
    const chartWidth = 500;
    const stepX = chartWidth / Math.max(points.length - 1, 1);

    const coordinates = points.map((p, idx) => {
      const x = idx * stepX;
      const y = chartHeight - (p.count / maxVal) * (chartHeight - 30) - 15;
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
              <linearGradient id="editorialGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Baseline */}
            <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="var(--border)" strokeWidth="1" />
            {/* Area Fill */}
            <path d={areaD} fill="url(#editorialGradient)" />
            {/* Trend Line */}
            <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Data Points */}
            {coordinates.map((pt, idx) => (
              <g key={idx}>
                <circle cx={pt.x} cy={pt.y} r="3.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
                <title>{`${pt.date}: ${pt.count} classifications`}</title>
              </g>
            ))}
          </svg>
        </div>
        <div className="flex justify-between items-center font-mono text-[11px] text-muted mt-3 px-1 border-t border-border pt-2">
          <span>{points[0]?.date}</span>
          <span className="uppercase tracking-wider">Classification Frequency</span>
          <span>{points[points.length - 1]?.date}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <FloatingNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="section-label">Governance & Operations</span>
              <span className="font-mono text-[10px] uppercase px-2 py-0.5 border border-border rounded-sm bg-bg text-accent font-semibold">
                Admin Console
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif text-text mt-1">
              System Telemetry & Identity Registry
            </h1>
            <p className="text-sm text-muted mt-1">
              Institutional oversight of registered accounts, inference throughput, and access governance.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              loadOverview();
              loadUsersList();
            }}
            disabled={loading || usersLoading}
            className="btn-secondary text-xs self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || usersLoading ? 'animate-spin' : ''}`} />
            <span>Sync Analytics</span>
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-4 rounded-sm bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. KEY SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Registered Users */}
          <div className="p-6 border border-border bg-surface rounded-sm">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="font-mono text-xs uppercase tracking-wider">Registered Users</span>
              <Users className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-semibold text-text">
                {loading ? '…' : stats?.user_stats.total_registered_users ?? 0}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-border font-mono text-[11px] text-muted flex items-center justify-between">
              <span>{stats?.user_stats.admins_count ?? 0} Admins</span>
              <span>{stats?.user_stats.regular_users_count ?? 0} Standard</span>
            </div>
          </div>

          {/* Distinct Users Signed In */}
          <div className="p-6 border border-border bg-surface rounded-sm">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="font-mono text-xs uppercase tracking-wider">Active Cohort</span>
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-semibold text-text">
                {loading ? '…' : stats?.user_stats.distinct_users_signed_in ?? 0}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-border font-mono text-[11px] text-muted">
              Distinct authenticated sessions
            </div>
          </div>

          {/* Total Sign-in Events */}
          <div className="p-6 border border-border bg-surface rounded-sm">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="font-mono text-xs uppercase tracking-wider">Auth Ingress</span>
              <LogIn className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-semibold text-text">
                {loading ? '…' : stats?.user_stats.total_sign_in_events ?? 0}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-border font-mono text-[11px] text-muted">
              Total session tokens issued
            </div>
          </div>

          {/* Completed Classifications */}
          <div className="p-6 border border-border bg-surface rounded-sm">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="font-mono text-xs uppercase tracking-wider">Total Scans</span>
              <Activity className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-semibold text-text">
                {loading ? '…' : stats?.classification_stats.total_classifications ?? 0}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-border font-mono text-[11px] text-muted">
              Across {stats?.classification_stats.distinct_users_classified ?? 0} distinct patients
            </div>
          </div>
        </div>

        {/* 2. ANALYTICS ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Classification Activity Timeline */}
          <div className="p-6 border border-border bg-surface rounded-sm flex flex-col justify-between">
            <div className="border-b border-border pb-3 mb-4">
              <span className="section-label">Temporal Inference Volume</span>
              <h3 className="text-lg font-serif mt-1">Classification Activity Timeline</h3>
            </div>
            {renderActivityTimeline()}
          </div>

          {/* 7 Model Prediction Classes Breakdown */}
          <div className="p-6 border border-border bg-surface rounded-sm">
            <div className="flex items-baseline justify-between border-b border-border pb-3 mb-4">
              <div>
                <span className="section-label">Differential Distribution</span>
                <h3 className="text-lg font-serif mt-1">7-Class Pathological Breakdown</h3>
              </div>
              <span className="font-mono text-xs text-muted">
                N = {stats?.classification_stats.total_classifications ?? 0}
              </span>
            </div>

            <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
              {(stats?.classification_stats.breakdown_by_class || []).map((item) => (
                <div key={item.code} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-text">
                      {item.name} <span className="text-muted font-mono">({item.code})</span>
                    </span>
                    <span className="text-muted font-mono">
                      {item.count} · {item.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-bg h-1.5 rounded-sm overflow-hidden border border-border">
                    <div
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${Math.max(item.percentage, item.count > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. SEARCHABLE & PAGINATED REGISTERED USERS TABLE */}
        <div className="border border-border bg-surface rounded-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6 mb-6">
            <div>
              <span className="section-label">Identity Directory</span>
              <h3 className="text-xl font-serif text-text mt-1">
                Registered User Accounts
              </h3>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Filter by name or email…"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 pr-3 py-1.5 rounded-sm bg-bg border border-border text-text placeholder-muted text-xs focus:outline-none focus:border-accent w-48 sm:w-60"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="py-1.5 px-3 rounded-sm bg-bg border border-border text-text text-xs focus:outline-none focus:border-accent font-mono"
              >
                <option value="">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-muted font-mono uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Access Role</th>
                  <th className="py-2.5 px-3">Enrolled</th>
                  <th className="py-2.5 px-3">Last Ingress</th>
                  <th className="py-2.5 px-3 text-center">Classifications</th>
                  <th className="py-2.5 px-3 text-right">Access Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-sans">
                {usersLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted font-mono">
                      <Loader2 className="w-5 h-5 animate-spin text-accent mx-auto mb-2" />
                      Querying user registry…
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted font-mono">
                      No matching user records located.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-bg/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-sm border border-border bg-bg flex items-center justify-center font-mono font-semibold text-xs text-text">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="Avatar" className="w-full h-full rounded-sm object-cover" />
                              ) : (
                                u.full_name?.charAt(0) || u.email?.charAt(0) || 'U'
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-text flex items-center gap-1.5">
                                {u.full_name || 'Unnamed Subject'}
                                {isSelf && (
                                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded-sm border border-accent/40 bg-accent/10 text-accent">
                                    Current
                                  </span>
                                )}
                              </div>
                              <div className="text-muted font-mono text-[11px]">{u.email || 'No email'}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`font-mono text-[11px] uppercase px-2 py-0.5 border rounded-sm ${
                              u.role === 'admin'
                                ? 'border-accent/40 bg-accent/10 text-accent font-semibold'
                                : 'border-border bg-bg text-muted'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono text-muted text-[11px]">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                        </td>

                        <td className="py-3 px-3 font-mono text-muted text-[11px]">
                          {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="font-mono font-medium px-2 py-0.5 border border-border rounded-sm bg-bg">
                            {u.classifications_count}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            disabled={updatingUserId === u.id || isSelf}
                            onClick={() => handleRoleToggle(u)}
                            className={`btn-secondary text-[11px] py-1 px-2.5 min-h-[30px] ${
                              u.role === 'admin' ? 'hover:text-rose-600 hover:border-rose-500' : ''
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                            title={isSelf ? 'Cannot demote your own active account' : undefined}
                          >
                            {updatingUserId === u.id ? (
                              <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                            ) : u.role === 'admin' ? (
                              'Revoke Admin'
                            ) : (
                              'Grant Admin'
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

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border pt-4 mt-4 font-mono text-xs text-muted">
            <span>
              Showing {users.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, totalUsersCount)} of {totalUsersCount} records
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1 || usersLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-sm border border-border hover:bg-bg disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages || usersLoading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-sm border border-border hover:bg-bg disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
