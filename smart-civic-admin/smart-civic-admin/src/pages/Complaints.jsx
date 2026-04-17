import { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
  collection, onSnapshot, doc,
  updateDoc, arrayUnion, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// ─── Constants ────────────────────────────────────────────────────────────────
export const STATUS = {
  open: { label: 'Open', color: 'var(--blue)', bg: 'var(--blueBg)', bd: 'var(--blueBd)' },
  in_progress: { label: 'In Progress', color: 'var(--orange)', bg: 'var(--orangeBg)', bd: 'var(--orangeBd)' },
  resolved: { label: 'Resolved', color: 'var(--green)', bg: 'var(--greenBg)', bd: 'var(--greenBd)' },
  rejected: { label: 'Rejected', color: 'var(--red)', bg: 'var(--redBg)', bd: 'var(--redBd)' },
};
export const PRIORITY = {
  urgent: { label: 'Urgent', color: 'var(--red)', bg: 'var(--redBg)', bd: 'var(--redBd)' },
  high: { label: 'High', color: 'var(--orange)', bg: 'var(--orangeBg)', bd: 'var(--orangeBd)' },
  normal: { label: 'Normal', color: 'var(--green)', bg: 'var(--greenBg)', bd: 'var(--greenBd)' },
};
export const DEPTS = [
  'Road Department', 'Electric Department', 'Sanitation Department',
  'Water Supply', 'Traffic Control', 'Tree Authority', 'General Administration',
];
export const STEPS = [
  { key: 'Reported', label: 'Reported' },
  { key: 'Assigned', label: 'Assigned' },
  { key: 'In Progress', label: 'In Progress' },
  { key: 'Resolved', label: 'Resolved' },
];

// ─── Tiny SVG icon ─────────────────────────────────────────────────────────────
export const Ic = memo(({ d, size = 14, sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
    strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    {[].concat(d).map((p, i) => <path key={i} d={p} />)}
  </svg>
));

export const ICONS = {
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.35-4.35',
  close: 'M18 6 6 18M6 6l12 12',
  sort: ['M3 6h18', 'M7 12h10', 'M11 18h2'],
  view: ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6'],
  check: 'M20 6 9 17l-5-5',
  tag: ['M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z', 'M7 7h.01'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'],
  loc: ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z', 'M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8'],
  cal: ['M8 2v4', 'M16 2v4', 'M3 8h18', 'M4 4h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'],
  note: ['M12 20h9', 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z'],
  map: ['M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4', 'M8 2v16', 'M16 6v16'],
  img: ['M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z', 'M12 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8'],
  assign: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'M20 8v6', 'M23 11h-6'],
  chevR: 'M9 18l6-6-6-6',
  info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 8v4', 'M12 16h.01'],
  flag: ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', 'M4 22v-7'],
};

// ─── Badges ────────────────────────────────────────────────────────────────────
export const SBadge = memo(({ status }) => {
  const s = STATUS[status] || Object.values(STATUS)[0];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
      color: s.color, background: s.bg, border: `1px solid ${s.bd}`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
});

export const PBadge = memo(({ priority }) => {
  if (!priority) return <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>;
  const p = PRIORITY[priority] || Object.values(PRIORITY)[2];
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
      color: p.color, background: p.bg, border: `1px solid ${p.bd}`,
      textTransform: 'capitalize',
    }}>{p.label}</span>
  );
});

import ViewComplaint from '../components/ViewComplaint';

