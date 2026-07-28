const express = require("express");
const router = express.Router();

const studentController = require("../controllers/studentController");

router.get("/search/:usn", studentController.searchStudent);

module.exports = router;