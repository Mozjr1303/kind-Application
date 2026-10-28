const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

async function main() {
  const [,, name, email, password] = process.argv;
  if (!name || !email || !password) {
    console.error('Usage: node create_admin.js "Full Name" email@example.com "StrongPassword"');
    process.exit(1);
  }

  const dbPath = path.join(__dirname, 'data.db');
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Could not open database', err);
      process.exit(1);
    }
  });

  const hashed = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();

  db.serialize(() => {
    db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
      if (err) {
        console.error('DB error', err);
        process.exit(1);
      }

      if (row) {
        db.run(
          'UPDATE users SET name = ?, password = ?, role = ?, created_at = ? WHERE id = ?',
          [name, hashed, 'ADMIN', now, row.id],
          function (updateErr) {
            if (updateErr) {
              console.error('Failed to update admin user', updateErr);
              process.exit(1);
            }
            console.log(`Updated existing admin user (${email}) with id=${row.id}`);
            process.exit(0);
          }
        );
      } else {
        db.run(
          'INSERT INTO users (name, email, password, role, created_at) VALUES (?, ?, ?, ?, ?)',
          [name, email, hashed, 'ADMIN', now],
          function (insertErr) {
            if (insertErr) {
              console.error('Failed to create admin user', insertErr);
              process.exit(1);
            }
            console.log(`Created admin user (${email}) with id=${this.lastID}`);
            process.exit(0);
          }
        );
      }
    });
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
