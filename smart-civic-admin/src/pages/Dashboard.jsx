import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ─── Palette ──────────────────────────────────────────────────────────────────
const CAT_COLORS = [
  'var(--accent)', 'var(--blue)', 'var(--green)', 'var(--purple)',
  'var(--teal)', 'var(--orange)', 'var(--red)', 'var(--pink)'
];

const STATUS_META = {
  open: { label: 'Open', color: 'var(--blue)', bg: 'var(--blueBg)', bd: 'var(--blueBd)' },
  in_progress: { label: 'In Progress', color: 'var(--orange)', bg: 'var(--orangeBg)', bd: 'var(--orangeBd)' },
  resolved: { label: 'Resolved', color: 'var(--green)', bg: 'var(--greenBg)', bd: 'var(--greenBd)' },
  rejected: { label: 'Rejected', color: 'var(--red)', bg: 'var(--redBg)', bd: 'var(--redBd)' },
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Ic = ({ d, size = 16, sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
    strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    {[].concat(d).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const ICONS = {
  total: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'],
  open: ['M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01'],
  progress: ['M12 22V12', 'M12 7V2', 'M8 2h8', 'M3 7h18'],
  resolved: ['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'M22 4 12 14.01l-3-3'],
  citizens: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  trend: ['M3 3v18h18', 'M18.7 8l-5.1 5.2-2.8-2.7L7 14.3'],
  pie: ['M21.21 15.89A10 10 0 1 1 8 2.83', 'M22 12A10 10 0 0 0 12 2v10z'],
  category: ['M12 20V10', 'M18 20V4', 'M6 20v-4'],
  recent: ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'],
  check: 'M20 6 9 17l-5-5',
  warn: ['M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'],
};

// ─── Tooltip ─────────────────────────────────────────────────────────────────
const CustomTT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '10px 14px',
      boxShadow: 'var(--shHover)', fontSize: 12,
    }}>
      <p style={{ color: 'var(--text2)', fontWeight: 700, margin: '0 0 6px' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill, flexShrink: 0 }} />
          <span style={{ color: 'var(--text2)' }}>{p.name || p.dataKey}</span>
          <span style={{ fontWeight: 800, color: 'var(--text)', marginLeft: 'auto', paddingLeft: 16 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPI({ iconKey, label, value, color, bg, bd, sub, delay = 0 }) {
  return (
    <div style={{
      background: 'var(--surface)', border: `1.5px solid ${bd || 'var(--border)'}`,
      borderRadius: 18, padding: '22px 24px',
      boxShadow: 'var(--shMd)',
      position: 'relative', overflow: 'hidden',
      animation: `fadeUp .45s ${delay}s cubic-bezier(.16,1,.3,1) both`,
      transition: 'all .2s ease', cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shHover)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shMd)'; e.currentTarget.style.borderColor = `${bd || 'var(--border)'}` }}>
      {/* bg blob */}
      <div style={{
        position: 'absolute', top: -22, right: -22, width: 80, height: 80,
        borderRadius: '50%', background: bg || 'var(--surface2)', opacity: 1,
      }} />
      {/* icon box */}
      <div style={{
        width: 46, height: 46, borderRadius: 13, marginBottom: 16,
        background: bg || 'var(--surface2)', border: `1.5px solid ${bd || 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color || 'var(--text2)', zIndex: 2, position: 'relative'
      }}>
        <Ic d={ICONS[iconKey]} size={20} />
      </div>
      <p style={{ fontFamily: 'Syne', fontSize: 32, fontWeight: 800, color: color || 'var(--text)', lineHeight: 1, margin: 0, position: 'relative', zIndex: 2 }}>{value}</p>
      <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6, fontWeight: 500, position: 'relative', zIndex: 2 }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: color || 'var(--text3)', marginTop: 4, fontWeight: 700, position: 'relative', zIndex: 2 }}>{sub}</p>}
    </div>
  );
}

// ─── Chart Card ───────────────────────────────────────────────────────────────
function Card({ iconKey, title, subtitle, children, right }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1.5px solid var(--border)',
      borderRadius: 18, padding: '22px 24px',
      boxShadow: 'var(--shMd)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'var(--bg)', border: '1px solid var(--borderHl)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text2)',
          }}>
            <Ic d={ICONS[iconKey]} size={16} />
          </div>
          <div>
            <h3 style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: -0.2 }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

// ─── Status dot row ───────────────────────────────────────────────────────────
function StatusDot({ color, label, value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 56, height: 4, borderRadius: 99, background: 'var(--surface2)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .6s ease' }} />
        </div>
        <span style={{ fontWeight: 800, color: 'var(--text)', fontSize: 13, minWidth: 20, textAlign: 'right' }}>{value}</span>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard({ user }) {
  const [issues, setIssues] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const isHOD = user.role === 'hod';

  useEffect(() => {
    const baseRef = collection(db, 'issues');
    const q = (isHOD && user.department)
      ? query(baseRef, where('assignedTo', '==', user.department))
      : baseRef;

    const u1 = onSnapshot(q, s => {
      setIssues(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.warn("Dashboard Issues Error:", err);
      setIssues([]);
      setLoading(false);
    });

    const u2 = onSnapshot(collection(db, 'users'), s => {
      setUsers(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { u1(); u2(); };
  }, [isHOD, user.department]);

  const total = issues.length;
  const open = issues.filter(i => i.status === 'open' || i.status === 'assigned').length;
  const inProg = issues.filter(i => i.status === 'in_progress').length;
  const resolved = issues.filter(i => i.status === 'resolved').length;
  const rejected = issues.filter(i => i.status === 'rejected').length;
  const resRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const citizens = users.filter(u => u.role !== 'admin').length;

  const catMap = {};
  issues.forEach(i => { const c = i.category || 'Other'; catMap[c] = (catMap[c] || 0) + 1; });
  const catData = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

  // Chart hex codes fallback (Recharts needs exact colors, CSS vars do not work natively inside rechart elements without tricks, 
  // but they DO work inside <Cell> fill="var(--color)")
  const pieData = [
    { name: 'New', value: issues.filter(i => i.status === 'open').length, color: 'var(--blue)' },
    { name: 'Assigned', value: issues.filter(i => i.status === 'assigned').length, color: 'var(--accent)' },
    { name: 'In Progress', value: inProg, color: 'var(--orange)' },
    { name: 'Resolved', value: resolved, color: 'var(--green)' },
    { name: 'Rejected', value: rejected, color: 'var(--red)' },
  ].filter(d => d.value > 0);

  const monthMap = {};
  issues.forEach(i => {
    if (!i.createdAt) return;
    const d = i.createdAt.toDate ? i.createdAt.toDate() : new Date(i.createdAt);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[k]) monthMap[k] = { total: 0, resolved: 0 };
    monthMap[k].total++;
    if (i.status === 'resolved') monthMap[k].resolved++;
  });
  const trend = Object.entries(monthMap)
    .sort((a, b) => a[0].localeCompare(b[0])).slice(-8)
    .map(([m, v]) => ({ month: m.slice(5) + '/' + m.slice(2, 4), Total: v.total, Resolved: v.resolved }));

  const recent = [...issues].sort((a, b) => {
    const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
    const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
    return tb - ta;
  }).slice(0, 7);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 340 }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%',
        border: '3px solid var(--border)', borderTopColor: 'var(--accent)',
        animation: 'spin .8s linear infinite',
      }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        animation: 'fadeUp .4s cubic-bezier(.16,1,.3,1) both',
      }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: -0.5 }}>
            {isHOD ? `${user.department} Portal` : 'Dashboard'}
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 5 }}>
            {isHOD ? 'Department Performance Overview' : 'Live overview'} ·{' '}
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 11,
            background: resRate >= 70 ? 'var(--greenBg)' : 'var(--orangeBg)',
            border: `1px solid ${resRate >= 70 ? 'var(--greenBd)' : 'var(--orangeBd)'}`,
            fontSize: 13, fontWeight: 700,
            color: resRate >= 70 ? 'var(--green)' : 'var(--orange)',
          }}>
            <Ic d={resRate >= 70 ? ICONS.check : ICONS.warn} size={14} sw={2.5} />
            {resRate}% Resolved
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 11,
            background: (open + inProg) > 0 ? 'var(--blueBg)' : 'var(--greenBg)',
            border: `1px solid ${(open + inProg) > 0 ? 'var(--blueBd)' : 'var(--greenBd)'}`,
            fontSize: 13, fontWeight: 700,
            color: (open + inProg) > 0 ? 'var(--blue)' : 'var(--green)',
          }}>
            <Ic d={ICONS.file} size={14} />
            {open + inProg} Active
          </div>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
        <KPI delay={0} iconKey="total" label="Dept Complaints" value={total} sub={`${resRate}% resolved`} />
        <KPI delay={0.05} iconKey="open" label="Open / Assigned" value={open} color="var(--blue)" bg="var(--blueBg)" bd="var(--blueBd)" />
        <KPI delay={0.10} iconKey="progress" label="In Progress" value={inProg} color="var(--orange)" bg="var(--orangeBg)" bd="var(--orangeBd)" />
        <KPI delay={0.15} iconKey="resolved" label="Resolved" value={resolved} color="var(--green)" bg="var(--greenBg)" bd="var(--greenBd)" sub={`${rejected} rejected`} />
        {!isHOD && <KPI delay={0.20} iconKey="citizens" label="Citizens" value={citizens} color="var(--purple)" bg="var(--purpleBg)" bd="var(--purpleBd)" />}
      </div>

      {/* ── Row 1: Trend + Pie ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>

        <Card iconKey="trend" title="Complaint Trend" subtitle="Submitted vs resolved — last 8 months"
          right={
            <div style={{ display: 'flex', gap: 16 }}>
              {[['var(--accent)', 'Total'], ['var(--green)', 'Resolved']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text2)' }}>
                  <div style={{ width: 20, height: 3, borderRadius: 2, background: c }} />
                  {l}
                </div>
              ))}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.13} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--green)" stopOpacity={0.13} />
                  <stop offset="95%" stopColor="var(--green)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTT />} />
              <Area type="monotone" dataKey="Total" stroke="var(--accent)" fill="url(#gT)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: 'var(--accent)', strokeWidth: 0 }} />
              <Area type="monotone" dataKey="Resolved" stroke="var(--green)" fill="url(#gR)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: 'var(--green)', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card iconKey="pie" title="Status Split" subtitle="Current distribution">
          {pieData.length === 0
            ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, color: 'var(--text3)', fontSize: 13 }}>No data yet</div>
            : <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%"
                    innerRadius={44} outerRadius={68}
                    paddingAngle={3} dataKey="value" stroke="none">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTT />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 12 }}>
                {pieData.map(d => (
                  <StatusDot key={d.name} color={d.color} label={d.name} value={d.value} total={total} />
                ))}
              </div>
            </>
          }
        </Card>
      </div>

      {/* ── Row 2: Category + Recent ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        <Card iconKey="category" title="Issues by Category" subtitle="Most reported civic issue types">
          {catData.length === 0
            ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: 'var(--text3)', fontSize: 13 }}>No data yet</div>
            : <ResponsiveContainer width="100%" height={230}>
              <BarChart data={catData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--borderHl)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={118}
                  tick={{ fill: 'var(--text2)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTT />} />
                <Bar dataKey="value" radius={[0, 7, 7, 0]}>
                  {catData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          }
        </Card>

        <Card iconKey="recent" title="Recent Complaints" subtitle="Latest 7 submissions">
          {recent.length === 0
            ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: 'var(--text3)', fontSize: 13 }}>No complaints yet</div>
            : recent.map((issue, idx) => {
              const m = STATUS_META[issue.status] || STATUS_META.open;
              const d = issue.createdAt?.toDate ? issue.createdAt.toDate() : null;
              const ds = d ? `${d.getDate()}/${d.getMonth() + 1}` : '—';
              return (
                <div key={issue.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 0',
                  borderBottom: idx < recent.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  {/* Status dot bar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: m.bg, border: `1.5px solid ${m.bd}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: m.color,
                  }}>
                    <Ic d={ICONS[issue.status === 'open' ? 'open' : issue.status === 'resolved' ? 'resolved' : issue.status === 'in_progress' ? 'progress' : 'file']} size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0,
                    }}>{issue.title || 'Untitled'}</p>
                    <p style={{ fontSize: 11, color: 'var(--text3)', margin: '2px 0 0' }}>
                      {issue.category} · Ward {issue.wardNo || '—'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px',
                      borderRadius: 99, background: m.bg, color: m.color,
                      border: `1px solid ${m.bd}`, display: 'block',
                    }}>{m.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, display: 'block' }}>{ds}</span>
                  </div>
                </div>
              );
            })
          }
        </Card>
      </div>

    </div>
  );
}