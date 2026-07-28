const multer = require("multer");
const path = require("path");
const fs = require("fs");


const uploadPath = path.join(__dirname, "../uploads");


// Create uploads folder if missing
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}


const storage = multer.diskStorage({

    destination: function(req, file, cb) {

        cb(null, uploadPath);

    },


    filename: function(req, file, cb) {

        cb(null, Date.now() + "-" + file.originalname);

    }

});


const upload = multer({

    storage: storage,

    fileFilter: function(req, file, cb) {

        if(file.mimetype === "application/pdf") {

            cb(null, true);

        } else {

            cb(new Error("Only PDF files allowed"));

        }

    }

});


module.exports = upload;