import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from "../firebase";
import { signInWithEmailAndPassword, signInWithPopup, FacebookAuthProvider, GoogleAuthProvider } from "firebase/auth";

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);


const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function Login({ setIsAuthenticated }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // การล็อกอินด้วย Email/Password ปกติ
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (setIsAuthenticated) setIsAuthenticated(true);
      alert("เข้าสู่ระบบสำเร็จ ลุยเลย!");
      navigate('/game');
    } catch (err) {
      setError('รหัสผ่านไม่ถูกต้อง หรือยังไม่ได้สมัครสมาชิก');
    }
    setLoading(false);
  };

  // การล็อกอินด้วย Google
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (setIsAuthenticated) setIsAuthenticated(true);
      alert(`ยินดีต้อนรับ ${result.user.displayName}!`);
      navigate('/game');
    } catch (error) {
      console.error("Google Login Error:", error);
      alert("เกิดข้อผิดพลาดในการล็อกอินด้วย Google");
    }
  };

  // การล็อกอินด้วย Facebook
  const handleFacebookLogin = async () => {
    const provider = new FacebookAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (setIsAuthenticated) setIsAuthenticated(true);
      alert(`ยินดีต้อนรับ ${result.user.displayName}!`);
      navigate('/game');
    } catch (error) {
      console.error("Facebook Login Error:", error);
      alert("เกิดข้อผิดพลาดในการล็อกอินด้วย Facebook");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        .beast-title { font-family: 'Bebas Neue', Impact, sans-serif; }
        .beast-btn   { font-family: 'Bebas Neue', Impact, sans-serif; }
        .input-field { font-family: system-ui, -apple-system, sans-serif; }
      `}</style>

      <div className="flex h-screen w-full overflow-hidden bg-black">
        {/* ── LEFT: Black logo panel ── */}
        <div className="hidden md:flex w-[56%] bg-black items-center justify-center relative flex-shrink-0">
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'repeating-linear-gradient(135deg,white 0,white 1px,transparent 0,transparent 60px)',
              backgroundSize: '60px 60px'
            }}
          />
          <div className="relative z-10 flex flex-col items-center gap-4 select-none px-12">
            <div className="w-56 h-64">
              <img src="src/Photo/black cut.jpg" alt="Your Custom Logo" className="w-full h-auto" />
            </div>
          </div>
        </div>

        {/* ── RIGHT: White form panel ── */}
        <div
          className="flex-1 bg-white flex flex-col justify-center items-center px-14 py-12 relative"
          style={{ borderRadius: '2.5rem 0 0 2.5rem', boxShadow: '-24px 0 80px rgba(0,0,0,0.4)' }}
        >
          {/* mobile logo */}
          <div className="md:hidden absolute top-8 left-8 w-12 h-12">
            <img src="src/Photo/logo rm.png" alt="Your Custom Logo" className="w-full h-auto" />
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 mb-10 justify-center">
            <h1 className="beast-title text-black leading-none" style={{ fontSize: '4.5rem' }}>LOGIN</h1>
            <div className="w-16 h-16 mb-1">
              <img src="src/Photo/logo rm.png" alt="Your Custom Logo" className="w-full h-auto" />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full max-w-[360px]">
            <input
              type="email"
              placeholder="email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="input-field w-full border-2 border-black rounded-full px-6 py-[0.75rem] text-[0.95rem] outline-none placeholder-gray-400 focus:border-gray-500 transition-colors bg-white"
            />
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="input-field w-full border-2 border-black rounded-full px-6 py-[0.75rem] text-[0.95rem] outline-none placeholder-gray-400 focus:border-gray-500 transition-colors bg-white"
            />

            {error && (
              <p className="input-field text-red-500 text-sm text-center -mt-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="beast-btn w-full bg-black text-white rounded-full py-[0.85rem] text-2xl tracking-[0.2em] hover:bg-gray-900 active:scale-[0.97] transition-all mt-2 disabled:opacity-50"
            >
              {loading ? '...' : 'LOGIN'}
            </button>
          </form>

          {/* OR divider */}
          <div className="flex items-center gap-4 my-7 w-full max-w-[360px] justify-center">
            <div className="flex-1 h-[1.5px] bg-black" />
            <span className="input-field text-black text-base">or</span>
            <div className="flex-1 h-[1.5px] bg-black" />
          </div>

          {/* Social */}
          <div className="flex gap-7 w-full max-w-[360px] justify-center">
            <button type="button" onClick={handleFacebookLogin} className="hover:scale-110 active:scale-95 transition-transform">
              <FacebookIcon />
            </button>
            <button type="button" onClick={handleGoogleLogin} className="hover:scale-110 active:scale-95 transition-transform">
              <GoogleIcon />
            </button>
          </div>

          {/* Sign up */}
          <p className="input-field text-sm text-gray-500 mt-10 max-w-[360px] text-center">
            Don't have an account?{' '}
            <Link to="/signup" className="text-black font-semibold underline hover:text-gray-700 transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}