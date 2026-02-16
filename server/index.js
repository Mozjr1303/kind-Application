const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const supabase = require('./supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'kind-secret-key-2025';

// Initialize AfricasTalking SMS
const AfricasTalking = require('africastalking');
const africastalking = AfricasTalking({
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME
});

app.use(cors());
app.use(bodyParser.json());

// Helper to record logs
const recordLog = async (action, user, status, detail) => {
  try {
    const { error } = await supabase.from('logs').insert([{
      action,
      user,
      status,
      detail,
      timestamp: new Date().toISOString()
    }]);
    if (error) console.error('Error recording log:', error);
  } catch (err) {
    console.error('Log failure:', err);
  }
};
global.recordLog = recordLog;

// Passport Configuration
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'dummy',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy',
  callbackURL: "/api/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => done(null, profile)));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID || 'dummy',
  clientSecret: process.env.FACEBOOK_APP_SECRET || 'dummy',
  callbackURL: "/api/auth/facebook/callback",
  profileFields: ['id', 'displayName', 'emails', 'name']
}, (accessToken, refreshToken, profile, done) => done(null, profile)));

// Start API base route
app.get('/api', (req, res) => {
  res.json({ message: 'KIND Service API is running' });
});

// Auth: Register
app.post('/api/register', async (req, res) => {
  const { name, email, password, role, phone_number } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ message: 'Missing fields' });

  try {
    const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).single();
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    const status = role.toUpperCase() === 'PROVIDER' ? 'pending' : 'active';

    const { data, error } = await supabase.from('users').insert([{
      name,
      email,
      password: hashedPassword,
      role: role.toUpperCase(),
      status,
      created_at: now,
      phone_number
    }]).select().single();

    if (error) throw error;

    res.status(201).json({ message: 'User created', user: { id: data.id, name, email, role: data.role, status } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Auth: Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error || !user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role, name: user.name, email: user.email, status: user.status }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status } });
  } catch (err) {
    res.status(500).json({ message: 'Login error' });
  }
});

app.get('/api/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' });
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { data: user, error } = await supabase.from('users').select('id, name, email, role, service, location, status, phone_number, motivation, qualifications, photo_url, certificates_url, rating, jobs_done').eq('id', decoded.id).single();
    if (error) throw error;
    res.json({ user });
  } catch (e) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Admin: Get Pending Providers
app.get('/api/admin/pending-providers', async (req, res) => {
  const { data, error } = await supabase.from('users').select('id, name, email, role, service, location, created_at, phone_number').eq('role', 'PROVIDER').eq('status', 'pending');
  if (error) return res.status(500).json({ message: 'Database error' });
  res.json(data || []);
});

// Admin: Approve/Reject Provider
app.put('/api/admin/providers/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['active', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

  try {
    const { data: provider } = await supabase.from('users').select('name, email, service, phone_number').eq('id', id).eq('role', 'PROVIDER').single();
    if (!provider) return res.status(404).json({ message: 'Provider not found' });

    const { error: updateErr } = await supabase.from('users').update({ status }).eq('id', id).eq('role', 'PROVIDER');
    if (updateErr) throw updateErr;

    global.recordLog(
      status === 'active' ? 'Approve Provider' : 'Reject Provider',
      'admin@kind.com',
      'Success',
      `${status === 'active' ? 'Approved' : 'Rejected'} provider: ${provider.name} (${provider.email})`
    );

    const sms = africastalking.SMS;
    const adminPhone = process.env.ADMIN_PHONE_NUMBER;
    if (adminPhone) {
      const statusText = status === 'active' ? 'APPROVED' : 'REJECTED';
      sms.send({ to: [adminPhone], message: `KIND Alert: Provider ${statusText}!\nName: ${provider.name}\nEmail: ${provider.email}` });
    }
    if (provider.phone_number) {
      sms.send({ to: [provider.phone_number], message: `Hello ${provider.name}, your account has been ${status === 'active' ? 'APPROVED' : 'REJECTED'}.` });
    }

    res.json({ message: `Provider ${status}` });
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/users', async (req, res) => {
  const { data, error } = await supabase.from('users').select('id, name, email, role, service, location, status, created_at, phone_number, motivation, qualifications, photo_url, certificates_url, rating, jobs_done');
  if (error) return res.status(500).json({ message: 'Database error' });
  res.json(data || []);
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, role, service, location, phone_number, motivation, qualifications, photo_url, certificates_url } = req.body;

  try {
    const { data, error } = await supabase.from('users').update({
      name, email, role, service, location, phone_number, motivation, qualifications, photo_url, certificates_url
    }).eq('id', id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data: user } = await supabase.from('users').select('name, role').eq('id', id).single();
    if (user) {
      global.recordLog(`Delete User`, 'admin@kind.com', 'Success', `Deleted: ${user.name}`);
    }
    await supabase.from('contact_requests').delete().or(`client_id.eq.${id},provider_id.eq.${id}`);
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// OAuth Callback Helper
const handleOAuthCallback = async (req, res, providerName) => {
  const profile = req.user;
  const email = profile.emails ? profile.emails[0].value : null;
  const name = profile.displayName || `${profile.name.givenName} ${profile.name.familyName}`;

  if (!email) return res.redirect('/login?error=No email');

  try {
    const { data: user } = await supabase.from('users').select('id, name, email, role, status').eq('email', email).single();
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    if (user) {
      const token = jwt.sign({ id: user.id, role: user.role, name: user.name, email: user.email, status: user.status }, JWT_SECRET, { expiresIn: '8h' });
      res.redirect(`${baseUrl}/#/oauth-callback?token=${token}&role=${user.role}&name=${encodeURIComponent(user.name)}&id=${user.id}&status=${user.status}`);
    } else {
      const registerToken = jwt.sign({ name, email, provider: providerName }, JWT_SECRET, { expiresIn: '1h' });
      res.redirect(`${baseUrl}/#/oauth-callback?registerToken=${registerToken}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`);
    }
  } catch (err) {
    res.redirect('/login?error=Database error');
  }
};

app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/api/auth/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), (req, res) => handleOAuthCallback(req, res, 'Google'));
app.get('/api/auth/facebook', passport.authenticate('facebook', { scope: ['public_profile', 'email'] }));
app.get('/api/auth/facebook/callback', passport.authenticate('facebook', { session: false, failureRedirect: '/login' }), (req, res) => handleOAuthCallback(req, res, 'Facebook'));

