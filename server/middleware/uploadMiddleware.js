const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadPath = path.join(__dirname, "../uploads");

// Create uploads folder if missing
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        // Clean original filename
        const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        cb(null, Date.now() + "-" + safeOriginalName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max limit
    },
    fileFilter: function(req, file, cb) {
        const isPdfExt = path.extname(file.originalname).toLowerCase() === ".pdf";
        const isPdfMime = file.mimetype.includes("pdf") || file.mimetype === "application/octet-stream";

        if (isPdfExt || isPdfMime) {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files (.pdf) are allowed."));
        }
    }
});

module.exports = upload;