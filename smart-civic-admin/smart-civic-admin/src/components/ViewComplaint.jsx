import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { STATUS, PRIORITY, DEPTS, STEPS, Ic, ICONS, SBadge, PBadge } from '../pages/Complaints';

// ─── Image with lazy load + error handling ─────────────────────────────────────
const LazyImage = memo(({ src, alt }) => {
    const [status, setStatus] = useState('loading'); // loading | ok | error

    if (!src) return null;

    return (
        <div style={{
            borderRadius: 12, overflow: 'hidden',
            border: '1.5px solid var(--border)', flexShrink: 0,
            background: 'var(--surface2)', position: 'relative',
        }}>
            {status === 'loading' && (
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--surface2)',
                }}>
                    <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)',
                        animation: 'spin .7s linear infinite',
                    }} />
                </div>
            )}
            {status === 'error' && (
                <div style={{
                    height: 120, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text3)',
                }}>
                    <Ic d={ICONS.img} size={28} />
                    <span style={{ fontSize: 12 }}>Image unavailable</span>
                </div>
            )}
            <img
                src={src} alt={alt || 'complaint'}
                loading="lazy"
                onLoad={() => setStatus('ok')}
                onError={() => setStatus('error')}
                style={{
                    width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block',
                    opacity: status === 'ok' ? 1 : 0,
                    transition: 'opacity .3s ease',
                }}
            />
        </div>
    );
});

// ─── Map preview ───────────────────────────────────────────────────────────────
const MapPreview = memo(({ lat, lng }) => {
    if (!lat || !lng) return null;
    const latN = Number(lat);
    const lngN = Number(lng);
    if (isNaN(latN) || isNaN(lngN)) return null;

    const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lngN - 0.005},${latN - 0.005},${lngN + 0.005},${latN + 0.005}&layer=mapnik&marker=${latN},${lngN}`;

    return (
        <div style={{
            borderRadius: 12, overflow: 'hidden',
            border: '1.5px solid var(--border)', flexShrink: 0,
            display: 'flex', flexDirection: 'column',
        }}>
            <div style={{
                padding: '8px 12px', background: 'var(--surface2)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 7,
                fontSize: 11, fontWeight: 700, color: 'var(--text2)',
            }}>
                <Ic d={ICONS.map} size={13} />
                Location Map
                <a
                    href={`https://www.openstreetmap.org/?mlat=${latN}&mlon=${lngN}#map=17/${latN}/${lngN}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                        marginLeft: 'auto', fontSize: 10, color: 'var(--accent)',
                        fontWeight: 600, textDecoration: 'none',
                    }}
                >Open full map →</a>
            </div>
            <div style={{ position: 'relative', flex: 1 }}>
                <iframe
                    title="Issue location"
                    src={osmUrl}
                    width="100%"
                    height="180"
                    style={{ border: 'none', display: 'block', filter: 'var(--mapFilter)' }}
                    loading="lazy"
                    sandbox="allow-scripts allow-same-origin"
                />
            </div>
            <div style={{
                padding: '7px 12px', background: 'var(--surface2)',
                borderTop: '1px solid var(--border)',
                fontSize: 10, color: 'var(--text3)',
                fontFamily: 'monospace',
            }}>
                {latN.toFixed(5)}, {lngN.toFixed(5)}
            </div>
        </div>
    );
});

// ─── Section wrapper ───────────────────────────────────────────────────────────
const Section = memo(({ label, children }) => (
    <div style={{
        background: 'var(--surface2)', borderRadius: 14,
        border: '1px solid var(--border)', overflow: 'hidden',
    }}>
        <div style={{ padding: '9px 14px 8px', borderBottom: '1px solid var(--border)' }}>
            <p style={{
                fontSize: 9, fontWeight: 900, letterSpacing: 1.6,
                color: 'var(--text3)', textTransform: 'uppercase', margin: 0,
            }}>{label}</p>
        </div>
        <div style={{ padding: '14px' }}>{children}</div>
    </div>
));

