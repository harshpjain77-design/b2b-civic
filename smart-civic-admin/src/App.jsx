import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import LoginPage   from './pages/LoginPage';
import AdminLayout from './components/AdminLayout';

const ADMIN_EMAIL = 'admin@smartcivic.com';

// ─── Full-screen loader ───────────────────────────────────────────────────────
function Loader() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#f4f6fb', gap: 16,
    }}>
      {/* Logo */}
      <div style={{
        width: 52, height: 52, borderRadius: 16,
        background: 'linear-gradient(135deg, #e65100, #ff8f00)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(230,81,0,0.3)',
        marginBottom: 4,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>

      {/* Spinner */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '2.5px solid #e8ecf4',
        borderTopColor: '#e65100',
        animation: 'spin .8s linear infinite',
      }}/>

      <p style={{
        fontFamily: 'Syne, sans-serif',
        fontSize: 13, fontWeight: 600,
        color: '#94a3b8', letterSpacing: 0.3,
      }}>Authenticating…</p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,    setUser]    = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [debug,   setDebug]   = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null); setIsAdmin(false); setLoading(false); return;
      }

      // Fast path — known admin email
      if (u.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()) {
        try {
          await setDoc(
            doc(db, 'users', u.uid),
            { name: 'Admin', email: u.email, role: 'admin' },
            { merge: true },
          );
        } catch (e) {
          console.warn('Firestore sync:', e.message);
        }
        setUser(u); setIsAdmin(true); setDebug('');
        setLoading(false); return;
      }

      // Fallback — check Firestore role
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists() && snap.data().role?.trim() === 'admin') {
          setUser(u); setIsAdmin(true); setDebug('');
        } else {
          setDebug(`Access denied for ${u.email}. Ensure role = "admin" in Firestore.`);
          setUser(null); setIsAdmin(false);
          await auth.signOut();
        }
      } catch (e) {
        setDebug(`Error checking role: ${e.message}`);
        setUser(null); setIsAdmin(false);
        await auth.signOut();
      }

      setLoading(false);
    });

    return unsub;
  }, []);

  if (loading)              return <Loader />;
  if (!user || !isAdmin)    return <LoginPage debugMsg={debug} />;
  return                           <AdminLayout user={user} />;
}