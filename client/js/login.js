document.addEventListener("DOMContentLoaded", async () => {
    // Check if session already exists
    try {
        const res = await fetch("/api/auth/check");
        const data = await res.json();
        if (data.authenticated) {
            window.location.href = "admin.html";
        }
    } catch (e) {
        console.log("Session check skipped.");
    }
});

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const msgBox = document.getElementById("loginMessage");
    const loginBtn = document.getElementById("loginBtn");

    if (!username || !password) {
        showMsg("Please fill in both fields.", "error");
        return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            showMsg("Login successful! Redirecting...", "success");
            setTimeout(() => {
                window.location.href = "admin.html";
            }, 800);
        } else {
            showMsg(data.message || "Invalid credentials.", "error");
            loginBtn.disabled = false;
            loginBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Sign In to Admin Panel`;
        }
    } catch (err) {
        console.error("Login fetch error:", err);
        showMsg("Could not connect to authentication server.", "error");
        loginBtn.disabled = false;
        loginBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Sign In to Admin Panel`;
    }
}

function showMsg(text, type) {
    const msgBox = document.getElementById("loginMessage");
    msgBox.style.display = "block";
    msgBox.textContent = text;
    if (type === "success") {
        msgBox.style.background = "#dcfce7";
        msgBox.style.color = "#15803d";
        msgBox.style.border = "1px solid #bbf7d0";
    } else {
        msgBox.style.background = "#fef2f2";
        msgBox.style.color = "#b91c1c";
        msgBox.style.border = "1px solid #fecaca";
    }
}

function togglePasswordVisibility() {
    const passInput = document.getElementById("password");
    const toggleIcon = document.getElementById("togglePassword");
    if (passInput.type === "password") {
        passInput.type = "text";
        toggleIcon.classList.remove("fa-eye");
        toggleIcon.classList.add("fa-eye-slash");
    } else {
        passInput.type = "password";
        toggleIcon.classList.remove("fa-eye-slash");
        toggleIcon.classList.add("fa-eye");
    }
}