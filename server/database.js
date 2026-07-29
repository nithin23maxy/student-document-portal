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
                file_data BLOB,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migration: ensure columns doc_title, file_size & file_data exist if table was created earlier
        db.run("ALTER TABLE students ADD COLUMN doc_title TEXT DEFAULT 'Document'", (err) => {});
        db.run("ALTER TABLE students ADD COLUMN file_size INTEGER DEFAULT 0", (err) => {});
        db.run("ALTER TABLE students ADD COLUMN file_data BLOB", (err) => {});

        // Backfill missing file_data BLOB from disk uploads directory for existing rows
        db.all("SELECT id, filepath FROM students WHERE file_data IS NULL", [], (err, rows) => {
            if (!err && rows && rows.length > 0) {
                rows.forEach(r => {
                    backfillFileData(r.filepath);
                });
            }
        });

        // Disk-to-DB Auto-Healing: Recover any orphan upload files from disk into DB
        syncOrphanedDiskFiles();

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
                if (!err && row && row.count === 0) {
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
            // Store binary BLOB in SQLite for auto-healing persistence (up to 50MB)
            if (buffer.length <= 50 * 1024 * 1024) {
                db.run(
                    "UPDATE students SET file_data = ?, file_size = ? WHERE filepath = ?",
                    [buffer, buffer.length, filepath]
                );
            } else {
                db.run("UPDATE students SET file_size = ? WHERE filepath = ?", [buffer.length, filepath]);
            }
        } catch (e) {
            console.warn("Backfill file_data failed for:", filepath, e.message);
        }
    }
}

function syncOrphanedDiskFiles() {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        return;
    }

    try {
        const filesOnDisk = fs.readdirSync(uploadDir).filter(f => f.toLowerCase().endsWith(".pdf"));

        db.all("SELECT filepath, file_data, filename FROM students", [], (err, rows) => {
            if (err || !rows) return;

            const registeredFilepaths = new Set(rows.map(r => r.filepath));

            // Restore any disk files missing from disk but present in file_data BLOB
            rows.forEach(r => {
                if (r.filepath && r.file_data) {
                    const diskPath = path.join(uploadDir, r.filepath);
                    if (!fs.existsSync(diskPath)) {
                        try {
                            const buf = Buffer.isBuffer(r.file_data) ? r.file_data : Buffer.from(r.file_data, "base64");
                            fs.writeFileSync(diskPath, buf);
                            console.log(`⚡ Auto-restored missing disk file from database: ${r.filepath}`);
                        } catch (e) {
                            console.warn("Failed auto-restoring disk file:", r.filepath, e.message);
                        }
                    }
                }
            });

            if (filesOnDisk.length === 0) return;

            // Register any orphaned files on disk not found in database
            filesOnDisk.forEach(filename => {
                if (!registeredFilepaths.has(filename)) {
                    const fullPath = path.join(uploadDir, filename);
                    let fileSize = 0;
                    let fileBuffer = null;

                    try {
                        const stat = fs.statSync(fullPath);
                        fileSize = stat.size;
                        if (fileSize <= 50 * 1024 * 1024) {
                            fileBuffer = fs.readFileSync(fullPath);
                        }
                    } catch (e) {}

                    let originalName = filename;
                    if (filename.includes("-")) {
                        originalName = filename.split("-").slice(1).join("-") || filename;
                    }

                    console.log(`📦 Auto-registering orphaned upload file into DB: ${filename}`);
                    db.run(
                        `INSERT INTO students (usn, name, department, doc_title, filename, filepath, file_size, file_data)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        ["RECOVERED", "Recovered Document", "General", originalName, originalName, filename, fileSize, fileBuffer],
                        (err) => {
                            if (err) {
                                console.error("Failed to register orphaned file:", filename, err.message);
                            }
                        }
                    );
                }
            });
        });
    } catch (e) {
        console.warn("Disk-to-DB sync warning:", e.message);
    }
}

module.exports = db;