export default memo(function ViewComplaint({ issue, onClose }) {
    const [note, setNote] = useState('');
    const [dept, setDept] = useState(issue.assignedTo || '');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const toastTimer = useRef(null);

    const showToast = useCallback((msg) => {
        setToast(msg);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(''), 2800);
    }, []);

    useEffect(() => {
        const h = e => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => { window.removeEventListener('keydown', h); clearTimeout(toastTimer.current); };
    }, [onClose]);

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
        catch (e) { showToast('Error: ' + e.message); }
        setSaving(false);
    }, [showToast]);

    const updateStatus = useCallback((s, extra = {}) => run(async () => {
        await updateDoc(doc(db, 'issues', issue.id), {
            status: s, updatedAt: serverTimestamp(),
            timeline: arrayUnion({ step: STATUS[s]?.label || s, time: new Date().toISOString(), by: 'admin' }),
            ...extra,
        });
        showToast(`Status updated to "${STATUS[s]?.label || s}"`);
    }), [issue.id, run, showToast]);

    const setPrio = useCallback(p => run(async () => {
        await updateDoc(doc(db, 'issues', issue.id), { priority: p, updatedAt: serverTimestamp() });
        showToast(`Priority set to "${p}"`);
    }), [issue.id, run, showToast]);

    const saveNote = useCallback(() => run(async () => {
        if (!note.trim()) return;
        await updateDoc(doc(db, 'issues', issue.id), {
            comments: arrayUnion({ text: note.trim(), by: 'admin', time: new Date().toISOString() }),
            updatedAt: serverTimestamp(),
        });
        setNote('');
        showToast('Note saved');
    }), [issue.id, note, run, showToast]);

    // Pre-compute derived data once
    const sc = STATUS[issue.status] || STATUS.open;
    const tl = issue.timeline || [];
    const cm = issue.comments || [];

    const stepDone = useCallback(key => {
        if (key === 'Reported') return true;
        if (key === 'Assigned') return ['in_progress', 'resolved', 'rejected'].includes(issue.status);
        if (key === 'In Progress') return ['resolved', 'rejected'].includes(issue.status);
        if (key === 'Resolved') return issue.status === 'resolved';
        return false;
    }, [issue.status]);

    const stepActive = useCallback(key =>
        (key === 'Reported' && issue.status === 'open') ||
        ((key === 'Assigned' || key === 'In Progress') && issue.status === 'in_progress') ||
        (key === 'Resolved' && issue.status === 'resolved'),
        [issue.status]);

    return (
        <div style={{
            animation: 'fadeUp .3s cubic-bezier(.16,1,.3,1) both',
            display: 'flex', flexDirection: 'column', gap: 16,
        }}>
            {/* Back Button */}
            <div>
                <button
                    onClick={onClose}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', borderRadius: 10, border: '1.5px solid var(--border)',
                        background: 'var(--surface2)', color: 'var(--text2)',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer', outline: 'none',
                        transition: 'all .1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text2)'; }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back to Complaints
                </button>
            </div>

            {/* Main Container */}
            <div style={{
                background: 'var(--surface)', borderRadius: 22,
                width: '100%',
                boxShadow: 'var(--sh)',
                overflow: 'hidden',
                border: '1px solid var(--border)'
            }}>

                {/* Status stripe */}
                <div style={{ height: 5, background: `linear-gradient(90deg,${sc.color},transparent)` }} />

                {/* Header */}
                <div style={{
                    padding: '18px 24px 16px',
                    borderBottom: '1.5px solid var(--border)',
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            gap: 10, flexWrap: 'wrap', marginBottom: 7,
                        }}>
                            <h2 style={{
                                fontFamily: 'Syne', fontSize: 19, fontWeight: 800,
                                color: 'var(--text)', margin: 0, letterSpacing: -0.3,
                            }}>{issue.title || 'Untitled Complaint'}</h2>
                            <SBadge status={issue.status} />
                            {issue.priority && <PBadge priority={issue.priority} />}
                        </div>
                        <div style={{
                            display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
                            fontSize: 12, color: 'var(--text2)',
                        }}>
                            {[
                                [ICONS.tag, issue.trackId || issue.id?.slice(0, 10)],
                                [ICONS.file, issue.category || '—'],
                                [ICONS.loc, `Ward ${issue.wardNo || '—'}`],
                                [ICONS.user, issue.userName || '—'],
                                [ICONS.cal, fmt(issue.createdAt)],
                            ].map(([ic, val], i) => (
                                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ color: 'var(--text3)' }}><Ic d={ic} size={13} /></span>
                                    {val}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Toast */}
                {toast && (
                    <div style={{
                        margin: '10px 24px 0', padding: '9px 14px',
                        background: 'var(--greenBg)', border: '1px solid var(--greenBd)',
                        borderRadius: 10, fontSize: 12, color: 'var(--green)',
                        fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <Ic d={ICONS.check} size={14} sw={2.5} />
                        {toast}
                    </div>
                )}

                {/* 3-column grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1.1fr 300px',
                    gap: 0,
                }}>

                    {/* ── COLUMN 1: Details + Image + Map ── */}
                    <div style={{
                        padding: '22px 26px',
                        borderRight: '1.5px solid var(--border)',
                        display: 'flex', flexDirection: 'column', gap: 16,
                    }}>
                        {/* Image */}
                        <LazyImage src={issue.imageUrl} alt="complaint" />

                        {/* Map */}
                        <MapPreview lat={issue.latitude} lng={issue.longitude} />

                        {/* Complaint details */}
                        <Section label="Complaint Details">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                                {[
                                    ['Description', issue.description || '—'],
                                    ['Reported by', issue.userName || '—'],
                                    ['Email', issue.userEmail || '—'],
                                    ['Ward', issue.wardNo ? `Ward ${issue.wardNo}` : '—'],
                                    ['Assigned to', issue.assignedTo || 'Not assigned'],
                                ].map(([k, v]) => (
                                    <div key={k} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                        <span style={{
                                            fontSize: 10, color: 'var(--text3)',
                                            minWidth: 80, flexShrink: 0, paddingTop: 1, letterSpacing: 0.2,
                                        }}>{k}</span>
                                        <span style={{
                                            fontSize: 12, color: 'var(--text)',
                                            fontWeight: 500, lineHeight: 1.55, wordBreak: 'break-word',
                                        }}>{v}</span>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    </div>

                    {/* ── COLUMN 2: Timeline + Assign + Notes ── */}
                    <div style={{
                        padding: '22px 26px',
                        borderRight: '1.5px solid var(--border)',
                        display: 'flex', flexDirection: 'column', gap: 16,
                    }}>
                        {/* Timeline */}
                        <Section label="Workflow Timeline">
                            {STEPS.map((step, i) => {
                                const isDone = stepDone(step.key);
                                const isActive = stepActive(step.key);
                                const tItem = tl.find(t => t.step === step.key);
                                return (
                                    <div key={step.key} style={{ display: 'flex', gap: 12 }}>
                                        <div style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        }}>
                                            <div style={{
                                                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                                background: isDone ? 'var(--green)' : isActive ? 'var(--orange)' : 'var(--surface2)',
                                                border: `2px solid ${isDone ? 'var(--green)' : isActive ? 'var(--orange)' : 'var(--border2)'}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: isDone || isActive ? '#fff' : 'var(--text3)',
                                                fontWeight: 800, fontSize: 11,
                                                boxShadow: isDone || isActive ? 'var(--shMd)' : 'none',
                                            }}>
                                                {isDone
                                                    ? <Ic d={ICONS.check} size={13} sw={2.8} />
                                                    : isActive
                                                        ? <Ic d={ICONS.chevR} size={13} sw={2.5} />
                                                        : <span>{i + 1}</span>
                                                }
                                            </div>
                                            {i < STEPS.length - 1 && (
                                                <div style={{
                                                    width: 2, flexGrow: 1, minHeight: 20,
                                                    background: isDone ? 'var(--green)' : 'var(--border2)',
                                                    margin: '3px 0', opacity: isDone ? 0.6 : 1,
                                                }} />
                                            )}
                                        </div>
                                        <div style={{ paddingTop: 6, paddingBottom: i < STEPS.length - 1 ? 16 : 0 }}>
                                            <p style={{
                                                fontSize: 13, fontWeight: 700, margin: 0,
                                                color: isDone ? 'var(--green)' : isActive ? 'var(--orange)' : 'var(--text3)',
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

                        {/* Assign department */}
                        <Section label="Assign Department">
                            <select
                                value={dept}
                                onChange={e => setDept(e.target.value)}
                                style={{
                                    width: '100%', padding: '9px 12px', marginBottom: 10,
                                    background: 'var(--surface)', border: '1.5px solid var(--border)',
                                    borderRadius: 9, color: 'var(--text)', fontSize: 13,
                                    outline: 'none', cursor: 'pointer',
                                }}
                                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                            >
                                <option value="">Choose department...</option>
                                {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <button
                                disabled={!dept || saving}
                                onClick={() => { if (dept) updateStatus('in_progress', { assignedTo: dept }); }}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: 9, border: 'none',
                                    background: dept ? 'var(--blue)' : 'var(--surface2)',
                                    color: dept ? '#fff' : 'var(--text3)',
                                    fontWeight: 700, fontSize: 13,
                                    cursor: dept ? 'pointer' : 'not-allowed',
                                    transition: 'all .15s', outline: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                }}
                            >
                                <Ic d={ICONS.assign} size={14} sw={2} />
                                Assign & Start Progress
                            </button>
                        </Section>

                        {/* Admin notes */}
                        <Section label={`Admin Notes${cm.length ? ` (${cm.length})` : ''}`}>
                            {cm.length > 0 && (
                                <div style={{ maxHeight: 100, overflowY: 'auto', marginBottom: 10 }}>
                                    {cm.map((c, i) => (
                                        <div key={i} style={{
                                            background: 'var(--surface)', borderRadius: 9,
                                            padding: '8px 11px', marginBottom: 6,
                                            border: '1px solid var(--border)',
                                        }}>
                                            <p style={{ fontSize: 12, color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
                                                {c.text}
                                            </p>
                                            <p style={{ fontSize: 10, color: 'var(--text3)', margin: '3px 0 0' }}>
                                                {c.by} · {c.time ? new Date(c.time).toLocaleDateString('en-IN') : ''}
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
                                    background: 'var(--surface)', border: '1.5px solid var(--border)',
                                    borderRadius: 9, color: 'var(--text)', fontSize: 12,
                                    resize: 'vertical', marginBottom: 8,
                                    outline: 'none', lineHeight: 1.5,
                                }}
                                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                            />
                            <button
                                disabled={!note.trim() || saving}
                                onClick={saveNote}
                                style={{
                                    width: '100%', padding: '9px', borderRadius: 9,
                                    background: note.trim() ? 'var(--accentBg)' : 'var(--surface)',
                                    border: `1.5px solid ${note.trim() ? 'var(--accentBd)' : 'var(--border)'}`,
                                    color: note.trim() ? 'var(--accent)' : 'var(--text3)',
                                    fontWeight: 600, fontSize: 12,
                                    cursor: note.trim() ? 'pointer' : 'not-allowed',
                                    outline: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                }}
                            >
                                <Ic d={ICONS.note} size={13} />
                                Save Note
                            </button>
                        </Section>
                    </div>

                    {/* ── COLUMN 3: Actions sidebar ── */}
                    <div style={{
                        padding: '22px 24px',
                        display: 'flex', flexDirection: 'column', gap: 16,
                        background: 'var(--surface)',
                    }}>

                        {/* Status actions */}
                        <Section label="Update Status">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                {[
                                    { s: 'in_progress', label: 'In Progress', ...STATUS.in_progress },
                                    { s: 'resolved', label: 'Resolved', ...STATUS.resolved },
                                    { s: 'rejected', label: 'Reject', ...STATUS.rejected },
                                    { s: 'open', label: 'Reopen', ...STATUS.open },
                                ].map(a => (
                                    <button
                                        key={a.s}
                                        disabled={saving || issue.status === a.s}
                                        onClick={() => updateStatus(a.s)}
                                        style={{
                                            padding: '10px 12px', borderRadius: 10,
                                            background: issue.status === a.s ? a.bg : 'var(--surface)',
                                            border: `1.5px solid ${issue.status === a.s ? a.bd : 'var(--border)'}`,
                                            color: issue.status === a.s ? a.color : 'var(--text2)',
                                            fontWeight: issue.status === a.s ? 700 : 500,
                                            fontSize: 12, cursor: issue.status === a.s ? 'default' : 'pointer',
                                            opacity: issue.status === a.s ? 0.6 : 1,
                                            transition: 'all .15s', outline: 'none', textAlign: 'left',
                                        }}
                                        onMouseEnter={e => {
                                            if (issue.status !== a.s) {
                                                e.currentTarget.style.borderColor = a.bd;
                                                e.currentTarget.style.color = a.color;
                                                e.currentTarget.style.background = a.bg;
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (issue.status !== a.s) {
                                                e.currentTarget.style.borderColor = 'var(--border)';
                                                e.currentTarget.style.color = 'var(--text2)';
                                                e.currentTarget.style.background = 'var(--surface)';
                                            }
                                        }}
                                    >{a.label}</button>
                                ))}
                            </div>
                        </Section>

                        {/* Priority */}
                        <Section label="Priority Level">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                {Object.entries(PRIORITY).map(([key, p]) => (
                                    <button
                                        key={key}
                                        disabled={saving}
                                        onClick={() => setPrio(key)}
                                        style={{
                                            padding: '9px 12px', borderRadius: 10,
                                            background: issue.priority === key ? p.bg : 'var(--surface)',
                                            border: `1.5px solid ${issue.priority === key ? p.bd : 'var(--border)'}`,
                                            color: issue.priority === key ? p.color : 'var(--text2)',
                                            fontWeight: issue.priority === key ? 800 : 500,
                                            fontSize: 12, cursor: 'pointer', outline: 'none',
                                            transition: 'all .15s', textAlign: 'left',
                                        }}
                                        onMouseEnter={e => {
                                            if (issue.priority !== key) {
                                                e.currentTarget.style.borderColor = p.bd;
                                                e.currentTarget.style.color = p.color;
                                                e.currentTarget.style.background = p.bg;
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (issue.priority !== key) {
                                                e.currentTarget.style.borderColor = 'var(--border)';
                                                e.currentTarget.style.color = 'var(--text2)';
                                                e.currentTarget.style.background = 'var(--surface)';
                                            }
                                        }}
                                    >{p.label}</button>
                                ))}
                            </div>
                        </Section>

                        {/* Firebase Storage note */}
                        <div style={{
                            padding: '11px 13px',
                            background: 'var(--yellowBg)', border: '1px solid var(--yellowBd)',
                            borderRadius: 11, fontSize: 11, color: 'var(--yellow)', lineHeight: 1.55,
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                fontWeight: 700, marginBottom: 5,
                            }}>
                                <Ic d={ICONS.info} size={13} />
                                Image not showing?
                            </div>
                            If the image is missing, check Firebase Storage rules allow
                            authenticated reads, and that the Flutter app successfully
                            uploaded to Storage before saving the URL.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
