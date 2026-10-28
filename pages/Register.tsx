import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthUser, isAuthUser } from '../types';
import { apiFetch } from '../api';

interface RegisterProps {
  onLogin: (user: AuthUser) => void;
}

const Register: React.FC<RegisterProps> = ({ onLogin }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('client');
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !role) return alert('Please fill in all fields.');
    if (password.length < 8) return alert('Password must be at least 8 characters long.');
    if (!terms) return alert('You must agree to the terms and privacy policy.');

    setLoading(true);
    try {
      const res = await apiFetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName, email, password, role, phone_number: phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorDetail = Array.isArray(data?.errors)
          ? data.errors.map((e: any) => `${e.path ? e.path.join('.') + ': ' : ''}${e.message}`).join('\n')
          : null;
        throw new Error(errorDetail || data?.message || 'Registration failed.');
      }
      if (typeof data.token !== 'string' || !isAuthUser(data.user)) throw new Error('Registration response is missing valid authentication data.');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userId', String(data.user.id));
      if (data.user.status) localStorage.setItem('userStatus', data.user.status);
      onLogin(data.user);
    } catch (err: any) {
      alert(err.message || 'Server error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    // Store the selected role in sessionStorage so we can use it after OAuth callback
    if (role) sessionStorage.setItem('oauth_role', role);
    // Redirect to backend Google OAuth endpoint
    window.location.href = '/api/auth/google';
  };

  const handleFacebookSignUp = () => {
    // Store the selected role in sessionStorage so we can use it after OAuth callback
    if (role) sessionStorage.setItem('oauth_role', role);
    // Redirect to backend Facebook OAuth endpoint
    window.location.href = '/api/auth/facebook';
  };

  return (
    <div className="register-root">
      <link rel="stylesheet" href="/styles.css" />
      <main className="form__container" role="main" aria-label="Register Form">
        <header className="form__header">
          <div className="logo-container" aria-label="KIND Logo"><span style={{ fontSize: 24, marginRight: 8 }}>❤</span><span style={{ fontWeight: 700 }}>KIND</span></div>
          <h2 className="form__title">Create an Account</h2>
          <p className="form__subtitle">Join KIND and find trusted local help today.</p>
        </header>

        <section className="social-auth" aria-label="Social Sign-In Options">
          <button type="button" className="social-btn google-btn" onClick={handleGoogleSignUp}>
            <i className="ri-google-fill"></i> Continue with Google
          </button>
          <button type="button" className="social-btn facebook-btn" onClick={handleFacebookSignUp}>
            <i className="ri-facebook-box-fill"></i> Continue with Facebook
          </button>
        </section>

        <div className="divider">or continue with email</div>

        <form id="register-form" onSubmit={submit} noValidate>
          <label htmlFor="fullName">Full Name</label>
          <input id="fullName" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required autoComplete="name" />

          <label htmlFor="email">Email Address</label>
          <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />

          <label htmlFor="phoneNumber">Phone Number (e.g., +26599...)</label>
          <input id="phoneNumber" type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+265..." autoComplete="tel" />

          <label htmlFor="password">Create Password (at least 8 characters)</label>
          <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" autoComplete="new-password" />

          <label htmlFor="role">Select Role</label>
          <select id="role" required value={role} onChange={e => setRole(e.target.value)}>
            <option value="" disabled>Select Role</option>
            <option value="client">Client</option>
            <option value="provider">Provider</option>
          </select>

          <div className="form-options">
            <input id="terms" type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} required />
            <label htmlFor="terms">I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></label>
          </div>

          <button type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create Account'}</button>
        </form>

        <p className="signin-link">Already have an account? <Link to="/login">Sign In</Link></p>
      </main>
    </div>
  );
};

export default Register;
