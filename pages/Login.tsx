import React, { useState } from 'react';
import Iridescence from '../components/Iridescence';
import { UserRole } from '../types';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('client');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !role) return alert('Please fill all fields.');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Login failed');

      if (json.token) localStorage.setItem('token', json.token);
      if (json.name) localStorage.setItem('userName', json.name);
      if (json.id) localStorage.setItem('userId', json.id);
      if (json.status) localStorage.setItem('userStatus', json.status);
      const mappedRole = (json.role || role || 'CLIENT').toUpperCase();

      // If backend returns ADMIN we allow admin login (handled by backend credentials).
      if (mappedRole === 'ADMIN') {
        onLogin(UserRole.ADMIN);
        return;
      }

      // Ensure that the account's registered role matches the role the user selected.
      const selectedRole = (role || 'client').toUpperCase();
      if (mappedRole !== selectedRole) {
        // Clear any stored token since role doesn't match the selection
        if (json.token) localStorage.removeItem('token');
        alert(`Role mismatch: this account is registered as ${mappedRole}. Please select the correct role to sign in.`);
        return;
      }

      // Proceed with normal mapping (CLIENT / PROVIDER)
      if (mappedRole === 'PROVIDER') onLogin(UserRole.PROVIDER);
      else onLogin(UserRole.CLIENT);
    } catch (err: any) {
      alert(err.message || 'Login error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Store the selected role in sessionStorage so we can use it after OAuth callback
    if (role) sessionStorage.setItem('oauth_role', role);
    // Redirect to backend Google OAuth endpoint
    window.location.href = `http://localhost:4000/api/auth/google?role=${role}`;
  };

  const handleFacebookSignIn = () => {
    // Store the selected role in sessionStorage so we can use it after OAuth callback
    if (role) sessionStorage.setItem('oauth_role', role);
    // Redirect to backend Facebook OAuth endpoint
    window.location.href = 'http://localhost:4000/api/auth/facebook';
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
              <select id="role" required value={role} onChange={e => setRole(e.target.value)}>
                <option value="" disabled>Select Role</option>
                <option value="client">Client</option>
                <option value="provider">Provider</option>
              </select>
              <button type="submit" className="btn">{loading ? 'Signing in...' : 'Login'}</button>
            </form>

            <p className="switch-link">Don’t have an account? <a href="/register">Register</a></p>
          </div>
        </section>
        <div className="back-link"><a href="/">&larr; Back to KIND</a></div>
      </div>
    </div>
  );
};
