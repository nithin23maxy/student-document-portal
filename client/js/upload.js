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

    // Attach file input change listener for preview
    const pdfInput = document.getElementById("pdf");
    const fileInfoBox = document.getElementById("fileInfoBox");
    
    if (pdfInput) {
        pdfInput.addEventListener("change", () => {
            if (pdfInput.files && pdfInput.files.length > 0) {
                const file = pdfInput.files[0];
                const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                
                if (!file.name.toLowerCase().endsWith(".pdf")) {
                    showMsg("Selected file must be a PDF document (.pdf).", "error");
                    pdfInput.value = "";
                    if (fileInfoBox) fileInfoBox.style.display = "none";
                    return;
                }
                
                if (file.size > 50 * 1024 * 1024) {
                    showMsg("File size exceeds 50MB limit.", "error");
                    pdfInput.value = "";
                    if (fileInfoBox) fileInfoBox.style.display = "none";
                    return;
                }

                if (fileInfoBox) {
                    fileInfoBox.style.display = "flex";
                    fileInfoBox.innerHTML = `<i class="fa-solid fa-file-pdf" style="color: var(--danger); font-size: 1.2rem;"></i> <div><strong>${escapeHtml(file.name)}</strong> <span style="color: var(--text-muted); font-size: 0.85rem;">(${sizeMB} MB)</span></div>`;
                }
            } else if (fileInfoBox) {
                fileInfoBox.style.display = "none";
            }
        });
    }
});

const form = document.getElementById("uploadForm");
const msg = document.getElementById("msg");
const submitBtn = document.getElementById("submitBtn");

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById("pdf");
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            showMsg("Please select a PDF file to upload.", "error");
            return;
        }

        const selectedFile = fileInput.files[0];
        if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
            showMsg("Only PDF files (.pdf) are allowed.", "error");
            return;
        }

        const formData = new FormData(form);
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading 0%...`;
        msg.textContent = "";

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/documents/upload", true);
        xhr.setRequestHeader("Bypass-Tunnel-Reminder", "true");

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading ${percent}%...`;
            }
        };

        xhr.onload = () => {
            if (xhr.status === 401) {
                showMsg("Session expired. Redirecting to login...", "error");
                setTimeout(() => { window.location.href = "login.html"; }, 1500);
                return;
            }

            try {
                const data = JSON.parse(xhr.responseText);
                if (data.success) {
                    showMsg(data.message || "PDF uploaded successfully!", "success");
                    form.reset();
                    const fileInfoBox = document.getElementById("fileInfoBox");
                    if (fileInfoBox) fileInfoBox.style.display = "none";
                    setTimeout(() => {
                        window.location.href = "admin.html";
                    }, 1200);
                } else {
                    showMsg(data.message || "Upload failed. Please try again.", "error");
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<i class="fa-solid fa-upload"></i> Upload Document`;
                }
            } catch (e) {
                showMsg("Invalid server response.", "error");
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i class="fa-solid fa-upload"></i> Upload Document`;
            }
        };

        xhr.onerror = () => {
            showMsg("Connection error during upload. Please check server.", "error");
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-upload"></i> Upload Document`;
        };

        xhr.send(formData);
    });
}

function showMsg(text, type) {
    if (!msg) return;
    msg.style.display = "block";
    if (type === "success") {
        msg.style.color = "#15803d";
        msg.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${escapeHtml(text)}`;
    } else {
        msg.style.color = "#b91c1c";
        msg.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${escapeHtml(text)}`;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}