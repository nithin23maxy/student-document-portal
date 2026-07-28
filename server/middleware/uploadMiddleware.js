const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../uploads"));
    },

    filename: (req, file, cb) => {

        const uniqueName = Date.now() + "-" + file.originalname;

        cb(null, uniqueName);

    }

});

const upload = multer({

    storage,

    fileFilter: (req, file, cb) => {

        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files are allowed"));
        }

    }

});

module.exports = upload;