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

        // Migration: ensure columns doc_title, file_size & file_data exist if table was created earlier
        db.run("ALTER TABLE students ADD COLUMN doc_title TEXT DEFAULT 'Document'", (err) => {});
        db.run("ALTER TABLE students ADD COLUMN file_size INTEGER DEFAULT 0", (err) => {});
        db.run("ALTER TABLE students ADD COLUMN file_data TEXT", (err) => {});

        // Legacy database migration: import from documents.db if it exists
        const legacyDbPath = path.join(dbFolder, "documents.db");
        if (fs.existsSync(legacyDbPath)) {
            const legacyDb = new sqlite3.Database(legacyDbPath, (err) => {
                if (!err) {
                    legacyDb.all("SELECT * FROM students", [], (err, rows) => {
                        if (!err && rows && rows.length > 0) {
                            rows.forEach(row => {
                                const usn = row.usn || "";
                                const name = row.name || "";
                                const dept = row.department || "";
                                const docTitle = row.doc_title || row.filename || "Document";
                                const filename = row.filename || "";
                                const filepath = row.filepath || "";
                                const fileSize = row.file_size || 0;

                                db.get("SELECT id FROM students WHERE filepath = ?", [filepath], (err, existing) => {
                                    if (!err && !existing && filepath) {
                                        db.run(
                                            `INSERT INTO students (usn, name, department, doc_title, filename, filepath, file_size)
                                             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                            [usn, name, dept, docTitle, filename, filepath, fileSize],
                                            (err) => {
                                                if (!err) {
                                                    console.log(`📦 Restored legacy document for USN ${usn}: ${filename}`);
                                                    backfillFileData(filepath);
                                                }
                                            }
                                        );
                                    }
                                });
                            });
                        }
                    });
                }
            });
        }

        // Backfill missing file_data from disk uploads directory for existing rows
        db.all("SELECT id, filepath FROM students WHERE file_data IS NULL OR file_data = ''", [], (err, rows) => {
            if (!err && rows && rows.length > 0) {
                rows.forEach(r => {
                    backfillFileData(r.filepath);
                });
            }
        });

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

function backfillFileData(filepath) {
    if (!filepath) return;
    const diskPath = path.join(__dirname, "uploads", filepath);
    if (fs.existsSync(diskPath)) {
        try {
            const buffer = fs.readFileSync(diskPath);
            const base64 = buffer.toString("base64");
            const fileSize = buffer.length;
            db.run(
                "UPDATE students SET file_data = ?, file_size = ? WHERE filepath = ?",
                [base64, fileSize, filepath]
            );
        } catch (e) {
            console.warn("Backfill file_data failed for:", filepath, e.message);
        }
    }
}

module.exports = db;