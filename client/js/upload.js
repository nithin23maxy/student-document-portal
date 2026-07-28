document.addEventListener("DOMContentLoaded", async () => {
    // Session Auth Check
    try {
        const res = await fetch("/api/auth/check", {
            headers: { "Bypass-Tunnel-Reminder": "true" }
        });
        const data = await res.json();
        if (!data.authenticated) {
            window.location.href = "login.html";
        }
    } catch (e) {
        window.location.href = "login.html";
    }
});

const form = document.getElementById("uploadForm");
const msg = document.getElementById("msg");
const submitBtn = document.getElementById("submitBtn");

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading...`;
        msg.textContent = "";

        try {
            const response = await fetch("/api/documents/upload", {
                method: "POST",
                headers: {
                    "Bypass-Tunnel-Reminder": "true"
                },
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                msg.style.color = "var(--success)";
                msg.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${data.message || "Uploaded successfully!"}`;
                form.reset();
                setTimeout(() => {
                    window.location.href = "admin.html";
                }, 1200);
            } else {
                msg.style.color = "var(--danger)";
                msg.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${data.message || "Upload failed."}`;
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i class="fa-solid fa-upload"></i> Upload Document`;
            }
        } catch (err) {
            console.error("Upload error:", err);
            msg.style.color = "var(--danger)";
            msg.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Connection error during upload.`;
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-upload"></i> Upload Document`;
        }
    });
}