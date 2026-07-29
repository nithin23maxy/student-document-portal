const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const MemoryStore = require("memorystore")(session);
const fs = require("fs");

const db = require("./database.js");
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const studentRoutes = require("./routes/studentRoutes");

const app = express();

// Trust reverse proxy for cloud deployments (Render, Railway, Heroku, Nginx)
app.set("trust proxy", 1);

// Enable CORS & Body Parsers
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Production-ready Session Store (prevents memory leaks & MemoryStore warning on deployment)
app.use(session({
    store: new MemoryStore({
        checkPeriod: 24 * 60 * 60 * 1000 // Prune expired entries every 24 hours
    }),
    secret: process.env.SESSION_SECRET || "student-document-portal-secret-key-2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true
    }
}));

// Serve uploaded PDF files with automatic database restoration fallback
app.get("/uploads/:filename", (req, res, next) => {
    let filename = req.params.filename;
    try {
        filename = decodeURIComponent(filename);
    } catch (e) {}

    const uploadDir = path.join(__dirname, "uploads");
    const filePath = path.join(uploadDir, filename);

    res.setHeader("Content-Type", "application/pdf");

    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }

    // If file is missing on disk, recover from SQLite database file_data BLOB fallback
    db.get(
        "SELECT file_data, filename, filepath FROM students WHERE filepath = ? OR filename = ? OR filepath LIKE ?",
        [filename, filename, `%${filename}`],
        (err, row) => {
            if (!err && row && row.file_data) {
                try {
                    const fileBuffer = Buffer.isBuffer(row.file_data) 
                        ? row.file_data 
                        : Buffer.from(row.file_data, "base64");

                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }
                    
                    const actualPath = path.join(uploadDir, row.filepath || filename);
                    fs.writeFileSync(actualPath, fileBuffer);
                    console.log(`⚡ Restored missing disk file from database fallback: ${row.filepath || filename}`);

                    res.setHeader("Content-Type", "application/pdf");
                    res.setHeader("Content-Disposition", `inline; filename="${row.filename || filename}"`);
                    return res.send(fileBuffer);
                } catch (restoreErr) {
                    console.error("Failed to restore PDF from database:", restoreErr.message);
                }
            }
            res.status(404).send("PDF Document not found.");
        }
    );
});
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================= API Route Mounts =================
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/document", documentRoutes); // Singular alias compatibility
app.use("/api/student", studentRoutes);
app.use("/api/students", documentRoutes); // Students list alias compatibility

// API Test Route
app.get("/api/test", (req, res) => {
    res.json({ success: true, message: "Student Document Portal Server is Running" });
});

// Legacy /login endpoint compatibility
app.post("/login", (req, res, next) => {
    req.url = "/api/auth/login";
    app._router.handle(req, res, next);
});

// Protected page route checks
app.get("/admin.html", (req, res, next) => {
    if (!req.session || (!req.session.admin && !req.session.user)) {
        return res.redirect("/login.html");
    }
    next();
});

app.get("/upload.html", (req, res, next) => {
    if (!req.session || (!req.session.admin && !req.session.user)) {
        return res.redirect("/login.html");
    }
    next();
});

// Serve frontend client static files
app.use(express.static(path.join(__dirname, "../client")));

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