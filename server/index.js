require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize AfricasTalking SMS
const AfricasTalking = require('africastalking');
const africastalking = AfricasTalking({
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME
});

app.use(cors());
app.use(bodyParser.json());

const dbPath = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not open database', err);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      service TEXT,
      location TEXT,
      status TEXT DEFAULT 'active',
      motivation TEXT,
      qualifications TEXT,
      photo_url TEXT,
      rating REAL DEFAULT 0,
      jobs_done INTEGER DEFAULT 0
    )`
  );

  // Contact requests table
  db.run(
    `CREATE TABLE IF NOT EXISTS contact_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      client_name TEXT NOT NULL,
      provider_id INTEGER NOT NULL,
      provider_name TEXT NOT NULL,
      message TEXT,
      task_description TEXT,
      estimated_budget TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      approved_at TEXT,
      FOREIGN KEY (client_id) REFERENCES users(id),
      FOREIGN KEY (provider_id) REFERENCES users(id)
    )`
  );

  // Messages table for chat conversations
  db.run(
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_request_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      read_at TEXT,
      FOREIGN KEY (contact_request_id) REFERENCES contact_requests(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )`
  );

  // Alerts table
  db.run(
    `CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )`, () => {
    // Seed initial alerts if table is empty
    db.get("SELECT COUNT(*) as count FROM alerts", (err, row) => {
      if (!err && row.count === 0) {
        const now = new Date().toISOString();
        db.run("INSERT INTO alerts (title, message, severity, created_at) VALUES (?, ?, ?, ?)", ["High Server Load", "Server CPU usage has exceeded 85% for the last 15 minutes.", "critical", now]);
        db.run("INSERT INTO alerts (title, message, severity, created_at) VALUES (?, ?, ?, ?)", ["System Maintenance Scheduled", "Routine maintenance is scheduled for Sunday at 2:00 AM UTC.", "info", now]);
        db.run("INSERT INTO alerts (title, message, severity, created_at) VALUES (?, ?, ?, ?)", ["Payment Gateway Issue Resolved", "The connectivity issue with the payment provider has been resolved.", "success", now]);
        db.run("INSERT INTO alerts (title, message, severity, created_at) VALUES (?, ?, ?, ?)", ["New Client Registration Spike", "Unusual number of new client registrations detected from IP block 192.168.x.x.", "warning", now]);
      }
    });
  }
  );

  // Logs table
  db.run(
    `CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      user TEXT NOT NULL,
      status TEXT NOT NULL,
      detail TEXT
    )`, () => {
    // Seed initial logs if table is empty
    db.get("SELECT COUNT(*) as count FROM logs", (err, row) => {
      if (!err && row.count === 0) {
        const now = new Date().toISOString();
        db.run("INSERT INTO logs (timestamp, action, user, status, detail) VALUES (?, ?, ?, ?, ?)", [now, 'System Startup', 'System', 'Success', 'Server started successfully']);
        db.run("INSERT INTO logs (timestamp, action, user, status, detail) VALUES (?, ?, ?, ?, ?)", [now, 'Database Sync', 'System', 'Success', 'All tables validated']);
      }
    });
  }
  );

  // Helper to record logs
  const recordLog = (action, user, status, detail) => {
    const now = new Date().toISOString();
    db.run(
      "INSERT INTO logs (timestamp, action, user, status, detail) VALUES (?, ?, ?, ?, ?)",
      [now, action, user, status, detail]
    );
  };
  global.recordLog = recordLog;

  // Attempt to add columns if they don't exist (for existing DBs)
  db.run("ALTER TABLE users ADD COLUMN service TEXT", (err) => { });
  db.run("ALTER TABLE users ADD COLUMN location TEXT", (err) => { });
  db.run("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'", (err) => { });
  db.run("ALTER TABLE users ADD COLUMN subscription_end TEXT", (err) => { });
  db.run("ALTER TABLE users ADD COLUMN phone_number TEXT", (err) => { });
  db.run("ALTER TABLE users ADD COLUMN motivation TEXT", (err) => { });
  db.run("ALTER TABLE users ADD COLUMN qualifications TEXT", (err) => { });
  db.run("ALTER TABLE users ADD COLUMN photo_url TEXT", (err) => { });
  db.run("ALTER TABLE users ADD COLUMN rating REAL DEFAULT 0", (err) => { });
  db.run("ALTER TABLE users ADD COLUMN jobs_done INTEGER DEFAULT 0", (err) => { });
  db.run("ALTER TABLE contact_requests ADD COLUMN estimated_budget TEXT", (err) => { });
  db.run("ALTER TABLE users ADD COLUMN certificates_url TEXT", (err) => { });

  // Seed system user for automated chat notifications
  const systemEmail = 'system@kind.app';
  db.get('SELECT id FROM users WHERE email = ?', [systemEmail], (err, row) => {
    if (!err && !row) {
      bcrypt.hash('system-no-login', 10).then(hashed => {
        db.run(
          "INSERT INTO users (name, email, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          ['KIND App', systemEmail, hashed, 'SYSTEM', 'active', new Date().toISOString()]
        );
      });
    }
  });
});

