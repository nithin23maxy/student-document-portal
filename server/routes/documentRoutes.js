const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const requireAuth = require("../middleware/authMiddleware");
const documentController = require("../controllers/documentController");

// All document modification routes require Admin Authentication
router.get("/", requireAuth, documentController.getAllDocuments);
router.get("/:id", requireAuth, documentController.getDocumentById);

router.post(
    "/upload",
    requireAuth,
    upload.single("pdf"),
    documentController.uploadDocument
);

router.put(
    "/update/:id",
    requireAuth,
    documentController.updateDocument
);

router.post(
    "/replace/:id",
    requireAuth,
    upload.single("pdf"),
    documentController.replacePDF
);

router.delete(
    "/delete/:id",
    requireAuth,
    documentController.deleteDocument
);

module.exports = router;