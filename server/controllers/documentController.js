const db = require("../database");
const fs = require("fs");
const path = require("path");

// ================= Get All Documents (Admin) =================
exports.getAllDocuments = (req, res) => {
    db.all("SELECT id, usn, name, department, doc_title, filename, filepath, file_size, created_at FROM students ORDER BY id DESC", [], (err, rows) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }
        res.json({
            success: true,
            documents: rows || []
        });
    });
};

// ================= Get Single Document by ID =================
exports.getDocumentById = (req, res) => {
    const id = req.params.id;
    db.get("SELECT id, usn, name, department, doc_title, filename, filepath, file_size, created_at FROM students WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }
        if (!row) {
            return res.status(404).json({
                success: false,
                message: "Document not found."
            });
        }
        res.json({
            success: true,
            document: row
        });
    });
};

// ================= Upload Student Document =================
exports.uploadDocument = (req, res) => {
    const { usn, name, department, doc_title } = req.body;

    if (!usn || !name || !department) {
        return res.status(400).json({
            success: false,
            message: "USN, Student Name, and Department are required fields."
        });
    }

    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "Please select a valid PDF file to upload."
        });
    }

    const cleanUsn = usn.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanDept = department.trim();
    const originalName = req.file.originalname || "document.pdf";
    const cleanTitle = (doc_title && doc_title.trim()) ? doc_title.trim() : originalName;
    const storedFilename = req.file.filename;
    const fileSize = req.file.size || 0;

    let fileBuffer = null;
    // Store binary BLOB in SQLite for auto-restoring backup (up to 30MB)
    if (req.file.path && fs.existsSync(req.file.path) && fileSize <= 30 * 1024 * 1024) {
        try {
            fileBuffer = fs.readFileSync(req.file.path);
        } catch (e) {
            console.warn("Could not read uploaded file to buffer:", e.message);
        }
    }

    const insertWithFallback = (includeBuffer) => {
        const query = includeBuffer
            ? `INSERT INTO students (usn, name, department, doc_title, filename, filepath, file_size, file_data)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            : `INSERT INTO students (usn, name, department, doc_title, filename, filepath, file_size, file_data)
               VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`;

        const params = includeBuffer
            ? [cleanUsn, cleanName, cleanDept, cleanTitle, originalName, storedFilename, fileSize, fileBuffer]
            : [cleanUsn, cleanName, cleanDept, cleanTitle, originalName, storedFilename, fileSize];

        db.run(query, params, function (err) {
            if (err) {
                if (includeBuffer && fileBuffer) {
                    console.warn("BLOB DB insert failed, retrying without file_data payload:", err.message);
                    return insertWithFallback(false);
                }

                console.error("Database Insert Error:", err.message);
                return res.status(500).json({
                    success: false,
                    message: "Database insertion failed: " + err.message
                });
            }

            // Sync student name & department across all existing documents for this USN for consistency
            db.run(
                "UPDATE students SET name = ?, department = ? WHERE UPPER(usn) = ?",
                [cleanName, cleanDept, cleanUsn],
                (updateErr) => {}
            );

            res.status(201).json({
                success: true,
                message: "PDF Document uploaded successfully!",
                id: this.lastID
            });
        });
    };

    insertWithFallback(Boolean(fileBuffer));
};

// ================= Update Student / Document Metadata =================
exports.updateDocument = (req, res) => {
    const id = req.params.id;
    const { usn, name, department, doc_title } = req.body;

    if (!usn || !name || !department) {
        return res.status(400).json({
            success: false,
            message: "USN, Student Name, and Department cannot be empty."
        });
    }

    const cleanUsn = usn.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanDept = department.trim();
    const cleanTitle = doc_title ? doc_title.trim() : "Document";

    db.run(
        `UPDATE students
         SET usn = ?, name = ?, department = ?, doc_title = ?
         WHERE id = ?`,
        [cleanUsn, cleanName, cleanDept, cleanTitle, id],
        function (err) {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Document record not found."
                });
            }

            // Sync all records for this USN
            db.run(
                "UPDATE students SET name = ?, department = ? WHERE UPPER(usn) = ?",
                [cleanName, cleanDept, cleanUsn],
                (uErr) => {}
            );

            res.json({
                success: true,
                message: "Document details updated successfully."
            });
        }
    );
};

// ================= Replace PDF File =================
exports.replacePDF = (req, res) => {
    const id = req.params.id;

    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "Please upload a replacement PDF file."
        });
    }

    db.get("SELECT * FROM students WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (!row) {
            return res.status(404).json({
                success: false,
                message: "Document not found."
            });
        }

        // Unlink existing file from disk
        const oldFilePath = path.join(__dirname, "../uploads", row.filepath);
        if (fs.existsSync(oldFilePath)) {
            try {
                fs.unlinkSync(oldFilePath);
            } catch (unlinkErr) {
                console.warn("Failed to remove old file:", unlinkErr.message);
            }
        }

        const newOriginalName = req.file.originalname || "document.pdf";
        const newStoredFilename = req.file.filename;
        const newFileSize = req.file.size || 0;
        let newFileBuffer = null;
        if (req.file.path && fs.existsSync(req.file.path) && newFileSize <= 30 * 1024 * 1024) {
            try {
                newFileBuffer = fs.readFileSync(req.file.path);
            } catch (e) {
                console.warn("Could not read replacement file to buffer:", e.message);
            }
        }

        const updateWithFallback = (includeBuffer) => {
            const query = includeBuffer
                ? `UPDATE students
                   SET filename = ?, filepath = ?, file_size = ?, file_data = ?
                   WHERE id = ?`
                : `UPDATE students
                   SET filename = ?, filepath = ?, file_size = ?, file_data = NULL
                   WHERE id = ?`;

            const params = includeBuffer
                ? [newOriginalName, newStoredFilename, newFileSize, newFileBuffer, id]
                : [newOriginalName, newStoredFilename, newFileSize, id];

            db.run(query, params, function (err) {
                if (err) {
                    if (includeBuffer && newFileBuffer) {
                        return updateWithFallback(false);
                    }
                    return res.status(500).json({
                        success: false,
                        message: err.message
                    });
                }

                res.json({
                    success: true,
                    message: "PDF File replaced successfully!"
                });
            });
        };

        updateWithFallback(Boolean(newFileBuffer));
    });
};

// ================= Delete Student Document =================
exports.deleteDocument = (req, res) => {
    const id = req.params.id;

    db.get("SELECT * FROM students WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (!row) {
            return res.status(404).json({
                success: false,
                message: "Document record not found."
            });
        }

        // Delete file from filesystem
        const filePath = path.join(__dirname, "../uploads", row.filepath);
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (e) {
                console.warn("Could not delete file from disk:", e.message);
            }
        }

        db.run("DELETE FROM students WHERE id = ?", [id], function (err) {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            res.json({
                success: true,
                message: "Document deleted successfully."
            });
        });
    });
};