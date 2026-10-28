import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.JWT_SECRET = 'test-signing-secret';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

const require = createRequire(import.meta.url);
const { createApp } = require('../index.js');
const { LILONGWE_CENTER } = require('../lilongweConfig.js');

const clientUser = {
  id: 1,
  name: 'Client User',
  email: 'client@example.test',
  role: 'CLIENT',
  status: 'active',
  phone_number: '+265991111111'
};

const providerUser = {
  id: 2,
  name: 'Provider User',
  email: 'provider@example.test',
  role: 'PROVIDER',
  status: 'active',
  phone_number: '+265992222222',
  service: 'Plumbing',
  location: 'City Centre',
  area_name: 'City Centre',
  latitude: -13.9535,
  longitude: 33.7885
};

function createMockDatabase({ users = [], providersList = [] } = {}) {
  const updates = [];
  const db = {
    from(table) {
      return {
        _table: table,
        _filters: [],
        _selectCols: '*',
        select(cols) {
          this._selectCols = cols;
          return this;
        },
        eq(col, val) {
          this._filters.push({ col, val, op: 'eq' });
          return this;
        },
        ilike(col, val) {
          this._filters.push({ col, val, op: 'ilike' });
          return this;
        },
        update(val) {
          updates.push({ table, val });
          return {
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { ...val }, error: null })
              })
            })
          };
        },
        single() {
          const user = users.find(u => {
            return this._filters.every(f => f.op === 'eq' ? String(u[f.col]) === String(f.val) : true);
          }) || null;
          return Promise.resolve({ data: user, error: user ? null : { code: 'PGRST116', message: 'Row not found' } });
        },
        maybeSingle() {
          const user = users.find(u => {
            return this._filters.every(f => f.op === 'eq' ? String(u[f.col]) === String(f.val) : true);
          }) || null;
          return Promise.resolve({ data: user, error: null });
        },
        then(resolve) {
          if (table === 'users') {
            let res = [...providersList];
            for (const f of this._filters) {
              if (f.op === 'eq') {
                res = res.filter(item => String(item[f.col]) === String(f.val));
              } else if (f.op === 'ilike') {
                const search = f.val.replace(/%/g, '').toLowerCase();
                res = res.filter(item => String(item[f.col] || '').toLowerCase().includes(search));
              }
            }
            return Promise.resolve({ data: res, error: null }).then(resolve);
          }
          return Promise.resolve({ data: [], error: null }).then(resolve);
        }
      };
    }
  };
  return { db, updates };
}

function signedToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('Lilongwe Location & Providers API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('PUT /api/users/:id location validation', () => {
    it('rejects coordinates outside Lilongwe (e.g. Blantyre)', async () => {
      const { db } = createMockDatabase({ users: [providerUser] });
      const app = createApp({ db, jwtSecret: process.env.JWT_SECRET, allowedOrigins: ['http://localhost:3000'] });

      // Blantyre coordinates (~ -15.7861, 35.0058)
      const res = await request(app)
        .put('/api/users/2')
        .set('Authorization', `Bearer ${signedToken(providerUser)}`)
        .send({
          area_name: 'Blantyre Central',
          latitude: -15.7861,
          longitude: 35.0058
        })
        .expect(400);

      expect(res.body.message).toContain('Lilongwe service area');
    });

    it('accepts coordinates inside Lilongwe service area', async () => {
      const { db, updates } = createMockDatabase({ users: [providerUser] });
      const app = createApp({ db, jwtSecret: process.env.JWT_SECRET, allowedOrigins: ['http://localhost:3000'] });

      // Area 47 coordinates
      await request(app)
        .put('/api/users/2')
        .set('Authorization', `Bearer ${signedToken(providerUser)}`)
        .send({
          area_name: 'Area 47',
          latitude: -13.9450,
          longitude: 33.7600
        })
        .expect(200);

      expect(updates).toHaveLength(1);
      expect(updates[0].val.area_name).toBe('Area 47');
      expect(updates[0].val.latitude).toBe(-13.9450);
    });
  });

  describe('GET /api/providers nearest search', () => {
    const mockProviders = [
      // 1. Provider in Area 18 (near center)
      {
        id: 10,
        name: 'Area 18 Plumber',
        email: 'area18@secret.test',
        phone_number: '+265990000001',
        role: 'PROVIDER',
        status: 'active',
        service: 'Plumbing',
        area_name: 'Area 18',
        latitude: -13.9350,
        longitude: 33.7800,
        qualifications: '10 yrs experience',
        photo_url: 'https://example.com/p1.jpg',
        rating: 4.8,
        jobs_done: 12
      },
      // 2. Provider in Area 47 (closer to test client)
      {
        id: 11,
        name: 'Area 47 Electrician',
        email: 'area47@secret.test',
        phone_number: '+265990000002',
        role: 'PROVIDER',
        status: 'active',
        service: 'Electrical',
        area_name: 'Area 47',
        latitude: -13.9450,
        longitude: 33.7600,
        qualifications: 'Master Electrician',
        photo_url: 'https://example.com/p2.jpg',
        rating: 5.0,
        jobs_done: 25
      },
      // 3. Provider with status 'pending' (MUST NEVER APPEAR)
      {
        id: 12,
        name: 'Pending Provider',
        email: 'pending@secret.test',
        phone_number: '+265990000003',
        role: 'PROVIDER',
        status: 'pending',
        service: 'Plumbing',
        area_name: 'Area 47',
        latitude: -13.9450,
        longitude: 33.7600
      },
      // 4. Provider outside Lilongwe (e.g. Blantyre, MUST BE FILTERED OUT)
      {
        id: 13,
        name: 'Blantyre Provider',
        email: 'bt@secret.test',
        phone_number: '+265990000004',
        role: 'PROVIDER',
        status: 'active',
        service: 'Plumbing',
        area_name: 'Blantyre',
        latitude: -15.7861,
        longitude: 35.0058
      }
    ];

    it('returns approved providers sorted by distance and excludes pending/outside providers', async () => {
      const { db } = createMockDatabase({ users: [clientUser], providersList: mockProviders });
      const app = createApp({ db, jwtSecret: process.env.JWT_SECRET, allowedOrigins: ['http://localhost:3000'] });

      // Search from near Area 47 (-13.9460, 33.7610)
      const res = await request(app)
        .get('/api/providers?lat=-13.9460&lng=33.7610&radiusKm=15')
        .set('Authorization', `Bearer ${signedToken(clientUser)}`)
        .expect(200);

      expect(res.body.providers).toHaveLength(2);
      // Area 47 is closer than Area 18 to (-13.9460, 33.7610)
      expect(res.body.providers[0].name).toBe('Area 47 Electrician');
      expect(res.body.providers[1].name).toBe('Area 18 Plumber');
      expect(res.body.providers[0].distance_km).toBeLessThan(res.body.providers[1].distance_km);

      // Verify privacy-safe fields: never expose email or phone
      for (const p of res.body.providers) {
        expect(p.email).toBeUndefined();
        expect(p.phone_number).toBeUndefined();
        expect(p.distance_km).toBeTypeOf('number');
        // Check rounded coordinates (max 3 decimals)
        const decimals = (p.latitude.toString().split('.')[1] || '').length;
        expect(decimals).toBeLessThanOrEqual(3);
      }
    });

    it('filters by service when specified', async () => {
      const { db } = createMockDatabase({ users: [clientUser], providersList: mockProviders });
      const app = createApp({ db, jwtSecret: process.env.JWT_SECRET, allowedOrigins: ['http://localhost:3000'] });

      const res = await request(app)
        .get('/api/providers?lat=-13.9460&lng=33.7610&service=Plumbing')
        .set('Authorization', `Bearer ${signedToken(clientUser)}`)
        .expect(200);

      expect(res.body.providers.every(p => p.service === 'Plumbing')).toBe(true);
    });

    it('rejects unauthenticated requests with 401', async () => {
      const { db } = createMockDatabase();
      const app = createApp({ db, jwtSecret: process.env.JWT_SECRET, allowedOrigins: ['http://localhost:3000'] });

      await request(app)
        .get('/api/providers?lat=-13.9460&lng=33.7610')
        .expect(401);
    });
  });

  describe('GET /api/providers/:id', () => {
    it('returns public-safe details for an active provider to clients', async () => {
      const activeProvider = {
        id: 6,
        name: 'David',
        email: 'david@secret.test',
        phone_number: '+265991234567',
        role: 'PROVIDER',
        status: 'active',
        service: 'Plumbing',
        area_name: 'Area 18',
        latitude: -13.938,
        longitude: 33.768,
        qualifications: 'Certified plumber',
        motivation: 'Delivering top plumbing service'
      };
      const { db } = createMockDatabase({ users: [clientUser, activeProvider] });
      const app = createApp({ db, jwtSecret: process.env.JWT_SECRET, allowedOrigins: ['http://localhost:3000'] });

      const res = await request(app)
        .get('/api/providers/6')
        .set('Authorization', `Bearer ${signedToken(clientUser)}`)
        .expect(200);

      expect(res.body.name).toBe('David');
      expect(res.body.service).toBe('Plumbing');
      expect(res.body.area_name).toBe('Area 18');
      expect(res.body.email).toBeUndefined();
      expect(res.body.phone_number).toBeUndefined();
    });

    it('returns 404 for a provider that is not found or not active', async () => {
      const pendingProvider = {
        id: 99,
        name: 'Pending Guy',
        role: 'PROVIDER',
        status: 'pending'
      };
      const { db } = createMockDatabase({ users: [clientUser, pendingProvider] });
      const app = createApp({ db, jwtSecret: process.env.JWT_SECRET, allowedOrigins: ['http://localhost:3000'] });

      await request(app)
        .get('/api/providers/99')
        .set('Authorization', `Bearer ${signedToken(clientUser)}`)
        .expect(404);
    });
  });
});
