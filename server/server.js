const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");

const db = require("./database.js");
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const studentRoutes = require("./routes/studentRoutes");

const app = express();

// Enable CORS & Body Parsers
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session
app.use(session({
    secret: "student-document-portal-secret-key-2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true
    }
}));

// Serve uploaded PDF files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve frontend client static files
app.use(express.static(path.join(__dirname, "../client")));

// API Route Mounts
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/document", documentRoutes); // Singular alias compatibility
app.use("/api/student", studentRoutes);
app.use("/api/students", documentRoutes); // Students list alias compatibility

// Test Route
app.get("/api/test", (req, res) => {
    res.json({ success: true, message: "Student Document Portal Server is Running" });
});

// Legacy /login endpoint compatibility
app.post("/login", (req, res, next) => {
    req.url = "/api/auth/login";
    app._router.handle(req, res, next);
});

// Protected page route check for admin.html
app.get("/admin.html", (req, res, next) => {
    if (!req.session || (!req.session.admin && !req.session.user)) {
        return res.redirect("/login.html");
    }
    next();
});

// SPA / Direct link fallback to client/index.html
app.use((req, res) => {
    res.sendFile(path.join(__dirname, "../client/index.html"));
});

// Server Listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("==================================================");
    console.log(" 🎓 Student Document Portal Server Started");
    console.log(` 🌐 Server URL: http://localhost:${PORT}`);
    console.log("==================================================");
});