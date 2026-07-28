const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");

const dbFolder = path.join(__dirname, "database");

// Create database folder if missing
if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
}

const dbPath = path.join(dbFolder, "studentportal.db");

console.log("SQLite database path:", dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.log("❌ Database Error:", err.message);
    } else {
        console.log("✅ SQLite Connected");
        initTables();
    }
});

function initTables() {
    db.serialize(() => {
        // Students table
        db.run(`
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usn TEXT NOT NULL,
                name TEXT NOT NULL,
                department TEXT NOT NULL,
                doc_title TEXT DEFAULT 'Document',
                filename TEXT NOT NULL,
                filepath TEXT NOT NULL,
                file_size INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Admins table
        db.run(`
            CREATE TABLE IF NOT EXISTS admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, () => {
            // Seed default admin if missing
            db.get("SELECT COUNT(*) AS count FROM admins", async (err, row) => {
                if (!err && row.count === 0) {
                    const defaultPassword = "admin123";
                    const saltRounds = 10;
                    const hash = await bcrypt.hash(defaultPassword, saltRounds);

                    db.run(
                        `INSERT INTO admins (username, email, password) VALUES (?, ?, ?)`,
                        ["admin", "admin@gmail.com", hash],
                        (err) => {
                            if (!err) {
                                console.log("🔑 Default admin seeded: admin@gmail.com / admin123");
                            }
                        }
                    );
                }
            });
        });
    });
}

module.exports = db;