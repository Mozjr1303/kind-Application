const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.db');

db.all("SELECT id, name, email, role, service, location FROM users", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(rows);
    }
    db.close();
});
