const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { z } = require('zod');
const { createAuthMiddleware } = require('./middleware/auth');
const { calculateDistanceKm, isInsideLilongwe } = require('./lilongweConfig');

const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 4000;

const nameSchema = z.string().trim().min(1).max(120);
const emailSchema = z.string().trim().email().max(254);
const phoneSchema = z.string().trim().max(32).optional().or(z.literal(''));
const roleSchema = z.enum(['client', 'provider']);
const contactStatusSchema = z.enum(['accepted', 'declined', 'cancelled']);
const providerStatusEnum = z.enum(['active', 'rejected', 'suspended']);
const idSchema = z.string().regex(/^\d+$/);

const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: z.string().min(8).max(128),
  role: roleSchema,
  phone_number: phoneSchema
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128)
});

const oauthCompleteSchema = z.object({
  registerToken: z.string().min(1).max(4096),
  role: roleSchema,
  phone_number: phoneSchema
});

const providerStatusSchema = z.object({ status: providerStatusEnum });

const profileSchema = z.object({
  name: nameSchema.optional(),
  phone_number: phoneSchema,
  service: z.string().trim().max(120).optional(),
  location: z.string().trim().max(160).optional(),
  area_name: z.string().trim().max(120).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  motivation: z.string().trim().max(4000).optional(),
  qualifications: z.string().trim().max(4000).optional(),
  photo_url: z.string().trim().max(2000000).refine(val => val === '' || /^https?:\/\/.+/i.test(val) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(val), { message: 'Invalid photo format.' }).optional(),
  certificates_url: z.string().trim().max(5000000).optional().or(z.literal(''))
});

const providersQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(25).default(10),
  service: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

const contactCreateSchema = z.object({
  provider_id: z.union([z.string().regex(/^\d+$/), z.number().int().positive()]),
  message: z.string().trim().min(1).max(2000),
  task_description: z.string().trim().max(2000).optional(),
  estimated_budget: z.string().trim().max(80).optional()
});

const contactUpdateSchema = z.object({ status: contactStatusSchema });
const messageCreateSchema = z.object({
  contact_request_id: z.union([z.string().regex(/^\d+$/), z.number().int().positive()]),
  message: z.string().trim().min(1).max(2000)
});

function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request body.', errors: parsed.error.issues.map(issue => ({ path: issue.path, message: issue.message })) });
    }
    req.body = parsed.data;
    next();
  };
}

function normalizeRole(role) {
  return String(role).toUpperCase();
}

function normalizeContactStatus(status) {
  const normalized = String(status).toLowerCase();
  if (normalized === 'approved') return 'accepted';
  if (normalized === 'rejected') return 'declined';
  return normalized;
}

function createSmsClient() {
  if (!process.env.AFRICASTALKING_API_KEY || !process.env.AFRICASTALKING_USERNAME) return null;
  const AfricasTalking = require('africastalking');
  return AfricasTalking({
    apiKey: process.env.AFRICASTALKING_API_KEY,
    username: process.env.AFRICASTALKING_USERNAME
  });
}

