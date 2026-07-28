const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dbFolder = path.join(__dirname, "database");

console.log("Database folder:", dbFolder);

if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
}

const dbPath = path.join(dbFolder, "student_portal.db");

console.log("Database path:", dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.log("❌ Database Error:", err.message);
    } else {
        console.log("✅ SQLite Connected");
    }
});

module.exports = db;