document.addEventListener("DOMContentLoaded", () => {
    // Check if query parameter exists in URL
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get("usn") || urlParams.get("q");
    if (queryParam) {
        document.getElementById("usnQuery").value = queryParam;
        performSearch(queryParam);
    }
});

function executeSearch(e) {
    if (e) e.preventDefault();
    const usn = document.getElementById("usnQuery").value.trim();
    if (!usn) return;
    
    // Update URL parameter without full reload for easy sharing
    const newUrl = window.location.pathname + '?q=' + encodeURIComponent(usn);
    window.history.pushState({ path: newUrl }, '', newUrl);

    performSearch(usn);
}

async function performSearch(query) {
    const container = document.getElementById("resultsContainer");
    container.innerHTML = `
        <div style="text-align: center; padding: 50px 20px;">
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2.5rem; color: var(--primary);"></i>
            <p style="margin-top: 14px; color: var(--text-muted); font-size: 1rem; font-weight: 500;">Searching records for "${escapeHtml(query)}"...</p>
        </div>
    `;

    try {
        const response = await fetch(`/api/student/search?q=${encodeURIComponent(query)}`, {
            headers: { "Bypass-Tunnel-Reminder": "true" }
        });
        const data = await response.json();

        if (!data.success || !data.found || !data.documents || data.documents.length === 0) {
            renderNotFound(container, query);
            return;
        }

        renderStudentResults(container, data.student, data.documents);
    } catch (err) {
        console.error("Search error:", err);
        container.innerHTML = `
            <div class="not-found-card">
                <div class="not-found-icon">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <h3>Server Error</h3>
                <p>Could not connect to the document search server. Please verify your connection.</p>
            </div>
        `;
    }
}

function renderStudentResults(container, student, documents) {
    const avatarLetter = student.name ? student.name.charAt(0).toUpperCase() : "S";

    let docsHtml = "";
    documents.forEach(doc => {
        const formattedDate = doc.created_at ? new Date(doc.created_at).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        }) : 'Uploaded';
        const formattedSize = doc.file_size ? (doc.file_size / (1024 * 1024)).toFixed(2) + ' MB' : 'PDF Document';

        docsHtml += `
            <div class="doc-card">
                <div>
                    <div class="doc-header">
                        <div class="pdf-icon">
                            <i class="fa-solid fa-file-pdf"></i>
                        </div>
                        <div>
                            <div class="doc-title">${escapeHtml(doc.doc_title || doc.filename)}</div>
                            <div class="doc-subtitle">${escapeHtml(doc.filename)} • ${formattedSize}</div>
                        </div>
                    </div>
                    ${doc.usn && doc.usn.toUpperCase() !== student.usn.toUpperCase() ? `
                        <div style="font-size: 0.88rem; font-weight: 600; color: var(--primary); margin-top: 6px;">
                            <i class="fa-solid fa-user-graduate"></i> ${escapeHtml(doc.name)} (${escapeHtml(doc.usn)})
                        </div>
                    ` : ''}
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px;">
                        <i class="fa-regular fa-calendar-check"></i> Uploaded on ${formattedDate}
                    </div>
                </div>

                <div class="doc-actions">
                    <button type="button" class="btn btn-primary btn-sm" style="flex: 1;" onclick="openPdfModal('${doc.filepath}', '${escapeJsString(doc.doc_title || doc.filename)}', '${escapeJsString(doc.filename)}')">
                        <i class="fa-solid fa-eye"></i> View PDF
                    </button>
                    <a href="/uploads/${doc.filepath}" download="${escapeHtml(doc.filename)}" class="btn btn-outline btn-sm" style="flex: 1;">
                        <i class="fa-solid fa-download"></i> Download
                    </a>
                </div>
            </div>
        `;
    });

    container.innerHTML = `
        <!-- Student Banner -->
        <div class="student-card">
            <div class="student-info">
                <div class="avatar">${avatarLetter}</div>
                <div class="student-details">
                    <h2>${escapeHtml(student.name)}</h2>
                    <div class="student-meta">
                        <span class="tag"><i class="fa-solid fa-id-card"></i> USN: ${escapeHtml(student.usn)}</span>
                        <span class="tag"><i class="fa-solid fa-building-columns"></i> ${escapeHtml(student.department)}</span>
                    </div>
                </div>
            </div>
            <div style="font-size: 0.9rem; color: var(--success); font-weight: 700; background: #dcfce7; padding: 8px 18px; border-radius: 50px; display: inline-flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-circle-check"></i> Found ${documents.length} File(s)
            </div>
        </div>

        <!-- Available Documents Grid -->
        <h3 style="font-size: 1.25rem; margin-bottom: 18px; color: var(--text-main);">
            <i class="fa-solid fa-folder-open" style="color: var(--primary);"></i> Available Student Documents (${documents.length})
        </h3>
        <div class="documents-grid">
            ${docsHtml}
        </div>
    `;
}

function renderNotFound(container, query) {
    container.innerHTML = `
        <div class="not-found-card">
            <div class="not-found-icon">
                <i class="fa-solid fa-file-circle-xmark"></i>
            </div>
            <h3>No Documents Found</h3>
            <p>No student PDF documents registered matching <strong>"${escapeHtml(query)}"</strong>.</p>
            <div style="font-size: 0.88rem; color: var(--text-muted); background: var(--light-bg); padding: 18px; border-radius: var(--radius-md); text-align: left; margin-bottom: 24px; border: 1px solid var(--border-color);">
                <strong><i class="fa-solid fa-lightbulb" style="color: var(--warning);"></i> Search Tips:</strong>
                <ul style="margin-left: 20px; margin-top: 8px; line-height: 1.6;">
                    <li>Search by Student USN (e.g. <code>1MS21CS001</code>).</li>
                    <li>Search by Student Name (e.g. <code>Rahul</code>).</li>
                    <li>Search by Department or Course (e.g. <code>Computer Science</code>).</li>
                    <li>Search by Document Title (e.g. <code>Marksheet</code>, <code>Grade Card</code>).</li>
                </ul>
            </div>
            <a href="search.html" class="btn btn-outline btn-sm">Clear Search</a>
        </div>
    `;
}

function openPdfModal(filepath, title, filename) {
    const modal = document.getElementById("pdfModal");
    const frame = document.getElementById("pdfFrame");
    const modalTitle = document.getElementById("pdfModalTitle");
    const modalFilename = document.getElementById("pdfModalFilename");
    const downloadBtn = document.getElementById("pdfModalDownloadBtn");

    modalTitle.innerHTML = `<i class="fa-solid fa-file-pdf" style="color: var(--danger);"></i> ${escapeHtml(title)}`;
    if (modalFilename) modalFilename.textContent = filename;
    downloadBtn.href = `/uploads/${filepath}`;
    downloadBtn.setAttribute("download", filename);

    frame.src = `/uploads/${filepath}`;
    modal.classList.add("active");
}

function closePdfModal() {
    const modal = document.getElementById("pdfModal");
    const frame = document.getElementById("pdfFrame");
    frame.src = "";
    modal.classList.remove("active");
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