// Passport Configuration
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback",
  passReqToCallback: true
},
  function (req, accessToken, refreshToken, profile, cb) {
    return cb(null, profile);
  }
));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "/api/auth/facebook/callback",
  profileFields: ['id', 'emails', 'name'],
  passReqToCallback: true
},
  function (req, accessToken, refreshToken, profile, cb) {
    return cb(null, profile);
  }
));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Search Providers Endpoint (Active only)
app.get('/api/providers', (req, res) => {
  const { service, location } = req.query;
  let query = "SELECT id, name, role, service, location, created_at, motivation, qualifications, photo_url, rating, jobs_done FROM users WHERE role = 'PROVIDER' AND status = 'active'";
  const params = [];

  if (service) {
    query += " AND service LIKE ?";
    params.push(`%${service}%`);
  }
  if (location) {
    query += " AND location LIKE ?";
    params.push(`%${location}%`);
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(rows);
  });
});

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role, phone_number } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      if (row) return res.status(400).json({ message: 'Email already registered' });

      const hashed = await bcrypt.hash(password, 10);
      const now = new Date().toISOString();
      const normalizedRole = role.trim().toUpperCase();
      const status = normalizedRole === 'PROVIDER' ? 'pending' : 'active';

      db.run(
        'INSERT INTO users (name, email, password, role, status, created_at, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, email, hashed, normalizedRole, status, now, phone_number || null],
        function (insertErr) {
          if (insertErr) {
            console.error('Insert error', insertErr);
            return res.status(500).json({ message: 'Could not create user' });
          }

          // Send SMS notification if it's a new provider
          if (role.toUpperCase() === 'PROVIDER') {
            const adminPhone = process.env.ADMIN_PHONE_NUMBER;

            if (adminPhone) {
              const message = `Afri Talk Alert: New provider registered!\nName: ${name}\nEmail: ${email}\nPhone: ${phone_number || 'N/A'}\nStatus: Pending approval`;

              const sms = africastalking.SMS;
              sms.send({
                to: [adminPhone],
                message: message
              })
                .then(response => {
                  console.log('SMS sent successfully:', response);
                })
                .catch(error => {
                  console.error('SMS sending failed:', error);
                });
            }
          }

          res.status(201).json({ id: this.lastID, name, email, role, status });
        }
      );
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Missing email or password' });

  db.get('SELECT id, name, email, password, role, service, location, status, phone_number, motivation, qualifications, photo_url, rating, jobs_done FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (!row) return res.status(400).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, row.password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: row.id, role: row.role, name: row.name, email: row.email, status: row.status }, JWT_SECRET, { expiresIn: '8h' });
    res.json({
      token,
      id: row.id,
      role: row.role,
      name: row.name,
      email: row.email,
      service: row.service,
      location: row.location,
      status: row.status,
      phone_number: row.phone_number,
      motivation: row.motivation,
      qualifications: row.qualifications,
      photo_url: row.photo_url,
      certificates_url: row.certificates_url,
      rating: row.rating,
      jobs_done: row.jobs_done
    });
  });
});

