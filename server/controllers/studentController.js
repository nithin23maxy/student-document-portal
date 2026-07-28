const db = require("../database");

// ================= Search Student Documents =================
exports.searchStudent = (req, res) => {
    const rawQuery = req.query.q || req.query.usn || req.params.usn || "";
    const cleanQuery = rawQuery.trim();

    if (!cleanQuery) {
        return res.status(400).json({
            success: false,
            message: "Search query is required."
        });
    }

    const upperQuery = cleanQuery.toUpperCase();
    const noSpaceQuery = upperQuery.replace(/\s+/g, "");

    // 1. Try exact USN match first
    db.all(
        `SELECT id, usn, name, department, doc_title, filename, filepath, file_size, created_at
         FROM students
         WHERE REPLACE(UPPER(usn), ' ', '') = ? OR UPPER(usn) = ?
         ORDER BY id DESC`,
        [noSpaceQuery, upperQuery],
        (err, exactRows) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Database Error: " + err.message
                });
            }

            if (exactRows && exactRows.length > 0) {
                const primary = exactRows[0];
                return res.json({
                    success: true,
                    found: true,
                    student: {
                        usn: primary.usn,
                        name: primary.name,
                        department: primary.department
                    },
                    documents: exactRows
                });
            }

            // 2. Fallback to flexible fuzzy search across USN, Name, Dept, Doc Title & Filename
            db.all(
                `SELECT id, usn, name, department, doc_title, filename, filepath, file_size, created_at
                 FROM students
                 WHERE UPPER(usn) LIKE ?
                    OR REPLACE(UPPER(usn), ' ', '') LIKE ?
                    OR UPPER(name) LIKE ?
                    OR UPPER(department) LIKE ?
                    OR UPPER(doc_title) LIKE ?
                    OR UPPER(filename) LIKE ?
                 ORDER BY id DESC`,
                [`%${upperQuery}%`, `%${noSpaceQuery}%`, `%${upperQuery}%`, `%${upperQuery}%`, `%${upperQuery}%`, `%${upperQuery}%`],
                (err, fuzzyRows) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: "Database Error: " + err.message
                        });
                    }

                    if (!fuzzyRows || fuzzyRows.length === 0) {
                        return res.json({
                            success: false,
                            found: false,
                            message: `No documents registered matching '${cleanQuery}'.`,
                            query: cleanQuery
                        });
                    }

                    const primary = fuzzyRows[0];
                    return res.json({
                        success: true,
                        found: true,
                        student: {
                            usn: primary.usn,
                            name: primary.name,
                            department: primary.department
                        },
                        documents: fuzzyRows
                    });
                }
            );
        }
    );
};