function createApp({
  db = require('./supabase'),
  jwtSecret = JWT_SECRET,
  smsClient = createSmsClient(),
  passportInstance = passport,
  allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)
} = {}) {
  const app = express();
  const { authenticate, requireRole } = createAuthMiddleware({ db, jwtSecret });

  if (allowedOrigins.length === 0) throw new Error('ALLOWED_ORIGINS must contain at least one allowed origin.');

  const corsMiddleware = cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS.'));
    }
  });
  const loginRegisterLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
  const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false });

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(corsMiddleware);
  app.use(express.json({ limit: '5mb' }));
  app.use('/api', (req, res, next) => {
    if (['/login', '/register'].includes(req.path)) return next();
    return generalLimiter(req, res, next);
  });

  const recordLog = async (action, user, status, detail) => {
    try {
      const { error } = await db.from('logs').insert([{
        action,
        user,
        status,
        detail,
        timestamp: new Date().toISOString()
      }]);
      if (error) {
        console.error('Error recording log:', error.message);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Log failure:', error.message);
      return false;
    }
  };
  app.locals.recordLog = recordLog;

  app.get('/api', (req, res) => res.json({ message: 'KIND Service API is running' }));

  app.post('/api/register', loginRegisterLimiter, validate(registerSchema), async (req, res) => {
    const { name, email, password, role, phone_number } = req.body;
    try {
      const { data: existingUser, error: lookupError } = await db.from('users').select('id').eq('email', email).maybeSingle();
      if (lookupError) throw lookupError;
      if (existingUser) return res.status(409).json({ message: 'User already exists.' });

      const status = role === 'provider' ? 'pending' : 'active';
      const { data, error } = await db.from('users').insert([{
        name, email, password: await bcrypt.hash(password, 12), role: role.toUpperCase(), status,
        created_at: new Date().toISOString(), phone_number
      }]).select('id, name, email, role, status').single();
      if (error) throw error;

      const token = jwt.sign({ id: data.id }, jwtSecret, { expiresIn: '8h' });
      return res.status(201).json({ message: 'User created', token, user: data });
    } catch (error) {
      console.error('Registration failed:', error.message);
      return res.status(500).json({ message: 'Registration failed.' });
    }
  });

  app.post('/api/login', loginRegisterLimiter, validate(loginSchema), async (req, res) => {
    try {
      const { data: user, error } = await db.from('users').select('*').eq('email', req.body.email).maybeSingle();
      if (error) throw error;
      if (!user || ['suspended', 'rejected'].includes(String(user.status).toLowerCase()) ||
          !(await bcrypt.compare(req.body.password, user.password))) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }
      const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '8h' });
      const { password: _password, ...safeUser } = user;
      return res.json({ token, user: safeUser });
    } catch (error) {
      console.error('Login failed:', error.message);
      return res.status(500).json({ message: 'Login unavailable.' });
    }
  });

  app.get('/api/me', authenticate, async (req, res) => {
    const { data, error } = await db.from('users')
      .select('id, name, email, role, service, location, area_name, latitude, longitude, status, phone_number, motivation, qualifications, photo_url, certificates_url, rating, jobs_done')
      .eq('id', req.user.id).single();
    if (error) return res.status(500).json({ message: 'Could not load profile.' });
    return res.json({ user: data });
  });

  app.get('/api/providers', authenticate, async (req, res) => {
    const userRole = normalizeRole(req.user.role);
    if (!['CLIENT', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({ message: 'Access denied. Client or Admin role required.' });
    }

    const queryParsed = providersQuerySchema.safeParse(req.query);
    if (!queryParsed.success) {
      return res.status(400).json({
        message: 'Invalid query parameters.',
        errors: queryParsed.error.issues.map(issue => ({ path: issue.path, message: issue.message }))
      });
    }

    const { lat, lng, radiusKm, service, limit, offset } = queryParsed.data;

    try {
      let query = db.from('users')
        .select('id, name, service, area_name, location, latitude, longitude, qualifications, photo_url, rating, jobs_done')
        .eq('role', 'PROVIDER')
        .eq('status', 'active');

      if (service) {
        query = query.ilike('service', `%${service}%`);
      }

      const { data: providers, error } = await query;
      if (error) throw error;

      const validProviders = (providers || [])
        .filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number' && isInsideLilongwe(p.latitude, p.longitude))
        .map(p => {
          const distanceKm = calculateDistanceKm(lat, lng, p.latitude, p.longitude);
          return {
            id: p.id,
            name: p.name,
            service: p.service,
            area_name: p.area_name || p.location || 'Lilongwe',
            latitude: Number(p.latitude.toFixed(3)),
            longitude: Number(p.longitude.toFixed(3)),
            qualifications: p.qualifications || null,
            photo_url: p.photo_url || null,
            rating: p.rating || 0,
            jobs_done: p.jobs_done || 0,
            distance_km: distanceKm
          };
        })
        .filter(p => p.distance_km <= radiusKm)
        .sort((a, b) => a.distance_km - b.distance_km);

      const paginated = validProviders.slice(offset, offset + limit);

      return res.json({
        providers: paginated,
        total: validProviders.length,
        limit,
        offset
      });
    } catch (err) {
      console.error('Provider search error:', err.message);
      return res.status(500).json({ message: 'Database error.' });
    }
  });

  app.get('/api/providers/:id', authenticate, async (req, res) => {
    if (!idSchema.safeParse(req.params.id).success) {
      return res.status(400).json({ message: 'Invalid provider ID.' });
    }

    try {
      const { data: provider, error } = await db.from('users')
        .select('id, name, service, location, area_name, latitude, longitude, qualifications, motivation, photo_url, rating, jobs_done, created_at, role, status')
        .eq('id', req.params.id)
        .maybeSingle();

      if (error) throw error;
      if (!provider || normalizeRole(provider.role) !== 'PROVIDER' || String(provider.status).toLowerCase() !== 'active') {
        return res.status(404).json({ message: 'Provider not found.' });
      }

      return res.json({
        id: provider.id,
        name: provider.name,
        service: provider.service,
        location: provider.area_name || provider.location || 'Lilongwe',
        area_name: provider.area_name || provider.location || 'Lilongwe',
        latitude: provider.latitude != null ? Number(provider.latitude.toFixed(3)) : null,
        longitude: provider.longitude != null ? Number(provider.longitude.toFixed(3)) : null,
        qualifications: provider.qualifications || null,
        motivation: provider.motivation || null,
        photo_url: provider.photo_url || null,
        rating: provider.rating || 0,
        jobs_done: provider.jobs_done || 0,
        created_at: provider.created_at
      });
    } catch (err) {
      console.error('Provider fetch error:', err.message);
      return res.status(500).json({ message: 'Database error.' });
    }
  });

  app.get('/api/admin/pending-providers', authenticate, requireRole('ADMIN'), async (req, res) => {
    const { data, error } = await db.from('users')
      .select('id, name, email, role, service, location, status, created_at, phone_number')
      .eq('role', 'PROVIDER').eq('status', 'pending');
    if (error) return res.status(500).json({ message: 'Database error.' });
    return res.json(data || []);
  });

  app.put('/api/admin/providers/:id/status', authenticate, requireRole('ADMIN'), (req, res, next) => {
    if (!idSchema.safeParse(req.params.id).success) return res.status(400).json({ message: 'Invalid provider ID.' });
    return validate(providerStatusSchema)(req, res, next);
  }, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      const { data: provider, error: providerError } = await db.from('users')
        .select('id, name, email, service, phone_number')
        .eq('id', id).eq('role', 'PROVIDER').single();
      if (providerError || !provider) return res.status(404).json({ message: 'Provider not found.' });
      const { error } = await db.from('users').update({ status }).eq('id', id).eq('role', 'PROVIDER');
      if (error) throw error;

      await recordLog(status === 'active' ? 'Approve Provider' : 'Change Provider Status',
        req.user.email, 'Success', `${status} provider ID ${id}`);
      if (smsClient) {
        const sms = smsClient.SMS;
        const sends = [];
        if (process.env.ADMIN_PHONE_NUMBER) {
          sends.push({
            to: [process.env.ADMIN_PHONE_NUMBER],
            message: `KIND Alert: Provider ${status.toUpperCase()}!\nName: ${provider.name}\nEmail: ${provider.email}`
          });
        }
        if (provider.phone_number) {
          sends.push({ to: [provider.phone_number], message: `Hello ${provider.name}, your account status is ${status}.` });
        }
        for (const smsPayload of sends) {
          try {
            await sms.send(smsPayload);
          } catch (smsError) {
            console.error('Provider status SMS failed:', smsError.message);
          }
        }
      }
      return res.json({ message: `Provider status changed to ${status}.` });
    } catch (error) {
      console.error('Provider status update failed:', error.message);
      return res.status(500).json({ message: 'Database error.' });
    }
  });

  app.get('/api/users', authenticate, requireRole('ADMIN'), async (req, res) => {
    const { data, error } = await db.from('users')
      .select('id, name, email, role, service, location, area_name, latitude, longitude, status, created_at, phone_number, motivation, qualifications, photo_url, certificates_url, rating, jobs_done');
    if (error) return res.status(500).json({ message: 'Database error.' });
    return res.json(data || []);
  });

  app.put('/api/users/:id', authenticate, (req, res, next) => {
    if (!idSchema.safeParse(req.params.id).success) return res.status(400).json({ message: 'Invalid user ID.' });
    if (String(req.user.id) !== req.params.id && normalizeRole(req.user.role) !== 'ADMIN') {
      return res.status(403).json({ message: 'You may only edit your own profile.' });
    }
    return validate(profileSchema)(req, res, () => {
      const providerFields = ['service', 'motivation', 'qualifications', 'photo_url', 'certificates_url'];
      if (normalizeRole(req.user.role) === 'CLIENT' && providerFields.some(field => field in req.body)) {
        return res.status(403).json({ message: 'Provider profile fields are not editable for client accounts.' });
      }
      const { latitude, longitude } = req.body;
      if (latitude !== undefined || longitude !== undefined) {
        if (latitude !== null && longitude !== null) {
          if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            return res.status(400).json({ message: 'Both latitude and longitude must be valid numbers.' });
          }
          if (!isInsideLilongwe(latitude, longitude)) {
            return res.status(400).json({ message: 'Location must be within the Lilongwe service area (within 25 km of Lilongwe centre).' });
          }
        } else if (latitude !== longitude) {
          return res.status(400).json({ message: 'Both latitude and longitude must be provided together.' });
        }
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (Object.keys(req.body).length === 0) {
        const { data, error } = await db.from('users')
          .select('id, name, email, role, status, phone_number, service, location, area_name, latitude, longitude, motivation, qualifications, photo_url, certificates_url')
          .eq('id', req.params.id).single();
        if (error) throw error;
        return res.json(data);
      }
      const { data, error } = await db.from('users').update(req.body).eq('id', req.params.id)
        .select('id, name, email, role, status, phone_number, service, location, area_name, latitude, longitude, motivation, qualifications, photo_url, certificates_url')
        .single();
      if (error) throw error;
      return res.json(data);
    } catch (error) {
      console.error('Profile update failed:', error.message);
      return res.status(500).json({ message: 'Database error.' });
    }
  });

  app.delete('/api/users/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    if (!idSchema.safeParse(id).success) return res.status(400).json({ message: 'Invalid user ID.' });
    if (String(req.user.id) === id) return res.status(400).json({ message: 'Admins cannot delete their own account.' });
    try {
      const { data: target, error: targetError } = await db.from('users').select('id, name, role').eq('id', id).single();
      if (targetError || !target) return res.status(404).json({ message: 'User not found.' });
      if (normalizeRole(target.role) === 'ADMIN') {
        const { count, error: countError } = await db.from('users').select('id', { count: 'exact', head: true }).eq('role', 'ADMIN');
        if (countError) throw countError;
        if ((count || 0) <= 1) return res.status(409).json({ message: 'Cannot delete the last administrator.' });
      }

      const { data: requests, error: requestsError } = await db.from('contact_requests')
        .select('id').or(`client_id.eq.${id},provider_id.eq.${id}`);
      if (requestsError) throw requestsError;
      const requestIds = (requests || []).map(request => request.id);
      const { error: sentMessagesError } = await db.from('messages').delete().eq('sender_id', id);
      if (sentMessagesError) throw sentMessagesError;
      if (requestIds.length) {
        const { error: messagesError } = await db.from('messages').delete().in('contact_request_id', requestIds);
        if (messagesError) throw messagesError;
        const { error: deleteRequestsError } = await db.from('contact_requests').delete().in('id', requestIds);
        if (deleteRequestsError) throw deleteRequestsError;
      }
      const { error: deleteUserError } = await db.from('users').delete().eq('id', id);
      if (deleteUserError) throw deleteUserError;
      await recordLog('Delete User', req.user.email, 'Success', `Deleted user ID ${id}`);
      return res.json({ message: 'User deleted.' });
    } catch (error) {
      console.error('User deletion failed:', error.message);
      return res.status(500).json({ message: 'Database error.' });
    }
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passportInstance.use(new (require('passport-google-oauth20').Strategy)({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback'
    }, (accessToken, refreshToken, profile, done) => done(null, profile)));
  }
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passportInstance.use(new (require('passport-facebook').Strategy)({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: '/api/auth/facebook/callback',
      profileFields: ['id', 'displayName', 'emails', 'name']
    }, (accessToken, refreshToken, profile, done) => done(null, profile)));
  }

  const oauthUnavailable = (req, res) => res.status(503).json({ message: 'OAuth provider is not configured.' });
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get('/api/auth/google', passportInstance.authenticate('google', { scope: ['profile', 'email'] }));
    app.get('/api/auth/google/callback', passportInstance.authenticate('google', { session: false, failureRedirect: '/login' }),
      (req, res) => handleOAuthCallback(req, res, db, jwtSecret, 'Google'));
  } else {
    app.get('/api/auth/google', oauthUnavailable);
    app.get('/api/auth/google/callback', oauthUnavailable);
  }
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    app.get('/api/auth/facebook', passportInstance.authenticate('facebook', { scope: ['public_profile', 'email'] }));
    app.get('/api/auth/facebook/callback', passportInstance.authenticate('facebook', { session: false, failureRedirect: '/login' }),
      (req, res) => handleOAuthCallback(req, res, db, jwtSecret, 'Facebook'));
  } else {
    app.get('/api/auth/facebook', oauthUnavailable);
    app.get('/api/auth/facebook/callback', oauthUnavailable);
  }

  app.post('/api/auth/oauth-complete', validate(oauthCompleteSchema), async (req, res) => {
    try {
      const decoded = jwt.verify(req.body.registerToken, jwtSecret);
      if (typeof decoded !== 'object' || !decoded.email || !decoded.name) {
        return res.status(400).json({ message: 'Invalid registration token.' });
      }
      const { data: existingUser, error: lookupError } = await db.from('users').select('id').eq('email', decoded.email).maybeSingle();
      if (lookupError) throw lookupError;
      if (existingUser) return res.status(409).json({ message: 'User already exists.' });

      const status = req.body.role === 'provider' ? 'pending' : 'active';
      const { data, error } = await db.from('users').insert([{
        name: decoded.name,
        email: decoded.email,
        password: await bcrypt.hash(require('crypto').randomBytes(32).toString('hex'), 12),
        role: req.body.role.toUpperCase(),
        status,
        phone_number: req.body.phone_number,
        created_at: new Date().toISOString()
      }]).select('id, name, email, role, status, phone_number').single();
      if (error) throw error;

      const token = jwt.sign({ id: data.id }, jwtSecret, { expiresIn: '8h' });
      return res.status(201).json({ token, user: data });
    } catch (error) {
      console.error('OAuth registration failed:', error.message);
      return res.status(400).json({ message: 'Invalid registration token.' });
    }
  });

  app.post('/api/contact-requests', authenticate, requireRole('CLIENT'), validate(contactCreateSchema), async (req, res) => {
    try {
      const { data: provider, error: providerError } = await db.from('users')
        .select('id, name, role, status').eq('id', req.body.provider_id).single();
      if (providerError || !provider || normalizeRole(provider.role) !== 'PROVIDER' || provider.status !== 'active') {
        return res.status(404).json({ message: 'Active provider not found.' });
      }
      const { data, error } = await db.from('contact_requests').insert([{
        client_id: req.user.id,
        client_name: req.user.name,
        provider_id: provider.id,
        provider_name: provider.name,
        message: req.body.message,
        task_description: req.body.task_description,
        estimated_budget: req.body.estimated_budget,
        status: 'pending',
        created_at: new Date().toISOString()
      }]).select('id, status').single();
      if (error) throw error;
      return res.status(201).json({ id: data.id, message: 'Request submitted.', status: data.status });
    } catch (error) {
      console.error('Contact request creation failed:', error.message);
      return res.status(500).json({ message: 'Failed to create request.' });
    }
  });

  app.get('/api/contact-requests', authenticate, requireRole('ADMIN'), async (req, res) => {
    const { data, error } = await db.from('contact_requests').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ message: 'Database error.' });
    return res.json(data || []);
  });

  app.get('/api/contact-requests/client/:clientId', authenticate, async (req, res) => {
    if (!idSchema.safeParse(req.params.clientId).success) return res.status(400).json({ message: 'Invalid client ID.' });
    if (String(req.user.id) !== req.params.clientId && normalizeRole(req.user.role) !== 'ADMIN') {
      return res.status(403).json({ message: 'You may only view your own requests.' });
    }
    if (normalizeRole(req.user.role) !== 'ADMIN' && normalizeRole(req.user.role) !== 'CLIENT') {
      return res.status(403).json({ message: 'Client access required.' });
    }
    const { data, error } = await db.from('contact_requests').select('*').eq('client_id', req.params.clientId).order('created_at', { ascending: false });
    if (error) return res.status(500).json({ message: 'Database error.' });
    return res.json(data || []);
  });

  app.get('/api/contact-requests/provider/:providerId', authenticate, async (req, res) => {
    if (!idSchema.safeParse(req.params.providerId).success) return res.status(400).json({ message: 'Invalid provider ID.' });
    if (String(req.user.id) !== req.params.providerId && normalizeRole(req.user.role) !== 'ADMIN') {
      return res.status(403).json({ message: 'You may only view your own requests.' });
    }
    if (normalizeRole(req.user.role) !== 'ADMIN' && normalizeRole(req.user.role) !== 'PROVIDER') {
      return res.status(403).json({ message: 'Provider access required.' });
    }
    const { data, error } = await db.from('contact_requests').select('*').eq('provider_id', req.params.providerId)
      .in('status', ['pending', 'accepted', 'approved']).order('created_at', { ascending: false });
    if (error) return res.status(500).json({ message: 'Database error.' });
    return res.json(data || []);
  });

  app.put('/api/contact-requests/:id', authenticate, validate(contactUpdateSchema), async (req, res) => {
    if (!idSchema.safeParse(req.params.id).success) return res.status(400).json({ message: 'Invalid request ID.' });
    try {
      const { data: request, error: requestError } = await db.from('contact_requests').select('*').eq('id', req.params.id).single();
      if (requestError || !request) return res.status(404).json({ message: 'Contact request not found.' });

      const isAdmin = normalizeRole(req.user.role) === 'ADMIN';
      const isProvider = String(request.provider_id) === String(req.user.id);
      const isClient = String(request.client_id) === String(req.user.id);
      const nextStatus = req.body.status;
      const currentStatus = normalizeContactStatus(request.status);
      const allowed = isAdmin ||
        (isProvider && normalizeRole(req.user.role) === 'PROVIDER' && currentStatus === 'pending' && ['accepted', 'declined'].includes(nextStatus)) ||
        (isClient && normalizeRole(req.user.role) === 'CLIENT' && ['pending', 'accepted'].includes(currentStatus) && nextStatus === 'cancelled');
      if (!allowed) return res.status(403).json({ message: 'You cannot make this status change.' });
      if (!isAdmin && currentStatus !== 'pending' && !(isClient && currentStatus === 'accepted' && nextStatus === 'cancelled')) {
        return res.status(409).json({ message: 'This request can no longer be changed.' });
      }
      if (!isAdmin && ['declined', 'cancelled'].includes(currentStatus) && nextStatus !== currentStatus) {
        return res.status(409).json({ message: 'Declined or cancelled requests cannot be reopened.' });
      }

      const updates = { status: nextStatus, approved_at: nextStatus === 'accepted' ? new Date().toISOString() : null };
      const { error: updateError } = await db.from('contact_requests').update(updates).eq('id', req.params.id);
      if (updateError) throw updateError;
      await recordLog(`Request ${nextStatus}`, req.user.email, 'Success', `Request ID ${req.params.id}`);
      if (nextStatus === 'accepted') {
        const { data: systemUser } = await db.from('users').select('id').eq('email', 'system@kind.app').maybeSingle();
        if (systemUser) {
          await db.from('messages').insert([{
            contact_request_id: request.id, sender_id: systemUser.id, sender_name: 'KIND App',
            sender_role: 'SYSTEM', message: `Hello ${request.client_name}, your request has been accepted.`
          }]);
        }
      }
      return res.json({ message: `Request ${nextStatus}.` });
    } catch (error) {
      console.error('Contact request status update failed:', error.message);
      return res.status(500).json({ message: 'Could not update request.' });
    }
  });

  app.post('/api/messages', authenticate, validate(messageCreateSchema), async (req, res) => {
    try {
      const { data: request, error: requestError } = await db.from('contact_requests')
        .select('id, client_id, provider_id, status').eq('id', req.body.contact_request_id).single();
      if (requestError || !request) return res.status(404).json({ message: 'Conversation not found.' });
      const participant = [request.client_id, request.provider_id].some(id => String(id) === String(req.user.id));
      if (!participant) return res.status(403).json({ message: 'You are not a participant in this conversation.' });
      if (!['pending', 'accepted'].includes(normalizeContactStatus(request.status))) {
        return res.status(409).json({ message: 'Messages are unavailable for this request.' });
      }
      const { data, error } = await db.from('messages').insert([{
        contact_request_id: request.id,
        sender_id: req.user.id,
        sender_name: req.user.name,
        sender_role: normalizeRole(req.user.role),
        message: req.body.message,
        created_at: new Date().toISOString()
      }]).select('id, contact_request_id, sender_id, sender_name, sender_role, message, created_at').single();
      if (error) throw error;
      return res.status(201).json(data);
    } catch (error) {
      console.error('Message creation failed:', error.message);
      return res.status(500).json({ message: 'Failed to send message.' });
    }
  });

  app.get('/api/messages/:contactRequestId', authenticate, async (req, res) => {
    const { data: request, error: requestError } = await db.from('contact_requests')
      .select('id, client_id, provider_id, status').eq('id', req.params.contactRequestId).single();
    if (requestError || !request) return res.status(404).json({ message: 'Conversation not found.' });
    const participant = [request.client_id, request.provider_id].some(id => String(id) === String(req.user.id));
    if (!participant) return res.status(403).json({ message: 'You are not a participant in this conversation.' });
    if (!['pending', 'accepted'].includes(normalizeContactStatus(request.status))) {
      return res.status(409).json({ message: 'Messages are unavailable for this request.' });
    }
    const { data, error } = await db.from('messages').select('*').eq('contact_request_id', request.id).order('created_at', { ascending: true });
    if (error) return res.status(500).json({ message: 'Database error.' });
    return res.json(data || []);
  });

  app.get('/api/alerts', authenticate, requireRole('ADMIN'), async (req, res) => {
    const { data, error } = await db.from('alerts').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ message: 'Database error.' });
    return res.json(data || []);
  });

  app.delete('/api/alerts', authenticate, requireRole('ADMIN'), async (req, res) => {
    const { error } = await db.from('alerts').delete().neq('id', 0);
    if (error) return res.status(500).json({ message: 'Could not clear alerts.' });
    const audited = await recordLog('Clear Alerts', req.user.email, 'Success', 'All alerts cleared');
    if (!audited) return res.status(500).json({ message: 'Alerts cleared, but the audit log could not be written.' });
    return res.json({ message: 'Alerts cleared.' });
  });

  app.get('/api/logs', authenticate, requireRole('ADMIN'), async (req, res) => {
    const { data, error } = await db.from('logs').select('*').order('timestamp', { ascending: false });
    if (error) return res.status(500).json({ message: 'Database error.' });
    return res.json(data || []);
  });

  app.delete('/api/logs', authenticate, requireRole('ADMIN'), async (req, res) => {
    const { error } = await db.from('logs').delete().neq('id', 0);
    if (error) return res.status(500).json({ message: 'Could not clear logs.' });
    const audited = await recordLog('Clear Logs', req.user.email, 'Success', 'All logs cleared');
    if (!audited) return res.status(500).json({ message: 'Logs cleared, but the audit entry could not be written.' });
    return res.json({ message: 'Logs cleared.' });
  });

  app.get('/', (req, res) => res.send('KIND Server Active'));
  return app;
}