app.get('/api/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' });
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    db.get('SELECT id, name, email, role, service, location, status, subscription_end, phone_number, motivation, qualifications, photo_url, certificates_url, rating, jobs_done FROM users WHERE id = ?', [decoded.id], (err, row) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      if (row) {
        res.json({ user: row });
      } else {
        res.json({ user: decoded });
      }
    });
  } catch (e) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Admin: Get Pending Providers
app.get('/api/admin/pending-providers', (req, res) => {
  db.all("SELECT id, name, email, role, service, location, created_at, phone_number FROM users WHERE UPPER(role) = 'PROVIDER' AND status = 'pending'", [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(rows);
  });
});

// Admin: Approve/Reject Provider
app.put('/api/admin/providers/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  // First, get the provider details
  db.get(
    'SELECT name, email, service, phone_number FROM users WHERE id = ? AND role = "PROVIDER"',
    [id],
    (err, provider) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database error' });
      }
      if (!provider) {
        return res.status(404).json({ message: 'Provider not found' });
      }

      // Update the status
      db.run(
        'UPDATE users SET status = ? WHERE id = ? AND role = "PROVIDER"',
        [status, id],
        function (updateErr) {
          if (updateErr) {
            console.error(updateErr);
            return res.status(500).json({ message: 'Database error' });
          }

          // Record system log
          global.recordLog(
            status === 'active' ? 'Approve Provider' : 'Reject Provider',
            'admin@kind.com',
            'Success',
            `${status === 'active' ? 'Approved' : 'Rejected'} provider: ${provider.name} (${provider.email})`
          );

          // Send SMS notification to admin
          const sms = africastalking.SMS;
          const adminPhone = process.env.ADMIN_PHONE_NUMBER;

          if (adminPhone) {
            const statusText = status === 'active' ? 'APPROVED' : 'REJECTED';
            const adminMessage = `KIND Alert: Provider ${statusText}!\nName: ${provider.name}\nEmail: ${provider.email}\nService: ${provider.service || 'N/A'}\nStatus: ${statusText}`;

            sms.send({
              to: [adminPhone],
              message: adminMessage
            })
              .then(response => {
                console.log('Provider status notification sent:', response);
              })
              .catch(error => {
                console.error('Provider status SMS failed:', error);
              });
          }

          // Notify the provider as well if they have a phone number
          if (provider.phone_number) {
            const providerMessage = `Hello ${provider.name}, your provider account on KIND has been ${status === 'active' ? 'APPROVED' : 'REJECTED'}. ${status === 'active' ? 'You can now log in.' : 'Please contact support.'}`;

            sms.send({
              to: [provider.phone_number],
              message: providerMessage
            })
              .then(response => console.log('Provider notified:', response))
              .catch(error => console.error('Provider notification failed:', error));
          }

          res.json({ message: `Provider ${status}` });
        }
      );
    }
  );
});

