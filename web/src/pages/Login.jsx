import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Home, ShieldAlert, ShieldCheck, CheckCircle2, ArrowRight, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export default function Login() {
  const [mode, setMode] = useState('login'); 
  const [roleType, setRoleType] = useState('owner'); // 'owner' | 'member'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [targetOwnerUsername, setTargetOwnerUsername] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [successState, setSuccessState] = useState(null); // Holds the success message
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (mode === 'login') {
        await login(username, password);
        navigate('/');
      } else {
        await client.post('/api/auth/register-split/', {
          username: username.trim(),
          email: email.trim(),
          password: password,
          role_type: roleType,
          household_name: roleType === 'owner' ? householdName.trim() : '',
          target_owner_username: roleType === 'member' ? targetOwnerUsername.trim() : ''
        });
        
        if (roleType === 'owner') {
          // Auto-login owners immediately
          await login(username, password);
          navigate('/');
        } else {
          // Trigger the beautiful SaaS Success State for members
          setSuccessState({
            title: 'Request Transmitted',
            message: `A secure link request has been sent to Owner [${targetOwnerUsername}]. You will gain access once they authorize your profile in their control panel.`
          });
        }
      }
    } catch (err) {
      if (err.response && err.response.data) {
        const data = err.response.data;
        if (data.error) setError(data.error);
        else if (typeof data === 'object') {
          const firstField = Object.keys(data)[0];
          setError(`${firstField.toUpperCase()}: ${data[firstField][0]}`);
        }
      } else {
        setError('Network connectivity failure.');
      }
    } finally {
      setBusy(false);
    }
  };

  const resetToLogin = () => {
    setSuccessState(null);
    setMode('login');
    setPassword('');
  };

  return (
    <div style={{ 
      background: '#12161B', 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '24px'
    }}>
      {/* SaaS Glassmorphism & Animation CSS */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.25; }
          100% { transform: scale(1); opacity: 0.15; }
        }
        .bg-orb {
          position: absolute;
          width: 60vw;
          height: 60vw;
          max-width: 800px;
          max-height: 800px;
          border-radius: 50%;
          background: radial-gradient(circle, #C6813F 0%, transparent 70%);
          animation: pulseGlow 12s ease-in-out infinite;
          filter: blur(80px);
          z-index: 0;
        }
        .glass-panel {
          background: rgba(27, 32, 40, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 24px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .saas-input {
          width: 100%;
          background: rgba(18, 22, 27, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 14px 16px;
          color: #EDEFF3;
          font-family: 'JetBrains Mono', monospace;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .saas-input:focus {
          outline: none;
          border-color: #C6813F;
          background: rgba(18, 22, 27, 0.9);
          box-shadow: 0 0 0 3px rgba(198, 129, 63, 0.15);
        }
        .saas-btn {
          width: 100%;
          background: linear-gradient(135deg, #E0A868 0%, #C6813F 100%);
          border: 0;
          padding: 16px;
          color: #12161B;
          font-family: 'JetBrains Mono', monospace;
          cursor: pointer;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          transition: transform 0.1s, box-shadow 0.2s;
          box-shadow: 0 4px 14px rgba(198, 129, 63, 0.3);
        }
        .saas-btn:active {
          transform: scale(0.98);
        }
        .saas-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .segment-control {
          display: flex;
          background: rgba(18, 22, 27, 0.6);
          padding: 4px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .segment-btn {
          flex: 1;
          padding: 10px;
          border-radius: 6px;
          border: none;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
      `}</style>

      {/* Atmospheric Background Effects */}
      <div className="bg-orb" style={{ top: '-10%', left: '-10%' }} />
      <div className="bg-orb" style={{ bottom: '-20%', right: '-10%', background: 'radial-gradient(circle, #232A33 0%, transparent 60%)' }} />

      {/* Main Container - Expanded width for SaaS feel */}
      <div className="glass-panel" style={{ 
        width: '100%',
        maxWidth: '520px',
        borderRadius: '16px',
        padding: '40px',
        position: 'relative',
        zIndex: 2,
        animation: 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>

        {/* Dedicated Success State Override */}
        {successState ? (
          <div style={{ textAlign: 'center', animation: 'fadeUp 0.4s ease-out' }}>
            <div style={{ 
              width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(76, 175, 125, 0.1)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
              border: '1px solid rgba(76, 175, 125, 0.3)'
            }}>
              <CheckCircle2 size={40} style={{ color: '#4CAF7D' }} />
            </div>
            <h2 style={{ fontFamily: 'Manrope', color: '#EDEFF3', fontSize: '1.6rem', marginBottom: '12px', fontWeight: 600 }}>
              {successState.title}
            </h2>
            <p style={{ fontFamily: 'Manrope', color: '#8C95A3', fontSize: '1rem', lineHeight: '1.6', marginBottom: '32px' }}>
              {successState.message}
            </p>
            <button className="saas-btn" onClick={resetToLogin} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              RETURN TO LOGIN <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          /* Standard Form State */
          <>
            {/* Header Area */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px', background: 'rgba(198, 129, 63, 0.1)', padding: '8px 16px', borderRadius: '100px', border: '1px solid rgba(198, 129, 63, 0.2)' }}>
                <Activity size={16} style={{ color: '#C6813F' }} />
                <span style={{ fontFamily: 'JetBrains Mono', color: '#E0A868', fontSize: '0.8rem', letterSpacing: '0.1em', fontWeight: 700 }}>THE NEXUS DOME</span>
              </div>
              <h1 style={{ fontFamily: 'Manrope', color: '#EDEFF3', fontSize: '1.8rem', fontWeight: 600, margin: '0 0 8px 0' }}>
                {mode === 'login' ? 'System Authentication' : 'Provision Architecture'}
              </h1>
              <p style={{ fontFamily: 'Manrope', color: '#8C95A3', fontSize: '0.95rem', margin: 0 }}>
                {mode === 'login' ? 'Enter credentials to access your control panel.' : 'Initialize a new node or request a household link.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Segmented Control for Registration Mode */}
              {mode === 'register' && (
                <div className="segment-control">
                  <button 
                    type="button" 
                    onClick={() => setRoleType('owner')} 
                    className="segment-btn"
                    style={{ 
                      background: roleType === 'owner' ? '#C6813F' : 'transparent', 
                      color: roleType === 'owner' ? '#12161B' : '#8C95A3'
                    }}
                  >
                    ROOT OWNER
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setRoleType('member')} 
                    className="segment-btn"
                    style={{ 
                      background: roleType === 'member' ? '#C6813F' : 'transparent', 
                      color: roleType === 'member' ? '#12161B' : '#8C95A3'
                    }}
                  >
                    LINK MEMBER
                  </button>
                </div>
              )}

              {/* Input Group */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', letterSpacing: '0.05em' }}>
                    <User size={14} style={{ color: '#C6813F' }} /> OPERATOR ID
                  </label>
                  <input className="saas-input" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="Enter username..." />
                </div>

                {mode === 'register' && (
                  <div style={{ animation: 'fadeUp 0.3s ease-out' }}>
                    <label style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', fontSize: '0.75rem', display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>EMAIL ADDRESS</label>
                    <input type="email" className="saas-input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@example.com" />
                  </div>
                )}
                
                {mode === 'register' && roleType === 'owner' && (
                  <div style={{ animation: 'fadeUp 0.3s ease-out' }}>
                    <label style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', letterSpacing: '0.05em' }}>
                      <Home size={14} style={{ color: '#C6813F' }} /> DOME ALIAS
                    </label>
                    <input className="saas-input" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="e.g. Shanti Nivas" required />
                  </div>
                )}

                {mode === 'register' && roleType === 'member' && (
                  <div style={{ animation: 'fadeUp 0.3s ease-out' }}>
                    <label style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', letterSpacing: '0.05em' }}>
                      <ShieldCheck size={14} style={{ color: '#C6813F' }} /> TARGET OWNER USERNAME
                    </label>
                    <input className="saas-input" value={targetOwnerUsername} onChange={(e) => setTargetOwnerUsername(e.target.value)} placeholder="Username of the household owner" required />
                  </div>
                )}

                <div>
                  <label style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', letterSpacing: '0.05em' }}>
                    <Lock size={14} style={{ color: '#C6813F' }} /> SECURE ACCESS KEY
                  </label>
                  <input type="password" className="saas-input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
                </div>
              </div>

              {/* Error Output */}
              {error && (
                <div style={{ background: 'rgba(225,85,84,0.1)', borderLeft: '3px solid #E15554', padding: '12px 16px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldAlert size={16} style={{ color: '#E15554', flexShrink: 0 }} />
                  <p style={{ color: '#EDEFF3', fontFamily: 'Manrope', fontSize: '0.85rem', margin: 0, lineHeight: '1.4' }}>{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button className="saas-btn" disabled={busy} style={{ marginTop: '8px' }}>
                {busy ? 'SYNCHRONIZING...' : mode === 'login' ? 'INITIALIZE SESSION' : 'PROVISION PROFILE'}
              </button>

              {/* Quick Demo Login Button */}
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setUsername('adi');
                    setPassword('admin123');
                    login('adi', 'admin123').then(() => navigate('/')).catch((err) => setError('Ensure backend is running on port 8000'));
                  }}
                  style={{
                    width: '100%',
                    background: 'rgba(198, 129, 63, 0.12)',
                    border: '1px solid rgba(224, 168, 104, 0.4)',
                    color: '#E0A868',
                    padding: '12px',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                  }}
                >
                  ⚡ ONE-CLICK DEMO ACCESS (adi / admin123)
                </button>
              )}
            </form>

            {/* Footer Switcher */}
            <div style={{ textAlign: 'center', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ fontFamily: 'Manrope', color: '#8C95A3', fontSize: '0.9rem', margin: 0 }}>
                {mode === 'login' ? "Deploying a new ecosystem?" : 'Hardware profile already verified?'}
                <button 
                  onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} 
                  style={{ background: 'none', border: 0, color: '#E0A868', fontFamily: 'Manrope', fontWeight: 600, cursor: 'pointer', marginLeft: '8px', padding: 0 }}
                >
                  {mode === 'login' ? "Register here." : 'Sign in here.'}
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}