async function handleOAuthCallback(req, res, db, jwtSecret, providerName) {
  const profile = req.user;
  const email = profile?.emails?.[0]?.value;
  const name = profile?.displayName || [profile?.name?.givenName, profile?.name?.familyName].filter(Boolean).join(' ');
  if (!email || !name) return res.redirect('/login?error=No%20email');

  try {
    const { data: user, error } = await db.from('users').select('id, name, email, role, status, phone_number').eq('email', email).maybeSingle();
    if (error) throw error;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${req.headers.host}`;
    if (user) {
      if (['suspended', 'rejected'].includes(String(user.status).toLowerCase())) {
        return res.redirect(`${baseUrl}/login?error=Account%20unavailable`);
      }
      const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '8h' });
      const params = new URLSearchParams({ token, user: JSON.stringify(user) });
      return res.redirect(`${baseUrl}/oauth-callback?${params}`);
    }
    const registerToken = jwt.sign({ name, email, provider: providerName }, jwtSecret, { expiresIn: '1h' });
    return res.redirect(`${baseUrl}/oauth-callback?registerToken=${encodeURIComponent(registerToken)}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`);
  } catch (error) {
    console.error('OAuth callback failed:', error.message);
    return res.redirect('/login?error=Database%20error');
  }
}

const requiredEnv = ['JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS'];
const missingRequiredEnv = () => requiredEnv.filter(name => !process.env[name]);

if (require.main === module) {
  const missingEnv = missingRequiredEnv();
  if (missingEnv.length) {
    console.error(`Missing required server environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
  }
  const app = createApp();
  app.listen(PORT, () => console.log(`Server on ${PORT}`));
}

const missingEnv = require.main === module ? [] : missingRequiredEnv();
if (missingEnv.length) throw new Error(`Missing required server environment variables: ${missingEnv.join(', ')}`);
const serverlessApp = require.main === module ? null : createApp();
module.exports = serverlessApp || {};
module.exports.createApp = createApp;
module.exports.validate = validate;
