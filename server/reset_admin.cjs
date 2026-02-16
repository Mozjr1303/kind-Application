const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./data.db');

const newPassword = 'admin123';

bcrypt.hash(newPassword, 10, (err, hash) => {
    if (err) {
        console.error('Error hashing password:', err);
        db.close();
        return;
    }

    db.run(
        "UPDATE users SET password = ? WHERE email = 'admin@kind.local'",
        [hash],
        function (updateErr) {
            if (updateErr) {
                console.error('Error updating password:', updateErr);
            } else {
                console.log('✅ Admin password reset successfully!');
                console.log('Email: admin@kind.local');
                console.log('Password: admin123');
            }
            db.close();
        }
    );
});
