const bcrypt = require("bcrypt");
const db = require("../database");

exports.login = (req, res) => {
    const { username, email, password } = req.body;
    const loginIdentifier = (username || email || "").trim();
    const inputPassword = (password || "").trim();

    if (!loginIdentifier || !inputPassword) {
        return res.status(400).json({
            success: false,
            message: "Please provide username/email and password."
        });
    }

    // Normalize login identifier (handle common typos like gamil.com vs gmail.com)
    const normalizedIdentifier = loginIdentifier.toLowerCase().replace("gamil.com", "gmail.com");

    db.get(
        "SELECT * FROM admins WHERE LOWER(username) = ? OR LOWER(email) = ? OR LOWER(email) = ? OR LOWER(username) = 'admin'",
        [loginIdentifier.toLowerCase(), loginIdentifier.toLowerCase(), normalizedIdentifier],
        async (err, admin) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Database error: " + err.message
                });
            }

            if (!admin) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid username/email or password."
                });
            }

            const match = await bcrypt.compare(inputPassword, admin.password);
            if (!match) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid username/email or password."
                });
            }

            // Store admin in session
            const sessionData = {
                id: admin.id,
                username: admin.username,
                email: admin.email
            };
            req.session.admin = sessionData;
            req.session.user = sessionData; // Compatibility

            return res.json({
                success: true,
                message: "Login successful!",
                admin: sessionData
            });
        }
    );
};

exports.logout = (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Could not log out." });
            }
            res.clearCookie("connect.sid");
            return res.json({ success: true, message: "Logged out successfully." });
        });
    } else {
        return res.json({ success: true, message: "Logged out successfully." });
    }
};

exports.checkSession = (req, res) => {
    if (req.session && (req.session.admin || req.session.user)) {
        return res.json({
            success: true,
            authenticated: true,
            admin: req.session.admin || req.session.user
        });
    }
    return res.json({
        success: true,
        authenticated: false
    });
};