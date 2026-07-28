const express = require("express");
const path = require("path");
const cors = require("cors");

// Database
const db = require("./database");

// Routes
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const studentRoutes = require("./routes/studentRoutes");

const app = express();

// =====================================
// Middleware
// =====================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================================
// Static Files
// =====================================
app.use(express.static(path.join(__dirname, "../client")));

// Serve uploaded PDFs
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =====================================
// API Routes
// =====================================
app.use("/api/auth", authRoutes);
app.use("/api/document", documentRoutes);
app.use("/api/student", studentRoutes);

// =====================================
// Home
// =====================================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/index.html"));
});

// =====================================
// Test API
// =====================================
app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Student Document Portal Server Running Successfully 🚀"
    });
});

// =====================================
// Database Check
// =====================================
app.get("/api/database", (req, res) => {

    db.get("SELECT sqlite_version() AS version", (err, row) => {

        if (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        res.json({
            success: true,
            message: "SQLite Connected Successfully",
            sqliteVersion: row.version
        });

    });

});

// =====================================
// Health Check
// =====================================
app.get("/health", (req, res) => {
    res.json({
        success: true,
        status: "Server Running"
    });
});
// ================= View All Students =================
app.get("/api/students", (req, res) => {

    db.all("SELECT * FROM students", (err, rows) => {

        if (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        res.json({
            success: true,
            students: rows
        });

    });

});

// =====================================
// 404 Handler
// =====================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route Not Found"
    });
});

// =====================================
// Start Server
// =====================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("====================================");
    console.log(" Student Document Portal Started");
    console.log(` http://localhost:${PORT}`);
    console.log("====================================");
});