// ─── Complaints page ───────────────────────────────────────────────────────────
export default function Complaints() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'issues'), snap => {
      setIssues(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const fmtDate = useCallback(ts => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }, []);

  const sorted = [...issues].sort((a, b) => {
    const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
    const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
    return sortBy === 'oldest' ? ta - tb : tb - ta;
  });

  const filtered = sorted.filter(i => {
    const q = search.toLowerCase();
    const ms = !q
      || (i.title || '').toLowerCase().includes(q)
      || (i.trackId || '').toLowerCase().includes(q)
      || (i.userName || '').toLowerCase().includes(q)
      || (i.category || '').toLowerCase().includes(q)
      || String(i.wardNo || '').includes(q);
    return ms && (filter === 'all' || i.status === filter);
  });

  const counts = {
    all: issues.length,
    open: issues.filter(i => i.status === 'open').length,
    in_progress: issues.filter(i => i.status === 'in_progress').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
    rejected: issues.filter(i => i.status === 'rejected').length,
  };

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'open', label: 'Open' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'resolved', label: 'Resolved' },
    { id: 'rejected', label: 'Rejected' },
  ];

  const handleOpen = useCallback(issue => setSel(issue), []);
  const handleClose = useCallback(() => setSel(null), []);

  if (sel) {
    return <ViewComplaint issue={sel} onClose={handleClose} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        animation: 'fadeUp .4s cubic-bezier(.16,1,.3,1) both',
      }}>
        <div>
          <h1 style={{
            fontFamily: 'Syne', fontSize: 28, fontWeight: 800,
            color: 'var(--text)', margin: 0, letterSpacing: -0.5
          }}>Complaints</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 5 }}>
            Real-time · {issues.length} total
          </p>
        </div>
        {counts.open > 0 ? (
          <div style={{
            padding: '8px 16px', borderRadius: 10,
            background: 'var(--orangeBg)', border: '1px solid var(--orangeBd)',
            fontSize: 13, fontWeight: 700, color: 'var(--orange)',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--orange)', animation: 'pulse 1.8s ease infinite' }} />
            {counts.open} Open
          </div>
        ) : (
          <div style={{
            padding: '8px 16px', borderRadius: 10,
            background: 'var(--greenBg)', border: '1px solid var(--greenBd)',
            fontSize: 13, fontWeight: 700, color: 'var(--green)',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <Ic d={ICONS.check} size={14} sw={2.5} />
            All Clear
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{
        background: 'var(--surface)', borderRadius: 16,
        border: '1.5px solid var(--border)',
        padding: '12px 16px',
        boxShadow: 'var(--sh)',
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
        animation: 'fadeUp .4s .05s cubic-bezier(.16,1,.3,1) both',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 11, padding: 3, gap: 2 }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '6px 13px', borderRadius: 9, border: 'none',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: filter === f.id ? 'var(--surface)' : 'transparent',
              color: filter === f.id ? 'var(--accent)' : 'var(--text2)',
              boxShadow: filter === f.id ? 'var(--sh)' : 'none',
              transition: 'all .15s', outline: 'none',
            }}>
              {f.label}
              <span style={{
                marginLeft: 5, fontSize: 10, fontWeight: 800,
                color: filter === f.id ? 'var(--accent)' : 'var(--text3)',
              }}>({counts[f.id]})</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }}>
            <Ic d={ICONS.search} size={14} />
          </span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search title, ID, user, ward..."
            style={{
              width: '100%', padding: '9px 12px 9px 33px',
              background: 'var(--surface2)', border: '1.5px solid var(--border)',
              borderRadius: 10, color: 'var(--text)', fontSize: 13, outline: 'none',
              transition: 'border .2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Sort */}
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none',
          }}>
            <Ic d={ICONS.sort} size={13} />
          </span>
          <select
            value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{
              padding: '9px 12px 9px 30px',
              background: 'var(--surface2)', border: '1.5px solid var(--border)',
              borderRadius: 10, color: 'var(--text)', fontSize: 12,
              cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: 80, background: 'var(--surface)', borderRadius: 18,
          border: '1.5px solid var(--border)',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '3px solid var(--border)', borderTopColor: 'var(--accent)',
            animation: 'spin .8s linear infinite',
          }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '70px 20px',
          background: 'var(--surface)', borderRadius: 18, border: '1.5px solid var(--border)',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--surface2)', border: '1.5px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', color: 'var(--text3)',
          }}>
            <Ic d={ICONS.file} size={22} />
          </div>
          <p style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            No complaints found
          </p>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 5 }}>
            Try adjusting your search or filter
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--surface)', borderRadius: 18,
          border: '1.5px solid var(--border)', overflow: 'hidden',
          boxShadow: 'var(--sh)',
          animation: 'fadeUp .4s .1s cubic-bezier(.16,1,.3,1) both',
        }}>
          {/* Head */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2.4fr 1fr 0.65fr 1fr 0.75fr 0.65fr 72px',
            padding: '10px 20px',
            background: 'var(--surface2)',
            borderBottom: '1.5px solid var(--border)',
            fontSize: 9, fontWeight: 900, color: 'var(--text3)',
            letterSpacing: 1.4, textTransform: 'uppercase',
          }}>
            {['Complaint', 'Category', 'Ward', 'Status', 'Priority', 'Date', ''].map((h, i) => (
              <span key={i}>{h}</span>
            ))}
          </div>

          {/* Rows — virtualise by only re-rendering changes */}
          {filtered.map((issue, idx) => (
            <div
              key={issue.id}
              onClick={() => handleOpen(issue)}
              style={{
                display: 'grid',
                gridTemplateColumns: '2.4fr 1fr 0.65fr 1fr 0.75fr 0.65fr 72px',
                padding: '12px 20px', alignItems: 'center',
                borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', transition: 'background .1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', margin: 0,
                }}>{issue.title || 'Untitled'}</p>
                <p style={{ fontSize: 11, color: 'var(--text3)', margin: '3px 0 0' }}>
                  #{issue.trackId || issue.id?.slice(0, 8)} · {issue.userName || '—'}
                </p>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{issue.category || '—'}</span>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{issue.wardNo ? `W${issue.wardNo}` : '—'}</span>
              <SBadge status={issue.status || 'open'} />
              <PBadge priority={issue.priority} />
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDate(issue.createdAt)}</span>
              <button
                onClick={e => { e.stopPropagation(); handleOpen(issue); }}
                style={{
                  padding: '5px 12px', borderRadius: 8,
                  background: 'var(--accentBg)', border: '1.5px solid var(--accentBd)',
                  color: 'var(--accent)', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', outline: 'none',
                  display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'all .15s', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 0.8}
                onMouseLeave={e => e.currentTarget.style.opacity = 1}
              >
                <Ic d={ICONS.view} size={12} />
                View
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scaleUp { from{opacity:0;transform:scale(0.97) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>
    </div>
  );
}