app.get('/api/users', (req, res) => {
  db.all('SELECT id, name, email, role, service, location, status, created_at, phone_number, motivation, qualifications, photo_url, certificates_url, rating, jobs_done FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(rows);
  });
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, role, service, location, phone_number, motivation, qualifications, photo_url, certificates_url } = req.body;

  db.run(
    'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role), service = COALESCE(?, service), location = COALESCE(?, location), phone_number = COALESCE(?, phone_number), motivation = COALESCE(?, motivation), qualifications = COALESCE(?, qualifications), photo_url = COALESCE(?, photo_url), certificates_url = COALESCE(?, certificates_url) WHERE id = ?',
    [name, email, role, service, location, phone_number, motivation, qualifications, photo_url, certificates_url, id],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database error' });
      }
      if (this.changes === 0) return res.status(404).json({ message: 'User not found' });

      db.get('SELECT id, name, email, role, service, location, created_at, phone_number, motivation, qualifications, photo_url, certificates_url, rating, jobs_done FROM users WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ message: 'Error fetching updated user' });
        res.json(row);
      });
    }
  );
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;

  // Get user info for logging before delete
  db.get('SELECT name, role FROM users WHERE id = ?', [id], (err, user) => {
    if (!err && user) {
      global.recordLog(
        `Delete ${user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()}`,
        'admin@kind.com',
        'Success',
        `Deleted user: ${user.name}`
      );
    }
  });

  // Clean up related contact requests first
  db.run('DELETE FROM contact_requests WHERE client_id = ? OR provider_id = ?', [id, id], (err) => {
    if (err) console.error('Error cleaning contact_requests', err);
  });

  db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error' });
    }
    if (this.changes === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  });
});

app.delete('/api/contact-requests/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM contact_requests WHERE id = ?', [id], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error' });
    }
    if (this.changes === 0) return res.status(404).json({ message: 'Request not found' });
    res.json({ message: 'Contact request deleted' });
  });
});

// Helper to handle OAuth success
const handleOAuthCallback = async (req, res, provider) => {
  const profile = req.user;
  const email = profile.emails ? profile.emails[0].value : null;
  const name = profile.displayName || `${profile.name.givenName} ${profile.name.familyName}`;

  if (!email) {
    return res.redirect('/login?error=No email provided by ' + provider);
  }

  db.get('SELECT id, name, email, role, service, location, status, phone_number FROM users WHERE email = ?', [email], (err, row) => {
    if (err) return res.redirect('/login?error=Database error');

    if (row) {
      // User exists - Login
      const token = jwt.sign({ id: row.id, role: row.role, name: row.name, email: row.email, status: row.status }, JWT_SECRET, { expiresIn: '8h' });
      res.redirect(`http://localhost:3000/#/oauth-callback?token=${token}&role=${row.role}&name=${encodeURIComponent(row.name)}&id=${row.id}&status=${row.status}`);
    } else {
      // User is NEW - Redirect to frontend to select role
      const registerToken = jwt.sign({ name, email, provider }, JWT_SECRET, { expiresIn: '1h' });
      res.redirect(`http://localhost:3000/#/oauth-callback?registerToken=${registerToken}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`);
    }
  });
};

// OAuth Routes
app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/api/auth/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), (req, res) => handleOAuthCallback(req, res, 'Google'));

app.get('/api/auth/facebook', passport.authenticate('facebook', { scope: ['public_profile', 'email'] }));
app.get('/api/auth/facebook/callback', passport.authenticate('facebook', { session: false, failureRedirect: '/login' }), (req, res) => handleOAuthCallback(req, res, 'Facebook'));

// Complete OAuth Registration
app.post('/api/auth/oauth-complete', async (req, res) => {
  const { registerToken, role, phone_number } = req.body;

  if (!registerToken || !role) {
    return res.status(400).json({ message: 'Missing token or role' });
  }

  try {
    const decoded = jwt.verify(registerToken, JWT_SECRET);
    const { name, email } = decoded;

    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      if (row) return res.status(400).json({ message: 'User already exists' });

      const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
      const now = new Date().toISOString();
      const status = role.toUpperCase() === 'PROVIDER' ? 'pending' : 'active';

      db.run(
        'INSERT INTO users (name, email, password, role, status, created_at, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, email, randomPassword, role.toUpperCase(), status, now, phone_number || null],
        function (insertErr) {
          if (insertErr) {
            console.error('Insert error', insertErr);
            return res.status(500).json({ message: 'Could not create user' });
          }

          const newUser = { id: this.lastID, name, email, role: role.toUpperCase(), status, phone_number };
          const token = jwt.sign(newUser, JWT_SECRET, { expiresIn: '8h' });
          res.status(201).json({ token, ...newUser });
        }
      );
    });
  } catch (e) {
    return res.status(400).json({ message: 'Invalid or expired registration token' });
  }
});

