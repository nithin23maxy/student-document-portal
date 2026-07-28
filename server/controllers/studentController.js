const db = require("../database");

exports.searchStudent = (req, res) => {

    const usn = req.params.usn;

    db.get(
        "SELECT * FROM students WHERE usn = ?",
        [usn],
        (err, row) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            if (!row) {
                return res.json({
                    success: false,
                    message: "Document Not Found"
                });
            }

            res.json({
                success: true,
                student: row
            });

        }
    );

};