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

const clientUser = {
  id: 7,
  name: 'Client',
  email: 'client@example.test',
  role: 'CLIENT',
  status: 'active',
  phone_number: null
};

function createTestDatabase(user = clientUser) {
  const state = { updates: [] };
  const db = {
    from(table) {
      return new Query(table, state, user);
    }
  };
  return { db, state };
}

class Query {
  constructor(table, state, user) {
    this.table = table;
    this.state = state;
    this.user = user;
    this.filters = [];
    this.operation = 'select';
  }

  select() {
    return this;
  }

  eq(column, value) {
    this.filters.push([column, value]);
    return this;
  }

  insert(value) {
    this.operation = 'insert';
    this.value = value;
    return this;
  }

  update(value) {
    this.operation = 'update';
    this.value = value;
    this.state.updates.push({ table: this.table, value });
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  single() {
    return Promise.resolve(this.result());
  }

  maybeSingle() {
    return Promise.resolve(this.result());
  }

  then(resolve, reject) {
    return Promise.resolve(this.result()).then(resolve, reject);
  }

  result() {
    if (this.table === 'users' && this.operation === 'select') {
      const requestedId = this.filters.find(([column]) => column === 'id')?.[1];
      return { data: requestedId == null || String(requestedId) === String(this.user.id) ? this.user : null, error: null };
    }
    if (this.table === 'users' && this.operation === 'update') {
      return { data: { ...this.user, ...this.value }, error: null };
    }
    return { data: this.value ?? [], error: null };
  }
}

function signedToken(user = clientUser) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('API authorization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated admin requests with 401', async () => {
    const { db } = createTestDatabase();
    const app = createApp({ db, jwtSecret: process.env.JWT_SECRET, allowedOrigins: ['http://localhost:3000'] });

    await request(app).get('/api/admin/pending-providers').expect(401);
  });

  it('rejects a client calling an admin route with 403', async () => {
    const { db } = createTestDatabase();
    const app = createApp({ db, jwtSecret: process.env.JWT_SECRET, allowedOrigins: ['http://localhost:3000'] });

    await request(app)
      .get('/api/admin/pending-providers')
      .set('Authorization', `Bearer ${signedToken()}`)
      .expect(403);
  });

  it('does not allow a user to edit another user', async () => {
    const { db, state } = createTestDatabase();
    const app = createApp({ db, jwtSecret: process.env.JWT_SECRET, allowedOrigins: ['http://localhost:3000'] });

    await request(app)
      .put('/api/users/99')
      .set('Authorization', `Bearer ${signedToken()}`)
      .send({ name: 'Changed' })
      .expect(403);
    expect(state.updates).toHaveLength(0);
  });

  it('ignores an attempted role change in a profile update', async () => {
    const { db, state } = createTestDatabase();
    const app = createApp({ db, jwtSecret: process.env.JWT_SECRET, allowedOrigins: ['http://localhost:3000'] });

    await request(app)
      .put('/api/users/7')
      .set('Authorization', `Bearer ${signedToken()}`)
      .send({ role: 'ADMIN' })
      .expect(200);

    expect(state.updates).toHaveLength(0);
    expect(clientUser.role).toBe('CLIENT');
  });
});
