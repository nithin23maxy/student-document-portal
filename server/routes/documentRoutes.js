const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware");
const documentController = require("../controllers/documentController");

router.post(
    "/upload",
    upload.single("pdf"),
    documentController.upload
);
router.put("/update/:id", documentController.updateStudent);
router.delete("/delete/:id", documentController.deleteStudent);
router.put(
    "/replace/:id",
    upload.single("pdf"),
    documentController.replacePDF
);

module.exports = router;