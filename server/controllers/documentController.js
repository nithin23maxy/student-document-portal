const db = require("../database");
const fs = require("fs");
const path = require("path");


// ================= Upload Student Document =================

exports.uploadDocument = (req, res) => {

    const { usn, name, department } = req.body;


    console.log("Upload Data:");
    console.log("USN:", usn);
    console.log("Name:", name);
    console.log("Department:", department);
    console.log("File:", req.file);



    if (!req.file) {

        return res.status(400).json({

            success: false,

            message: "Please upload a PDF."

        });

    }



    const filename = req.file.originalname;

    const filepath = req.file.filename;



    db.run(

        `INSERT INTO students
        (usn, name, department, filename, filepath)
        VALUES (?, ?, ?, ?, ?)`,

        [
            usn,
            name,
            department,
            filename,
            filepath
        ],


        function(err) {


            if (err) {

                console.log(
                    "Database Insert Error:",
                    err.message
                );


                return res.status(500).json({

                    success: false,

                    message: err.message

                });

            }



            res.json({

                success: true,

                message: "Student document uploaded successfully."

            });


        }

    );


};





// ================= Delete Student Document =================

exports.deleteStudent = (req, res) => {


    const id = req.params.id;



    db.get(

        "SELECT * FROM students WHERE id = ?",

        [id],


        (err, row) => {


            if(err){

                return res.status(500).json({

                    success:false,

                    message:err.message

                });

            }



            if(!row){

                return res.json({

                    success:false,

                    message:"Student Not Found"

                });

            }



            const filePath = path.join(

                __dirname,

                "../uploads",

                row.filepath

            );



            if(fs.existsSync(filePath)){

                fs.unlinkSync(filePath);

            }



            db.run(

                "DELETE FROM students WHERE id = ?",


                [id],


                function(err){


                    if(err){

                        return res.status(500).json({

                            success:false,

                            message:err.message

                        });

                    }



                    res.json({

                        success:true,

                        message:"Student Deleted Successfully"

                    });


                }

            );


        }

    );


};





// ================= Update Student =================

exports.updateStudent = (req,res)=>{


    const id = req.params.id;


    const {
        usn,
        name,
        department
    } = req.body;



    db.run(

        `UPDATE students
         SET usn=?, name=?, department=?
         WHERE id=?`,

        [
            usn,
            name,
            department,
            id
        ],


        function(err){


            if(err){

                return res.status(500).json({

                    success:false,

                    message:err.message

                });

            }



            res.json({

                success:true,

                message:"Student Updated Successfully"

            });


        }

    );


};





// ================= Replace PDF =================

exports.replacePDF = (req,res)=>{


    const id = req.params.id;



    if(!req.file){

        return res.status(400).json({

            success:false,

            message:"Please upload a PDF."

        });

    }




    db.get(

        "SELECT * FROM students WHERE id=?",

        [id],


        (err,row)=>{


            if(err){

                return res.status(500).json({

                    success:false,

                    message:err.message

                });

            }



            if(!row){

                return res.json({

                    success:false,

                    message:"Student Not Found"

                });

            }



            const oldFile = path.join(

                __dirname,

                "../uploads",

                row.filepath

            );



            if(fs.existsSync(oldFile)){

                fs.unlinkSync(oldFile);

            }



            db.run(

                `UPDATE students
                 SET filename=?, filepath=?
                 WHERE id=?`,

                [

                    req.file.originalname,

                    req.file.filename,

                    id

                ],


                function(err){


                    if(err){

                        return res.status(500).json({

                            success:false,

                            message:err.message

                        });

                    }



                    res.json({

                        success:true,

                        message:"PDF Replaced Successfully"

                    });


                }

            );


        }

    );


};