import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { STATUS, PRIORITY, DEPTS, STEPS, Ic, ICONS, SBadge, PBadge } from '../pages/Complaints';

// ─── Lazy image with fallback ──────────────────────────────────────────────────
const LazyImage = memo(({ src }) => {
  const [state, setState] = useState('loading'); // loading | ok | error

  useEffect(() => {
    setState('loading');
  }, [src]);

  if (!src || typeof src !== 'string' || !src.startsWith('http')) return null;

  return (
    <div style={{
      borderRadius: 12, overflow: 'hidden',
      border: '1.5px solid var(--border)',
      background: 'var(--surface2)',
      position: 'relative', minHeight: state === 'error' ? 0 : 100,
      cursor: state === 'ok' ? 'zoom-in' : 'default',
    }}
    onClick={() => state === 'ok' && window.open(src, '_blank')}
    >
      {state === 'loading' && (
        <div style={{
          height: 80, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            border: '2.5px solid var(--border)',
            borderTopColor: 'var(--accent)',
            animation: 'spin .7s linear infinite',
          }}/>
        </div>
      )}
      {state === 'error' && (
        <div style={{
          padding: '18px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--surface2)',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'var(--yellowBg)', border: '1px solid var(--yellowBd)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, color: 'var(--yellow)',
          }}>
            <Ic d={ICONS.img} size={16}/>
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              Image could not be loaded
            </p>
            <p style={{ fontSize: 11, color: 'var(--text3)', margin: '2px 0 0' }}>
              The file might be private, deleted, or the URL is invalid.{' '}
              <a href={src} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent)', fontWeight: 600 }}>
                Open link directly →
              </a>
            </p>
          </div>
        </div>
      )}
      <img
        src={src}
        alt="complaint"
        loading="lazy"
        onLoad={() => setState('ok')}
        onError={() => setState('error')}
        style={{
          width: '100%', maxHeight: 400, // Increased for better visibility
          objectFit: 'cover', display: 'block',
          opacity: state === 'ok' ? 1 : 0,
          transition: 'opacity .3s ease',
        }}
      />
      {state === 'ok' && (
        <div style={{
          position: 'absolute', bottom: 10, right: 10,
          background: 'rgba(0,0,0,0.6)', color: '#fff',
          padding: '4px 8px', borderRadius: 6, fontSize: 10,
          fontWeight: 700, pointerEvents: 'none',
          backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)',
        }}>
          Click to Enlarge
        </div>
      )}
    </div>
  );
});

// ─── Map preview via OSM iframe ────────────────────────────────────────────────
const MapPreview = memo(({ lat, lng }) => {
  const latN = Number(lat);
  const lngN = Number(lng);
  if (!lat || !lng || isNaN(latN) || isNaN(lngN)) return null;

  const bbox = `${lngN-0.005},${latN-0.005},${lngN+0.005},${latN+0.005}`;
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latN},${lngN}`;
  const fullUrl = `https://www.openstreetmap.org/?mlat=${latN}&mlon=${lngN}#map=17/${latN}/${lngN}`;

  return (
    <div style={{
      borderRadius: 12, overflow: 'hidden',
      border: '1.5px solid var(--border)',
    }}>
      <div style={{
        padding: '8px 12px',
        background: 'var(--surface2)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 7,
        fontSize: 11, fontWeight: 700, color: 'var(--text2)',
      }}>
        <Ic d={ICONS.map} size={13}/>
        Location Map
        <a href={fullUrl} target="_blank" rel="noopener noreferrer"
          style={{
            marginLeft: 'auto', fontSize: 10,
            color: 'var(--accent)', fontWeight: 600,
            textDecoration: 'none',
          }}>
          Open full map →
        </a>
      </div>
      <iframe
        title="Issue location"
        src={osmUrl}
        width="100%" height="180"
        style={{ border: 'none', display: 'block' }}
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
      />
      <div style={{
        padding: '6px 12px',
        background: 'var(--surface2)',
        borderTop: '1px solid var(--border)',
        fontSize: 10, color: 'var(--text3)',
        fontFamily: 'monospace',
      }}>
        {latN.toFixed(6)}, {lngN.toFixed(6)}
      </div>
    </div>
  );
});

// ─── Section card ──────────────────────────────────────────────────────────────
const Section = memo(({ label, children }) => (
  <div style={{
    background: 'var(--surface2)',
    borderRadius: 14,
    border: '1px solid var(--border)',
    overflow: 'hidden',
  }}>
    <div style={{
      padding: '9px 14px 8px',
      borderBottom: '1px solid var(--border)',
    }}>
      <p style={{
        fontSize: 9, fontWeight: 900,
        letterSpacing: 1.6, color: 'var(--text3)',
        textTransform: 'uppercase', margin: 0,
      }}>{label}</p>
    </div>
    <div style={{ padding: '14px' }}>{children}</div>
  </div>
));

