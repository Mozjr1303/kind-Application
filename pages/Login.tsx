import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Iridescence from '../components/Iridescence';
import { AuthUser, isAuthUser } from '../types';
import { apiFetch } from '../api';

interface LoginProps {
  onLogin: (user: AuthUser) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return alert('Please fill all fields.');
    setLoading(true);
    try {
      const res = await apiFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Login failed');
      if (typeof data.token !== 'string' || !isAuthUser(data.user)) throw new Error('Login response is missing valid authentication data.');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userId', String(data.user.id));
      if (data.user.status) localStorage.setItem('userStatus', data.user.status);
      onLogin(data.user);
    } catch (err: any) {
      alert(err.message || 'Login error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = '/api/auth/google';
  };

  const handleFacebookSignIn = () => {
    window.location.href = '/api/auth/facebook';
  };

  return (
    <div className="login-root">
      <Iridescence color={[0.8, 0.9, 1]} mouseReact={false} amplitude={0.08} speed={1.0} />
      <div className="login-content">
        <link rel="stylesheet" href="/styles.css" />
        <section className="form__container">
          <div className="form__card">
            <h2>Welcome Back</h2>
            <p>Log in to continue using KIND services.</p>

            <button type="button" className="social-btn google-btn" onClick={handleGoogleSignIn}>
              <i className="ri-google-fill"></i> Sign In with Google
            </button>
            <button type="button" className="social-btn facebook-btn" onClick={handleFacebookSignIn}>
              <i className="ri-facebook-box-fill"></i> Sign In with Facebook
            </button>

            <div className="divider"><span>or</span></div>

            <form className="auth-form" onSubmit={submit}>
              <input type="email" id="login-email" placeholder="Your Email" required value={email} onChange={e => setEmail(e.target.value)} />
              <input type="password" id="login-password" placeholder="Your Password" required value={password} onChange={e => setPassword(e.target.value)} />
              <button type="submit" className="btn">{loading ? 'Signing in...' : 'Login'}</button>
            </form>

            <p className="switch-link">Don’t have an account? <Link to="/register">Register</Link></p>
          </div>
        </section>
        <div className="back-link"><Link to="/">&larr; Back to KIND</Link></div>
      </div>
    </div>
  );
};
