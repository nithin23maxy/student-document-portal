let documentsData = [];

document.addEventListener("DOMContentLoaded", async () => {
    await checkAdminAuth();
    await loadDocuments();
});

async function checkAdminAuth() {
    try {
        const res = await fetch("/api/auth/check", {
            headers: { "Bypass-Tunnel-Reminder": "true" }
        });
        const data = await res.json();
        if (!data.authenticated) {
            window.location.href = "login.html";
        }
    } catch (e) {
        console.error("Auth check failed:", e);
        window.location.href = "login.html";
    }
}

async function loadDocuments() {
    try {
        const res = await fetch("/api/documents", {
            headers: { "Bypass-Tunnel-Reminder": "true" }
        });
        if (res.status === 401) {
            window.location.href = "login.html";
            return;
        }

        const data = await res.json();
        if (data.success) {
            documentsData = data.documents || [];
            updateStats(documentsData);
            renderTable(documentsData);
        } else {
            showToast(data.message || "Failed to load documents.", "error");
        }
    } catch (err) {
        console.error("Error loading documents:", err);
        showToast("Server error while loading documents.", "error");
    }
}

function updateStats(docs) {
    const uniqueStudents = new Set(docs.map(d => d.usn.toUpperCase())).size;
    const uniqueDepts = new Set(docs.map(d => d.department.toUpperCase())).size;

    document.getElementById("statUniqueStudents").textContent = uniqueStudents;
    document.getElementById("statTotalDocs").textContent = docs.length;
    document.getElementById("statDepts").textContent = uniqueDepts;
}

function renderTable(docs) {
    const tbody = document.getElementById("adminTableBody");
    if (!docs || docs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 36px;">
                    <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 8px; color: var(--text-light);"></i><br>
                    No student documents uploaded yet. Click <strong>Upload New PDF</strong> to add files.
                </td>
            </tr>
        `;
        return;
    }

    let rows = "";
    docs.forEach(doc => {
        rows += `
            <tr>
                <td><strong>${escapeHtml(doc.usn)}</strong></td>
                <td>${escapeHtml(doc.name)}</td>
                <td><span class="tag">${escapeHtml(doc.department)}</span></td>
                <td><i class="fa-solid fa-file-pdf" style="color: var(--danger); margin-right: 6px;"></i> ${escapeHtml(doc.doc_title || doc.filename)}</td>
                <td style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(doc.filename)}</td>
                <td>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        <button type="button" class="btn btn-outline btn-sm" title="View PDF" onclick="openViewPdfModal('${doc.filepath}', '${escapeJsString(doc.doc_title || doc.filename)}', '${escapeJsString(doc.filename)}')">
                            <i class="fa-solid fa-eye" style="color: var(--primary);"></i> View
                        </button>
                        <button type="button" class="btn btn-outline btn-sm" title="Edit Metadata / Rename" onclick="openEditModal(${doc.id})">
                            <i class="fa-solid fa-pen-to-square" style="color: var(--warning);"></i> Edit
                        </button>
                        <button type="button" class="btn btn-outline btn-sm" title="Replace PDF file" onclick="openReplaceModal(${doc.id})">
                            <i class="fa-solid fa-arrows-rotate" style="color: var(--secondary);"></i> Replace
                        </button>
                        <button type="button" class="btn btn-danger btn-sm" title="Delete record" onclick="confirmDeleteDocument(${doc.id}, '${escapeJsString(doc.doc_title || doc.filename)}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rows;
}

function filterAdminTable() {
    const query = document.getElementById("adminSearchInput").value.toLowerCase();
    const filtered = documentsData.filter(d => 
        (d.usn && d.usn.toLowerCase().includes(query)) ||
        (d.name && d.name.toLowerCase().includes(query)) ||
        (d.department && d.department.toLowerCase().includes(query)) ||
        (d.doc_title && d.doc_title.toLowerCase().includes(query)) ||
        (d.filename && d.filename.toLowerCase().includes(query))
    );
    renderTable(filtered);
}

// ================= Upload Modal Handlers =================
function openUploadModal() {
    document.getElementById("uploadForm").reset();
    openModal("uploadModal");
}

async function handleUploadSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById("uploadSubmitBtn");
    const usn = document.getElementById("uploadUsn").value.trim();
    const name = document.getElementById("uploadName").value.trim();
    const department = document.getElementById("uploadDept").value.trim();
    const doc_title = document.getElementById("uploadTitle").value.trim();
    const fileInput = document.getElementById("uploadFile");

    if (!fileInput.files || fileInput.files.length === 0) {
        showToast("Please choose a PDF file to upload.", "error");
        return;
    }

    const file = fileInput.files[0];
    if (!file.name.toLowerCase().endsWith(".pdf")) {
        showToast("Selected file must be a PDF document (.pdf).", "error");
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        showToast("File size exceeds 50MB limit.", "error");
        return;
    }

    const formData = new FormData();
    formData.append("usn", usn);
    formData.append("name", name);
    formData.append("department", department);
    formData.append("doc_title", doc_title);
    formData.append("pdf", file);

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading PDF...`;

    try {
        const res = await fetch("/api/documents/upload", {
            method: "POST",
            headers: {
                "Bypass-Tunnel-Reminder": "true"
            },
            body: formData
        });

        if (res.status === 401) {
            showToast("Session expired. Redirecting to login...", "error");
            setTimeout(() => { window.location.href = "login.html"; }, 1500);
            return;
        }

        const data = await res.json();
        if (data.success) {
            showToast("Document uploaded successfully!", "success");
            closeModal("uploadModal");
            await loadDocuments();
        } else {
            showToast(data.message || "Upload failed.", "error");
        }
    } catch (err) {
        console.error("Upload error:", err);
        showToast("Server error during file upload.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-upload"></i> Upload Document`;
    }
}