// ─── Detail row ────────────────────────────────────────────────────────────────
const DetailRow = memo(({ label, value }) => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
    <span style={{
      fontSize: 10, color: 'var(--text3)',
      minWidth: 82, flexShrink: 0, paddingTop: 1,
      letterSpacing: 0.2,
    }}>{label}</span>
    <span style={{
      fontSize: 12, color: 'var(--text)',
      fontWeight: 500, lineHeight: 1.55,
      wordBreak: 'break-word',
    }}>{value || '—'}</span>
  </div>
));

// ─── Action button ─────────────────────────────────────────────────────────────
const ActBtn = memo(({ label, color, bg, bd, active, disabled, onClick }) => (
  <button
    disabled={disabled || active}
    onClick={onClick}
    style={{
      padding: '12px 14px', borderRadius: 12, width: '100%',
      background: active ? bg : 'var(--surface)',
      border: `1.5px solid ${active ? bd : 'var(--border)'}`,
      color: active ? color : 'var(--text2)',
      fontWeight: active ? 800 : 600,
      fontSize: 13,
      cursor: active ? 'default' : 'pointer',
      opacity: active ? 0.65 : 1,
      transition: 'all .2s cubic-bezier(.4,0,.2,1)',
      outline: 'none', textAlign: 'left',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: active ? `0 4px 12px ${bg}22` : 'none',
    }}
    onMouseEnter={e => {
      if (!active && !disabled) {
        e.currentTarget.style.borderColor = bd;
        e.currentTarget.style.color = color;
        e.currentTarget.style.background = bg;
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = `0 4px 12px ${bg}22`;
      }
    }}
    onMouseLeave={e => {
      if (!active && !disabled) {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.color = 'var(--text2)';
        e.currentTarget.style.background = 'var(--surface)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }
    }}
  >{label}</button>
));

// ─── Premium Button (For Main Actions) ──────────────────────────────────────────
const PremiumBtn = memo(({ label, icon, onClick, disabled, loading, color = 'var(--accent)', bg = 'var(--accentBg)', bd = 'var(--accentBd)' }) => (
  <button
    disabled={disabled || loading}
    onClick={onClick}
    style={{
      width: '100%', padding: '15px 18px', borderRadius: 14,
      background: bg, border: `1.5px solid ${bd}`,
      color: color, fontWeight: 800, fontSize: 14,
      cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
      transition: 'all .25s cubic-bezier(.16,1,.3,1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      boxShadow: `0 4px 14px ${bg}`,
      outline: 'none',
    }}
    onMouseEnter={e => {
      if (!disabled && !loading) {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
        e.currentTarget.style.boxShadow = `0 8px 20px ${bg}`;
        e.currentTarget.style.filter = 'brightness(1.05)';
      }
    }}
    onMouseLeave={e => {
      if (!disabled && !loading) {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = `0 4px 14px ${bg}`;
        e.currentTarget.style.filter = 'none';
      }
    }}
    onMouseDown={e => { if (!disabled && !loading) e.currentTarget.style.transform = 'translateY(0) scale(0.98)'; }}
    onMouseUp={e => { if (!disabled && !loading) e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)'; }}
  >
    <Ic d={loading ? ICONS.cal : icon} size={18} sw={2.5} className={loading ? 'spin' : ''}/>
    {loading ? 'Processing...' : label}
  </button>
));

// ─── ViewComplaint ─────────────────────────────────────────────────────────────
export default memo(function ViewComplaint({ issue, user, onClose }) {
  const [note,   setNote]   = useState('');
  const [dept,   setDept]   = useState(issue.assignedTo || '');
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState({ msg: '', type: 'ok' });
  const timer = useRef(null);

  const isHOD = user.role === 'hod';
  const isSuper = user.role === 'super_admin' || user.role === 'admin';

  // Stable toast
  const showToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast({ msg: '', type: 'ok' }), 2800);
  }, []);

  // Escape key
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => { window.removeEventListener('keydown', h); clearTimeout(timer.current); };
  }, [onClose]);

  // Sync dept state with live prop
  useEffect(() => {
    if (issue.assignedTo) setDept(issue.assignedTo);
  }, [issue.assignedTo]);

  const fmt = useCallback(ts => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }, []);

  const run = useCallback(async fn => {
    setSaving(true);
    try { await fn(); }
    catch (e) { showToast('Error: ' + e.message, 'error'); }
    setSaving(false);
  }, [showToast]);

  const updateStatus = useCallback((s, extra = {}, timelineStep = null) => run(async () => {
    const payload = {
      status: s,
      updatedAt: serverTimestamp(),
      timeline: arrayUnion({
        step: timelineStep || STATUS[s]?.label || s,
        time: new Date().toISOString(),
        by: user.name || user.role,
      }),
      ...extra,
    };
    await updateDoc(doc(db, 'issues', issue.id), payload);
    showToast(`Status → "${STATUS[s]?.label || s}"`);
  }), [issue.id, run, showToast, user.name, user.role]);

  const setPrio = useCallback(p => run(async () => {
    await updateDoc(doc(db, 'issues', issue.id), {
      priority: p, updatedAt: serverTimestamp(),
    });
    showToast(`Priority → "${p}"`);
  }), [issue.id, run, showToast]);

  const saveNote = useCallback(() => run(async () => {
    if (!note.trim()) return;
    await updateDoc(doc(db, 'issues', issue.id), {
      comments: arrayUnion({
        text: note.trim(), by: 'admin',
        time: new Date().toISOString(),
      }),
      updatedAt: serverTimestamp(),
    });
    setNote('');
    showToast('Note saved');
  }), [issue.id, note, run, showToast]);

  const sc  = STATUS[issue.status] || STATUS.open;
  const tl  = issue.timeline || [];
  const cm  = issue.comments || [];

  const stepDone = useCallback(key => {
    if (key === 'Reported')    return true;
    if (key === 'Forwarded')   return !!issue.assignedTo;
    if (key === 'Assigned')    return !!tl.find(t => t.step === 'Assigned') || ['in_progress','resolved','rejected'].includes(issue.status);
    if (key === 'In Progress') return ['resolved','rejected'].includes(issue.status);
    if (key === 'Resolved')    return issue.status === 'resolved';
    return false;
  }, [issue.status, issue.assignedTo, tl]);

  const stepActive = useCallback(key =>
    (key === 'Reported'    && issue.status === 'open') ||
    ((key === 'Assigned'   || key === 'In Progress') && issue.status === 'in_progress') ||
    (key === 'Resolved'    && issue.status === 'resolved'),
  [issue.status]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 16,
      animation: 'fadeUp .3s cubic-bezier(.16,1,.3,1) both',
    }}>

      {/* Back button + breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onClose} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 10,
          border: '1.5px solid var(--border)',
          background: 'var(--surface2)',
          color: 'var(--text2)', fontSize: 13,
          fontWeight: 700, cursor: 'pointer', outline: 'none',
          transition: 'all .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background='var(--surface)'; e.currentTarget.style.color='var(--text)'; }}
        onMouseLeave={e => { e.currentTarget.style.background='var(--surface2)'; e.currentTarget.style.color='var(--text2)'; }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            strokeLinejoin="round" style={{ display: 'block' }}>
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Back
        </button>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
          Complaints → {issue.title || 'Untitled'}
        </span>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: 22,
        border: '1.5px solid var(--border)',
        overflow: 'hidden',
        boxShadow: 'var(--sh)',
      }}>
        {/* Status stripe */}
        <div style={{
          height: 5,
          background: `linear-gradient(90deg, ${sc.color}, ${sc.color}44)`,
        }}/>

        {/* Header */}
        <div style={{
          padding: '20px 26px 18px',
          borderBottom: '1.5px solid var(--border)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: 10, flexWrap: 'wrap', marginBottom: 8,
          }}>
            <h2 style={{
              fontFamily: 'Syne', fontSize: 20, fontWeight: 800,
              color: 'var(--text)', margin: 0, letterSpacing: -0.3,
            }}>{issue.title || 'Untitled Complaint'}</h2>
            <SBadge status={issue.status}/>
            {issue.priority && <PBadge priority={issue.priority}/>}
          </div>
          <div style={{
            display: 'flex', gap: 18, flexWrap: 'wrap',
            fontSize: 12, color: 'var(--text2)',
          }}>
            {[
              [ICONS.tag,  issue.trackId || issue.id?.slice(0,10)],
              [ICONS.file, issue.category || '—'],
              [ICONS.loc,  `Ward ${issue.wardNo || '—'}`],
              [ICONS.user, issue.userName  || '—'],
              [ICONS.cal,  fmt(issue.createdAt)],
            ].map(([ic, val], i) => (
              <span key={i} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ color: 'var(--text3)' }}><Ic d={ic} size={13}/></span>
                {val}
              </span>
            ))}
          </div>
        </div>

        {/* Toast */}
        {toast.msg && (
          <div style={{
            margin: '12px 26px 0',
            padding: '10px 14px',
            background: toast.type === 'error' ? 'var(--redBg)' : 'var(--greenBg)',
            border: `1px solid ${toast.type === 'error' ? 'var(--redBd)' : 'var(--greenBd)'}`,
            borderRadius: 10, fontSize: 12,
            color: toast.type === 'error' ? 'var(--red)' : 'var(--green)',
            fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Ic d={toast.type === 'error' ? ICONS.info : ICONS.check} size={14} sw={2.5}/>
            {toast.msg}
          </div>
        )}

        {/* 3-column body */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 1.1fr 280px',
        }}>

          {/* ── Column 1: Image + Map + Details ── */}
          <div style={{
            padding: '22px 22px',
            borderRight: '1.5px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: 14,
            overflowY: 'auto', maxHeight: '78vh',
          }}>
            <LazyImage src={issue.imageUrl}/>
            <MapPreview lat={issue.latitude} lng={issue.longitude}/>

            <Section label="Complaint Details">
              <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                <DetailRow label="Description" value={issue.description}/>
                <DetailRow label="Reported by" value={issue.userName}/>
                <DetailRow label="Email"        value={issue.userEmail}/>
                <DetailRow label="Ward"         value={issue.wardNo ? `Ward ${issue.wardNo}` : '—'}/>
                <DetailRow label="Assigned to"  value={issue.assignedTo || 'Not assigned'}/>
                {issue.latitude && (
                  <DetailRow label="GPS"
                    value={`${Number(issue.latitude).toFixed(6)}, ${Number(issue.longitude).toFixed(6)}`}/>
                )}
              </div>
            </Section>
          </div>

          {/* ── Column 2: Timeline + Assign + Notes ── */}
          <div style={{
            padding: '22px 22px',
            borderRight: '1.5px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: 14,
            overflowY: 'auto', maxHeight: '78vh',
          }}>
            {/* Timeline */}
            <Section label="Workflow Timeline">
              {STEPS.map((step, i) => {
                const done   = stepDone(step.key);
                const active = stepActive(step.key);
                const tItem  = tl.find(t => t.step === step.key);
                return (
                  <div key={step.key} style={{ display:'flex', gap:12 }}>
                    <div style={{
                      display:'flex', flexDirection:'column', alignItems:'center',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: done ? 'var(--green)' : active ? 'var(--orange)' : 'var(--surface2)',
                        border: `2px solid ${done ? 'var(--green)' : active ? 'var(--orange)' : 'var(--border2)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: done || active ? '#fff' : 'var(--text3)',
                        fontWeight: 800, fontSize: 11,
                        boxShadow: done || active ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                      }}>
                        {done
                          ? <Ic d={ICONS.check} size={13} sw={2.8}/>
                          : active
                            ? <Ic d={ICONS.chevR} size={13} sw={2.5}/>
                            : <span>{i + 1}</span>
                        }
                      </div>
                      {i < STEPS.length - 1 && (
                        <div style={{
                          width: 2, flexGrow: 1, minHeight: 20,
                          background: done ? 'var(--green)' : 'var(--border2)',
                          opacity: done ? 0.5 : 1, margin: '3px 0',
                        }}/>
                      )}
                    </div>
                    <div style={{
                      paddingTop: 6,
                      paddingBottom: i < STEPS.length - 1 ? 16 : 0,
                    }}>
                      <p style={{
                        fontSize: 13, fontWeight: 700, margin: 0,
                        color: done ? 'var(--green)' : active ? 'var(--orange)' : 'var(--text3)',
                      }}>{step.label}</p>
                      {tItem && (
                        <p style={{ fontSize: 10, color: 'var(--text3)', margin: '2px 0 0' }}>
                          {new Date(tItem.time).toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </Section>

            {/* Assign / Forward */}
            <Section label={isHOD ? "Assigned Department" : "Forward to Department"}>
              {isHOD ? (
                <div style={{
                  padding: '12px', background: 'var(--accentBg)',
                  border: '1px solid var(--accentBd)', borderRadius: 10,
                  display: 'flex', alignItems: 'center', gap: 10,
                  color: 'var(--accent)', fontWeight: 700, fontSize: 13,
                }}>
                  <Ic d={ICONS.check} size={14} sw={3} />
                  {issue.assignedTo || 'Unassigned'}
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <select value={dept} onChange={e => setDept(e.target.value)} style={{
                      width: '100%', padding: '12px 15px',
                      background: 'var(--surface)',
                      border: '2px solid var(--border)',
                      borderRadius: 12, color: 'var(--text)', fontSize: 14,
                      fontWeight: 600, outline: 'none', cursor: 'pointer',
                      transition: 'border-color .2s',
                    }}
                    onFocus={e => e.target.style.borderColor='var(--accent)'}
                    onBlur={e  => e.target.style.borderColor='var(--border)'}>
                      <option value="">Choose department...</option>
                      {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <PremiumBtn
                      label={saving ? 'Assigning...' : 'Assign to Department'}
                      icon={ICONS.assign}
                      disabled={!dept}
                      loading={saving}
                      bg="var(--blue)"
                      bd="var(--blueBd)"
                      color="#fff"
                      onClick={() => { if (dept) updateStatus('assigned', { assignedTo: dept }, 'Sent to Department'); }}
                    />
                  </div>
                </>
              )}
            </Section>

             {/* HOD Quick Actions */}
            {isHOD && issue.assignedTo === user.department && !tl.find(t => t.step === 'Assigned') && (
               <Section label="Immediate Actions">
                 <PremiumBtn
                    label={saving ? 'Processing...' : 'Acknowledge & Accept Complaint'}
                    icon={ICONS.check}
                    loading={saving}
                    bg="var(--green)"
                    bd="var(--greenBd)"
                    color="#fff"
                    onClick={() => updateStatus('in_progress', {}, 'Assigned')}
                  />
               </Section>
            )}

            {/* Notes */}
            <Section label={`Admin Notes${cm.length ? ` (${cm.length})` : ''}`}>
              {cm.length > 0 && (
                <div style={{
                  maxHeight: 120, overflowY: 'auto', marginBottom: 10,
                }}>
                  {cm.map((c, i) => (
                    <div key={i} style={{
                      background: 'var(--surface)', borderRadius: 9,
                      padding: '8px 11px', marginBottom: 6,
                      border: '1px solid var(--border)',
                    }}>
                      <p style={{
                        fontSize: 12, color: 'var(--text)',
                        margin: 0, lineHeight: 1.5,
                      }}>{c.text}</p>
                      <p style={{ fontSize: 10, color: 'var(--text3)', margin: '3px 0 0' }}>
                        {c.by} · {c.time
                          ? new Date(c.time).toLocaleDateString('en-IN')
                          : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Write a note..."
                rows={3}
                style={{
                  width: '100%', padding: '9px 12px',
                  background: 'var(--surface)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 9, color: 'var(--text)',
                  fontSize: 12, resize: 'vertical',
                  marginBottom: 8, outline: 'none', lineHeight: 1.5,
                }}
                onFocus={e => e.target.style.borderColor='var(--accent)'}
                onBlur={e  => e.target.style.borderColor='var(--border)'}
              />
              <button
                disabled={!note.trim() || saving}
                onClick={saveNote}
                style={{
                  width: '100%', padding: '9px', borderRadius: 9,
                  background: note.trim() ? 'var(--accentBg)' : 'var(--surface)',
                  border: `1.5px solid ${note.trim() ? 'var(--orangeBd)' : 'var(--border)'}`,
                  color: note.trim() ? 'var(--accent)' : 'var(--text3)',
                  fontWeight: 600, fontSize: 12,
                  cursor: note.trim() ? 'pointer' : 'not-allowed',
                  outline: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}
              >
                <Ic d={ICONS.note} size={13}/>
                Save Note
              </button>
            </Section>
          </div>

          {/* ── Column 3: Actions ── */}
          <div style={{
            padding: '22px 20px',
            display: 'flex', flexDirection: 'column', gap: 14,
            background: 'var(--surface2)',
            overflowY: 'auto', maxHeight: '78vh',
          }}>
            <Section label="Update Status">
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {[
                  { s:'in_progress', label:'In Progress', ...STATUS.in_progress },
                  { s:'resolved',    label:'Resolved',    ...STATUS.resolved    },
                  { s:'rejected',    label:'Reject',      ...STATUS.rejected    },
                  { s:'open',        label:'Reopen',      ...STATUS.open        },
                ].map(a => (
                  <ActBtn
                    key={a.s}
                    label={a.label}
                    color={a.color} bg={a.bg} bd={a.bd}
                    active={issue.status === a.s}
                    disabled={saving}
                    onClick={() => updateStatus(a.s)}
                  />
                ))}
              </div>
            </Section>

            <Section label="Priority Level">
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {Object.entries(PRIORITY).map(([key, p]) => (
                  <ActBtn
                    key={key}
                    label={p.label}
                    color={p.color} bg={p.bg} bd={p.bd}
                    active={issue.priority === key}
                    disabled={saving}
                    onClick={() => setPrio(key)}
                  />
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
});