app.post('/api/auth/oauth-complete', async (req, res) => {
  const { registerToken, role, phone_number } = req.body;
  try {
    const decoded = jwt.verify(registerToken, JWT_SECRET);
    const { name, email } = decoded;
    const hashedPassword = await bcrypt.hash(Math.random().toString(36), 10);
    const status = role.toUpperCase() === 'PROVIDER' ? 'pending' : 'active';

    const { data, error } = await supabase.from('users').insert([{
      name, email, password: hashedPassword, role: role.toUpperCase(), status, created_at: new Date().toISOString(), phone_number
    }]).select().single();

    if (error) throw error;
    const token = jwt.sign({ id: data.id, role: data.role, name, email, status }, JWT_SECRET, { expiresIn: '8h' });
    res.status(201).json({ token, ...data });
  } catch (e) {
    res.status(400).json({ message: 'Invalid token' });
  }
});

// Contact Requests
app.post('/api/contact-requests', async (req, res) => {
  const { client_id, client_name, provider_id, provider_name, message, task_description, estimated_budget } = req.body;
  try {
    const { data, error } = await supabase.from('contact_requests').insert([{
      client_id, client_name, provider_id, provider_name, message, task_description, estimated_budget, status: 'pending', created_at: new Date().toISOString()
    }]).select().single();
    if (error) throw error;
    res.status(201).json({ id: data.id, message: 'Request submitted', status: 'pending' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create request' });
  }
});

app.get('/api/contact-requests', async (req, res) => {
  const { data, error } = await supabase.from('contact_requests').select('*').order('created_at', { ascending: false });
  res.json(data || []);
});

app.get('/api/contact-requests/client/:clientId', async (req, res) => {
  const { data, error } = await supabase.from('contact_requests').select('*').eq('client_id', req.params.clientId).order('created_at', { ascending: false });
  res.json(data || []);
});

app.get('/api/contact-requests/provider/:providerId', async (req, res) => {
  const { data, error } = await supabase.from('contact_requests').select('*').eq('provider_id', req.params.providerId).eq('status', 'approved').order('approved_at', { ascending: false });
  res.json(data || []);
});

app.put('/api/contact-requests/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const approved_at = status === 'approved' ? new Date().toISOString() : null;

  try {
    const { data: request } = await supabase.from('contact_requests').select('*, client:users!client_id(*), provider:users!provider_id(*)').eq('id', id).single();
    if (!request) return res.status(404).json({ message: 'Not found' });

    await supabase.from('contact_requests').update({ status, approved_at }).eq('id', id);
    global.recordLog(`Request ${status}`, 'admin@kind.com', 'Success', `${status} for ${request.client_name}`);

    if (status === 'approved') {
      const { data: systemUser } = await supabase.from('users').select('id').eq('email', 'system@kind.app').single();
      if (systemUser) {
        const autoMsg = `Hello ${request.client_name}, your request has been approved. Terms & 50% deposit apply.`;
        await supabase.from('messages').insert([{ contact_request_id: id, sender_id: systemUser.id, sender_name: 'KIND App', sender_role: 'SYSTEM', message: autoMsg }]);
      }
    }
    res.json({ message: `Request ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error' });
  }
});

app.post('/api/messages', async (req, res) => {
  const { contact_request_id, sender_id, sender_name, sender_role, message } = req.body;
  try {
    const { data, error } = await supabase.from('messages').insert([{
      contact_request_id, sender_id, sender_name, sender_role, message, created_at: new Date().toISOString()
    }]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ message: 'Failed' });
  }
});

app.get('/api/messages/:contactRequestId', async (req, res) => {
  const { data, error } = await supabase.from('messages').select('*').eq('contact_request_id', req.params.contactRequestId).order('created_at', { ascending: true });
  res.json(data || []);
});

app.get('/api/alerts', async (req, res) => {
  const { data } = await supabase.from('alerts').select('*').order('created_at', { ascending: false });
  res.json(data || []);
});

app.delete('/api/alerts', async (req, res) => {
  await supabase.from('alerts').delete().neq('id', 0);
  res.json({ message: 'Cleared' });
});

app.get('/api/logs', async (req, res) => {
  const { data } = await supabase.from('logs').select('*').order('timestamp', { ascending: false });
  res.json(data || []);
});

app.delete('/api/logs', async (req, res) => {
  await supabase.from('logs').delete().neq('id', 0);
  res.json({ message: 'Cleared' });
});

app.get('/', (req, res) => res.send('KIND Server Active'));

app.listen(PORT, () => console.log(`Server on ${PORT}`));
