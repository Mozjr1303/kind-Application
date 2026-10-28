const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = new sqlite3.Database('./data.db');

const resetEmail = process.env.ADMIN_RESET_EMAIL;
const newPassword = process.env.ADMIN_RESET_PASSWORD;
if (!resetEmail || !newPassword) {
    console.error('ADMIN_RESET_EMAIL and ADMIN_RESET_PASSWORD are required.');
    process.exit(1);
}

bcrypt.hash(newPassword, 10, (err, hash) => {
    if (err) {
        console.error('Error hashing password:', err);
        db.close();
        return;
    }

    db.run(
        'UPDATE users SET password = ? WHERE email = ?',
        [hash, resetEmail],
        function (updateErr) {
            if (updateErr) {
                console.error('Error updating password:', updateErr);
            } else {
                console.log('✅ Admin password reset successfully!');
                console.log(`Admin password reset for ${resetEmail}.`);
            }
            db.close();
        }
    );
});
