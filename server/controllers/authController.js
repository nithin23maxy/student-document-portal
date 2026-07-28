const bcrypt = require("bcrypt");

const db = require("../database");

exports.login = (req, res) => {

    const { username, password } = req.body;

    db.get(
        "SELECT * FROM admins WHERE username=?",
        [username],
        async (err, admin) => {

            if (err) {

                return res.status(500).json({
                    success: false,
                    message: "Database Error"
                });

            }

            if (!admin) {

                return res.json({
                    success: false,
                    message: "Invalid Username"
                });

            }

            const match = await bcrypt.compare(password, admin.password);

            if (!match) {

                return res.json({
                    success: false,
                    message: "Invalid Password"
                });

            }

            res.json({
                success: true,
                message: "Login Successful"
            });

        }

    );

};