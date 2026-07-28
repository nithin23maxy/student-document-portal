const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const username = document.getElementById("username").value;

    const password = document.getElementById("password").value;

    const response = await fetch("/api/auth/login", {

        method: "POST",

        headers: {

            "Content-Type": "application/json"

        },

        body: JSON.stringify({

            username,
            password

        })

    });

    const data = await response.json();

    if (data.success) {

        window.location.href = "dashboard.html";

    } else {

        alert(data.message);

    }

});