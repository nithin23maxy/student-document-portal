const db = require("../database");

exports.searchStudent = (req, res) => {
    const rawUsn = req.params.usn || "";
    const cleanUsn = rawUsn.trim().toUpperCase();

    if (!cleanUsn) {
        return res.status(400).json({
            success: false,
            message: "USN query is required."
        });
    }

    db.all(
        "SELECT id, usn, name, department, doc_title, filename, filepath, file_size, created_at FROM students WHERE UPPER(usn) = ? ORDER BY id DESC",
        [cleanUsn],
        (err, rows) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Database Error: " + err.message
                });
            }

            if (!rows || rows.length === 0) {
                return res.json({
                    success: false,
                    found: false,
                    message: `File Not Found. No document registered for USN '${cleanUsn}'.`,
                    usn: cleanUsn
                });
            }

            const primary = rows[0];

            return res.json({
                success: true,
                found: true,
                student: {
                    usn: primary.usn,
                    name: primary.name,
                    department: primary.department
                },
                documents: rows
            });
        }
    );
};