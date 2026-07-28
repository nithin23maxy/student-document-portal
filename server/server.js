const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");

const db = require("./database.js");

const app = express();
// Middleware

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ 
    extended: true 
}));


// Session

app.use(session({

    secret: "student-document-secret",

    resave: false,

    saveUninitialized: true

}));



// Serve frontend

app.use(express.static(path.join(__dirname, "../client")));



// Test route

app.get("/api/test", (req, res) => {

    res.json({

        message: "Server working"

    });

});



// Login API

app.post("/login", (req, res) => {


    const { email, password } = req.body;


    console.log("Login attempt:");

    console.log("Email:", email);



    // Demo login

    if(email === "admin@gmail.com" && password === "admin123") {


        req.session.user = {

            email: email

        };


        return res.json({

            success: true,

            message: "Login successful"

        });


    }



    res.json({

        success: false,

        message: "Invalid email or password"

    });


});



// Dashboard route

app.get("/dashboard.html", (req, res) => {


    if(!req.session.user){

        return res.redirect("/login.html");

    }


    res.sendFile(
        path.join(__dirname, "../client/dashboard.html")
    );


});




// Send index page

// Send index page for unknown routes

app.use((req, res) => {

    res.sendFile(
        path.join(__dirname, "../client/index.html")
    );

});



// Server start

const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {


    console.log("====================================");

    console.log(" Student Document Portal Started");

    console.log(` http://localhost:${PORT}`);

    console.log("====================================");


});