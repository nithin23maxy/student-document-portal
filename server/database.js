const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dbPath = path.join(process.cwd(), "student_portal.db");

console.log("SQLite database path:", dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.log("❌ Database Error:", err.message);
    } else {
        console.log("✅ SQLite Connected");
    }
});

module.exports = db;