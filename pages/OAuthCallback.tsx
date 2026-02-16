import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserRole } from '../types';

interface OAuthCallbackProps {
  onLogin: (role: UserRole) => void;
}

const OAuthCallback: React.FC<OAuthCallbackProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);

  // Registration State
  const [registerToken, setRegisterToken] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState<string>('');
  const [pendingEmail, setPendingEmail] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('client');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const processCallback = async () => {
      try {
        setStatus('Parsing URL parameters...');

        // Try getting params from location.search first
        let params = new URLSearchParams(location.search);

        // Fallback: Check if params are in the hash string (common in HashRouter)
        if (!params.get('token') && !params.get('registerToken')) {
          const hash = window.location.hash;
          const queryIndex = hash.indexOf('?');
          if (queryIndex !== -1) {
            params = new URLSearchParams(hash.substring(queryIndex));
          }
        }

        const token = params.get('token');
        const regToken = params.get('registerToken');

        if (token) {
          // LOGIN SUCCESS
          const roleStr = params.get('role');
          const name = params.get('name');
          const id = params.get('id');

          if (roleStr && name && id) {
            setStatus('Logging in...');
            localStorage.setItem('token', token);
            localStorage.setItem('userName', name);
            localStorage.setItem('userId', id);
            const status = params.get('status');
            if (status) localStorage.setItem('userStatus', status);
            const role = roleStr.toUpperCase() as UserRole;
            onLogin(role);
          } else {
            setError('Missing login parameters.');
          }
        } else if (regToken) {
          // NEW USER - NEEDS ROLE SELECTION
          setRegisterToken(regToken);
          setPendingName(params.get('name') || '');
          setPendingEmail(params.get('email') || '');
          setStatus('Please complete your registration.');

          // Check if role was pre-selected in session storage
          const storedRole = sessionStorage.getItem('oauth_role');
          if (storedRole) {
            setSelectedRole(storedRole);
            sessionStorage.removeItem('oauth_role'); // Clear it
          }
        } else {
          // NO PARAMS
          setError('No authentication data found.');
          setStatus('Failed.');
        }
      } catch (error: any) {
        console.error('OAuth processing error:', error);
        setError(`Processing error: ${error.message}`);
        setStatus('Error.');
      }
    };

    processCallback();
  }, [location, onLogin]);

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerToken) return;

    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:4000/api/auth/oauth-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registerToken, role: selectedRole, phone_number: phoneNumber })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userName', data.name);
        localStorage.setItem('userId', data.id);
        if (data.status) localStorage.setItem('userStatus', data.status);
        const role = (data.role || selectedRole).toUpperCase() as UserRole;
        onLogin(role);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (registerToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-2xl font-semibold mb-2 text-center">Complete Registration</h2>
          <p className="text-gray-600 mb-6 text-center">
            Welcome, <strong>{pendingName}</strong>!<br />
            <span className="text-sm text-gray-500">({pendingEmail})</span>
          </p>

          <p className="mb-4 text-center">Please select your account type to continue:</p>

          <form onSubmit={handleCompleteRegistration} className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="role"
                  value="client"
                  checked={selectedRole === 'client'}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <span className="font-medium">Client</span>
                  <p className="text-xs text-gray-500">I want to hire service providers.</p>
                </div>
              </label>

              <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="role"
                  value="provider"
                  checked={selectedRole === 'provider'}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <span className="font-medium">Provider</span>
                  <p className="text-xs text-gray-500">I want to offer my services.</p>
                </div>
              </label>
            </div>

            <div className="flex flex-col space-y-2">
              <label htmlFor="oauth-phone" className="font-medium text-gray-700">Phone Number (Optional)</label>
              <input
                id="oauth-phone"
                type="tel"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="+265..."
                className="p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500">Required for SMS notifications (e.g., for providers).</p>
            </div>

            {error && <div className="text-red-600 text-sm text-center">{error}</div>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Creating Account...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h2 className="text-2xl font-semibold mb-4">Authentication</h2>

        {error ? (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-left text-sm">
            <strong>Error:</strong> {error}
          </div>
        ) : (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        )}

        <p className="mb-4 text-gray-600">{status}</p>

        {error && (
          <button
            onClick={() => navigate('/login')}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 w-full"
          >
            Return to Login
          </button>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