// ================= Edit Metadata Modal Handlers =================
function openEditModal(id) {
    const doc = documentsData.find(d => d.id === id);
    if (!doc) return;

    document.getElementById("editDocId").value = doc.id;
    document.getElementById("editUsn").value = doc.usn;
    document.getElementById("editName").value = doc.name;
    document.getElementById("editDept").value = doc.department;
    document.getElementById("editTitle").value = doc.doc_title || doc.filename;

    openModal("editModal");
}

async function handleEditSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("editDocId").value;
    const usn = document.getElementById("editUsn").value.trim();
    const name = document.getElementById("editName").value.trim();
    const department = document.getElementById("editDept").value.trim();
    const doc_title = document.getElementById("editTitle").value.trim();

    try {
        const res = await fetch(`/api/documents/update/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Bypass-Tunnel-Reminder": "true"
            },
            body: JSON.stringify({ usn, name, department, doc_title })
        });

        const data = await res.json();
        if (data.success) {
            showToast("Document details updated!", "success");
            closeModal("editModal");
            await loadDocuments();
        } else {
            showToast(data.message || "Update failed.", "error");
        }
    } catch (err) {
        console.error("Edit error:", err);
        showToast("Server error during update.", "error");
    }
}

// ================= Replace PDF Modal Handlers =================
function openReplaceModal(id) {
    const doc = documentsData.find(d => d.id === id);
    if (!doc) return;

    document.getElementById("replaceDocId").value = doc.id;
    document.getElementById("replaceTargetName").textContent = `${doc.name} (${doc.usn}) - ${doc.doc_title || doc.filename}`;
    document.getElementById("replaceForm").reset();

    openModal("replaceModal");
}

async function handleReplaceSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("replaceDocId").value;
    const fileInput = document.getElementById("replaceFile");

    if (!fileInput.files || fileInput.files.length === 0) {
        showToast("Please choose a replacement PDF file.", "error");
        return;
    }

    const formData = new FormData();
    formData.append("pdf", fileInput.files[0]);

    try {
        const res = await fetch(`/api/documents/replace/${id}`, {
            method: "POST",
            headers: {
                "Bypass-Tunnel-Reminder": "true"
            },
            body: formData
        });

        const data = await res.json();
        if (data.success) {
            showToast("PDF file overwritten successfully!", "success");
            closeModal("replaceModal");
            await loadDocuments();
        } else {
            showToast(data.message || "File replace failed.", "error");
        }
    } catch (err) {
        console.error("Replace error:", err);
        showToast("Server error during file replacement.", "error");
    }
}

// ================= Delete Document Handler =================
async function confirmDeleteDocument(id, title) {
    if (!confirm(`Are you sure you want to delete "${title}"?\nThis operation will permanently remove the PDF file.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/documents/delete/${id}`, {
            method: "DELETE",
            headers: {
                "Bypass-Tunnel-Reminder": "true"
            }
        });

        const data = await res.json();
        if (data.success) {
            showToast("Document deleted successfully.", "success");
            await loadDocuments();
        } else {
            showToast(data.message || "Delete failed.", "error");
        }
    } catch (err) {
        console.error("Delete error:", err);
        showToast("Server error during deletion.", "error");
    }
}

// ================= PDF Viewer Modal =================
function openViewPdfModal(filepath, title, filename) {
    const iframe = document.getElementById("pdfFrame");
    const modalTitle = document.getElementById("pdfModalTitle");
    const downloadBtn = document.getElementById("pdfModalDownloadBtn");

    modalTitle.innerHTML = `<i class="fa-solid fa-file-pdf" style="color: var(--danger);"></i> ${escapeHtml(title)}`;
    iframe.src = `/uploads/${filepath}`;
    downloadBtn.href = `/uploads/${filepath}`;
    downloadBtn.setAttribute("download", filename);

    openModal("pdfModal");
}

// ================= Logout Handler =================
async function handleLogout() {
    if (!confirm("Are you sure you want to log out?")) return;
    try {
        await fetch("/api/auth/logout", {
            method: "POST",
            headers: {
                "Bypass-Tunnel-Reminder": "true"
            }
        });
        window.location.href = "login.html";
    } catch (e) {
        window.location.href = "login.html";
    }
}

// Helper Functions
function openModal(id) {
    document.getElementById(id).classList.add("active");
}

function closeModal(id) {
    document.getElementById(id).classList.remove("active");
}

function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = type === "success" 
        ? `<i class="fa-solid fa-circle-check"></i> ${escapeHtml(message)}`
        : `<i class="fa-solid fa-circle-exclamation"></i> ${escapeHtml(message)}`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 4000);
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

function escapeJsString(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}