app.post('/api/contact-requests', (req, res) => {
  const { client_id, client_name, provider_id, provider_name, message, task_description, estimated_budget } = req.body;

  if (!client_id || !provider_id) {
    return res.status(400).json({ message: 'Client ID and Provider ID are required' });
  }

  const created_at = new Date().toISOString();

  db.run(
    `INSERT INTO contact_requests (client_id, client_name, provider_id, provider_name, message, task_description, estimated_budget, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [client_id, client_name, provider_id, provider_name, message || '', task_description || '', estimated_budget || '', created_at],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to create contact request' });
      }
      res.status(201).json({
        id: this.lastID,
        message: 'Job request submitted to admin for approval',
        status: 'pending'
      });
    }
  );
});

app.get('/api/contact-requests', (req, res) => {
  db.all(
    `SELECT * FROM contact_requests ORDER BY created_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Client-side view of their own contact requests (conversations)
app.get('/api/contact-requests/client/:clientId', (req, res) => {
  const { clientId } = req.params;

  db.all(
    `SELECT * FROM contact_requests
     WHERE client_id = ?
     ORDER BY (approved_at IS NULL) ASC, approved_at DESC, created_at DESC`,
    [clientId],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(rows);
    }
  );
});

app.get('/api/contact-requests/provider/:providerId', (req, res) => {
  const { providerId } = req.params;

  db.all(
    `SELECT * FROM contact_requests WHERE provider_id = ? AND status = 'approved' ORDER BY approved_at DESC`,
    [providerId],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(rows);
    }
  );
});

app.put('/api/contact-requests/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const approved_at = status === 'approved' ? new Date().toISOString() : null;

  // First, get the contact request details
  db.get(
    `SELECT cr.*, 
            c.name as client_name, c.email as client_email, c.phone_number as client_phone,
            p.name as provider_name, p.email as provider_email, p.service as provider_service, p.phone_number as provider_phone
     FROM contact_requests cr
     JOIN users c ON cr.client_id = c.id
     JOIN users p ON cr.provider_id = p.id
     WHERE cr.id = ?`,
    [id],
    (err, request) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database error' });
      }
      if (!request) {
        return res.status(404).json({ message: 'Contact request not found' });
      }

      // Update the status
      db.run(
        `UPDATE contact_requests SET status = ?, approved_at = ? WHERE id = ?`,
        [status, approved_at, id],
        function (updateErr) {
          if (updateErr) {
            console.error(updateErr);
            return res.status(500).json({ message: 'Database error' });
          }
          // Record system log
          global.recordLog(
            status === 'approved' ? 'Approve Request' : 'Reject Request',
            'admin@kind.com',
            'Success',
            `${status === 'approved' ? 'Approved' : 'Rejected'} request from ${request.client_name} for ${request.provider_name}`
          );

          // If approved, send an automated "KIND App" message to the client
          if (status === 'approved') {
            db.get("SELECT id FROM users WHERE email = 'system@kind.app'", (systemErr, systemUser) => {
              if (!systemErr && systemUser) {
                const autoMessage = `Hello ${request.client_name}, your request to connect with ${request.provider_name} has been received and approved. \n\nPlease note: By proceeding, you agree to our Terms and Conditions. A minimum of 50% commitment/deposit is required to proceed with the work. The exact amount and terms will be covered in the official agreement document that your administrator will send shortly.`;
                const now = new Date().toISOString();

                db.run(
                  "INSERT INTO messages (contact_request_id, sender_id, sender_name, sender_role, message, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                  [id, systemUser.id, 'KIND App', 'SYSTEM', autoMessage, now]
                );
              }
            });

            const sms = africastalking.SMS;
            const adminPhone = process.env.ADMIN_PHONE_NUMBER;

            // 1. Notify Admin
            if (adminPhone) {
              const adminMessage = `KIND Alert: Contact request approved!\nClient: ${request.client_name}\nProvider: ${request.provider_name}\nService: ${request.provider_service || 'N/A'}`;

              sms.send({
                to: [adminPhone],
                message: adminMessage
              })
                .then(response => console.log('Admin notification sent:', response))
                .catch(error => console.error('Admin SMS failed:', error));
            }

            // 2. Notify Client (The user who requested the contact)
            if (request.client_phone) {
              const clientMessage = `Good news! Your request for ${request.provider_name} (${request.provider_service}) has been APPROVED. Contact them at: ${request.provider_phone || request.provider_email}.`;

              sms.send({
                to: [request.client_phone],
                message: clientMessage
              })
                .then(response => console.log('Client notification sent:', response))
                .catch(error => console.error('Client SMS failed:', error));
            }

            // 3. Notify Provider (Optional: Let them know someone is interested)
            if (request.provider_phone) {
              const providerMessage = `Hello ${request.provider_name}, a new client (${request.client_name}) has been given your contact details.`;

              sms.send({
                to: [request.provider_phone],
                message: providerMessage
              })
                .then(response => console.log('Provider notification sent:', response))
                .catch(error => console.error('Provider SMS failed:', error));
            }
          }

          res.json({ message: `Contact request ${status}` });
        }
      );
    }
  );
});

