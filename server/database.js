const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcrypt");

// Create/Open Database
const db = new sqlite3.Database(
    path.join(__dirname, "database", "documents.db"),
    (err) => {
        if (err) {
            console.error("❌ Database Error:", err.message);
        } else {
            console.log("✅ SQLite Connected");
            createAdmin(); // Create default admin only after DB connects
        }
    }
);

// Create Admin Table
db.run(`
CREATE TABLE IF NOT EXISTS admins(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
)
`);

// Create Students Table
db.run(`
CREATE TABLE IF NOT EXISTS students(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usn TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL
)
`);

// Create Default Admin
async function createAdmin() {

    const hash = await bcrypt.hash("admin123", 10);

    db.get(
        "SELECT * FROM admins WHERE username = ?",
        ["admin"],
        (err, row) => {

            if (err) {
                console.error(err.message);
                return;
            }

            if (!row) {

                db.run(
                    "INSERT INTO admins(username, password) VALUES(?, ?)",
                    ["admin", hash],
                    () => {
                        console.log("✅ Default Admin Created");
                        console.log("Username: admin");
                        console.log("Password: admin123");
                    }
                );

            }

        }
    );

}

module.exports = db;