module.exports = function requireAuth(req, res, next) {
    if (req.session && (req.session.user || req.session.admin)) {
        return next();
    }
    return res.status(401).json({
        success: false,
        message: "Unauthorized. Admin session required."
    });
};