// Messages API Endpoints
app.post('/api/messages', (req, res) => {
  const { contact_request_id, sender_id, sender_name, sender_role, message } = req.body;

  if (!contact_request_id || !sender_id || !sender_name || !sender_role || !message) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const created_at = new Date().toISOString();

  db.run(
    `INSERT INTO messages (contact_request_id, sender_id, sender_name, sender_role, message, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [contact_request_id, sender_id, sender_name, sender_role, message, created_at],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to send message' });
      }
      res.status(201).json({
        id: this.lastID,
        contact_request_id,
        sender_id,
        sender_name,
        sender_role,
        message,
        created_at
      });
    }
  );
});

app.get('/api/messages/:contactRequestId', (req, res) => {
  const { contactRequestId } = req.params;

  db.all(
    `SELECT * FROM messages 
     WHERE contact_request_id = ? 
     ORDER BY created_at ASC`,
    [contactRequestId],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(rows);
    }
  );
});

app.put('/api/messages/:messageId/read', (req, res) => {
  const { messageId } = req.params;
  const read_at = new Date().toISOString();

  db.run(
    `UPDATE messages SET read_at = ? WHERE id = ?`,
    [read_at, messageId],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json({ message: 'Message marked as read' });
    }
  );
});

// Alerts API
app.get('/api/alerts', (req, res) => {
  db.all("SELECT * FROM alerts ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(rows);
  });
});

app.put('/api/alerts/:id/read', (req, res) => {
  db.run("UPDATE alerts SET is_read = 1 WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json({ message: 'Alert marked as read' });
  });
});

app.put('/api/alerts/read-all', (req, res) => {
  db.run("UPDATE alerts SET is_read = 1", [], function (err) {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json({ message: 'All alerts marked as read' });
  });
});

app.delete('/api/alerts/:id', (req, res) => {
  db.run("DELETE FROM alerts WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json({ message: 'Alert deleted' });
  });
});

app.delete('/api/alerts', (req, res) => {
  db.run("DELETE FROM alerts", [], function (err) {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json({ message: 'All alerts cleared' });
  });
});

// Logs API
app.get('/api/logs', (req, res) => {
  db.all("SELECT * FROM logs ORDER BY timestamp DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(rows);
  });
});

app.delete('/api/logs/:id', (req, res) => {
  db.run("DELETE FROM logs WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json({ message: 'Log entry deleted' });
  });
});

app.delete('/api/logs', (req, res) => {
  db.run("DELETE FROM logs", [], function (err) {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json({ message: 'All logs cleared' });
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
