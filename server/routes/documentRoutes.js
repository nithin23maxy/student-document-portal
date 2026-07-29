const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const requireAuth = require("../middleware/authMiddleware");
const documentController = require("../controllers/documentController");

// Multer error handling wrapper middleware (supports 'pdf', 'document', or any field name)
const handleUploadMiddleware = (req, res, next) => {
    upload.any()(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message || "File upload failed."
            });
        }
        // Map uploaded file to req.file for compatibility
        if (req.files && req.files.length > 0) {
            req.file = req.files.find(f => f.fieldname === "pdf" || f.fieldname === "document" || f.fieldname === "file") || req.files[0];
        }
        next();
    });
};

// All document modification routes require Admin Authentication
router.get("/", requireAuth, documentController.getAllDocuments);
router.get("/:id", requireAuth, documentController.getDocumentById);

router.post(
    "/upload",
    requireAuth,
    handleUploadMiddleware,
    documentController.uploadDocument
);

router.post(
    "/bulk-upload",
    requireAuth,
    handleUploadMiddleware,
    documentController.bulkUploadDocuments
);

router.put(
    "/update/:id",
    requireAuth,
    documentController.updateDocument
);

router.post(
    "/replace/:id",
    requireAuth,
    handleUploadMiddleware,
    documentController.replacePDF
);

router.delete(
    "/delete/:id",
    requireAuth,
    documentController.deleteDocument
);

module.exports = router;