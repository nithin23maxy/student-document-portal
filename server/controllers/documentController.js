const db = require("../database");
const fs = require("fs");
const path = require("path");

// ================= Get All Documents (Admin) =================
exports.getAllDocuments = (req, res) => {
    db.all("SELECT * FROM students ORDER BY id DESC", [], (err, rows) => {
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
    const originalName = req.file.originalname;
    const cleanTitle = (doc_title && doc_title.trim()) ? doc_title.trim() : originalName;
    const storedFilename = req.file.filename;
    const fileSize = req.file.size || 0;

    db.run(
        `INSERT INTO students (usn, name, department, doc_title, filename, filepath, file_size)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [cleanUsn, cleanName, cleanDept, cleanTitle, originalName, storedFilename, fileSize],
        function (err) {
            if (err) {
                console.error("Database Insert Error:", err.message);
                return res.status(500).json({
                    success: false,
                    message: "Database insertion failed: " + err.message
                });
            }

            res.status(201).json({
                success: true,
                message: "PDF Document uploaded successfully!",
                id: this.lastID
            });
        }
    );
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

        const newOriginalName = req.file.originalname;
        const newStoredFilename = req.file.filename;
        const newFileSize = req.file.size || 0;

        db.run(
            `UPDATE students
             SET filename = ?, filepath = ?, file_size = ?
             WHERE id = ?`,
            [newOriginalName, newStoredFilename, newFileSize, id],
            function (err) {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: err.message
                    });
                }

                res.json({
                    success: true,
                    message: "PDF File replaced successfully!"
                });
            }
        );
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