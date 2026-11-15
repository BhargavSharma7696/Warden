const API = "https://warden-vspr.onrender.com";

const state = {
    issues: [],
    filter: "all",
    view: "list",
    page: 1,
    perPage: 6
};

const container = document.getElementById("issueContainer");
const overlay = document.getElementById("modalOverlay");

/* ---------- helpers ---------- */
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const pad = (id) => String(id).padStart(3, "0");

const initials = (name) =>
    name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const statusPill = (s) =>
    `<span class="status ${esc(s.toLowerCase())}">${esc(s)}</span>`;

/* ---------- data ---------- */
async function loadIssues() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "auth.html";
        return;
    }

    try {
        const res = await fetch(`${API}/issues`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "auth.html";
            return;
        }

        if (!res.ok) {
            throw new Error("Could not load issues");
        }

        const data = await res.json();
        state.issues = Array.isArray(data) ? data : (data.issues || []);
        render();
    } catch (err) {
        container.innerHTML =
            `<div class="emptyState">Could not load issues. Please try again later.</div>`;
        console.error("Failed to load issues:", err);
    }
}

const filtered = () => state.issues
    .filter((i) => state.filter === "all" || i.status === state.filter)
    .sort((a, b) => b.id - a.id);

/* ---------- rendering ---------- */
function renderList(items) {
    const rows = items.map((i) => `
        <div class="issueRow" role="button" tabindex="0" data-id="${i.id}">
            <span>${pad(i.id)}</span>
            <div>
                <div class="issueTitle">${esc(i.title)}</div>
                <div class="issueMeta">${esc(i.hostel)} · Room ${esc(i.room)}</div>
            </div>
            <div class="raisedBy">
                <span class="avatar">${esc(initials(i.studentName))}</span>
                ${esc(i.studentName)}
            </div>
            <span class="raisedOn">${esc(i.raisedOn || "—")}</span>
            <span>${statusPill(i.status)}</span>
            <span class="chevron">›</span>
        </div>`).join("");

    return `
        <div class="listHead">
            <span>No.</span><span>Issue</span><span>Raised by</span>
            <span>Raised on</span><span>Status</span><span></span>
        </div>${rows}`;
}

function renderCards(items) {
    return `<div class="cardGrid">${items.map((i) => `
        <div class="issueItem" role="button" tabindex="0" data-id="${i.id}">
            <div class="cardTop"><span>#${pad(i.id)}</span>${statusPill(i.status)}</div>
            <div>
                <div class="issueTitle">${esc(i.title)}</div>
                <div class="issueMeta">${esc(i.hostel)} · Room ${esc(i.room)}</div>
            </div>
            <p>${esc(i.description.length > 90 ? i.description.slice(0, 90) + "…" : i.description)}</p>
            <div class="cardBottom">
                <div class="raisedBy">
                    <span class="avatar">${esc(initials(i.studentName))}</span>${esc(i.studentName)}
                </div>
                <span>${esc(i.raisedOn || "—")}</span>
            </div>
        </div>`).join("")}</div>`;
}

function renderPagination(total) {
    const pages = Math.max(1, Math.ceil(total / state.perPage));
    let html = `<button class="pageBtn" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""}>‹</button>`;
    for (let p = 1; p <= pages; p++) {
        html += `<button class="pageBtn ${p === state.page ? "active" : ""}" data-page="${p}">${p}</button>`;
    }
    html += `<button class="pageBtn" data-page="${state.page + 1}" ${state.page === pages ? "disabled" : ""}>›</button>`;
    document.getElementById("pagination").innerHTML = html;
}

function render() {
    const all = state.issues;
    document.getElementById("countAll").textContent = all.length;
    document.getElementById("countPending").textContent = all.filter((i) => i.status === "Pending").length;
    document.getElementById("countResolved").textContent = all.filter((i) => i.status === "Resolved").length;

    const items = filtered();
    const start = (state.page - 1) * state.perPage;
    const pageItems = items.slice(start, start + state.perPage);

    container.innerHTML = !pageItems.length
        ? `<div class="emptyState">No issues found in this category.</div>`
        : state.view === "list" ? renderList(pageItems) : renderCards(pageItems);

    document.getElementById("showingText").textContent = items.length
        ? `Showing ${start + 1}–${start + pageItems.length} of ${items.length} issues`
        : "Showing 0 issues";
    renderPagination(items.length);
}

/* ---------- popup ---------- */
const detail = (label, value, full = false) => `
    <div class="detailItem ${full ? "fullWidth" : ""}">
        <label>${label}</label><span>${value}</span>
    </div>`;

function openModal(id) {
    const i = state.issues.find((x) => x.id === Number(id));
    if (!i) return;

    document.getElementById("modalIcon").textContent = pad(i.id);
    document.getElementById("modalTitle").textContent = i.title;
    document.getElementById("modalSub").textContent = `${i.hostel} · Room ${i.room}`;

    const statusHtml = i.canUpdateStatus
        ? `<select id="modalStatusSelect" class="statusSelect" data-id="${i.id}">
             <option value="Pending" ${i.status === "Pending" ? "selected" : ""}>Pending</option>
             <option value="Resolved" ${i.status === "Resolved" ? "selected" : ""}>Resolved</option>
           </select>`
        : statusPill(i.status);

    document.getElementById("modalBody").innerHTML =
        detail("Status", statusHtml) +
        detail("Category", esc(i.category)) +
        detail("Raised by", esc(i.studentName)) +
        detail("Student ID", esc(i.studentId)) +
        detail("Phone No.", esc(i.phone)) +
        detail("Raised on", esc(i.raisedOn || "—")) +
        detail("Priority", esc(i.priority)) +
        detail("Resolved on", esc(i.resolvedOn || "—")) +
        `<div class="detailItem fullWidth"><label>Issue</label><p>${esc(i.description)}</p></div>` +
        `<div class="detailItem fullWidth"><label>Team remarks</label><p>${esc(i.remarks) || "No remarks yet."}</p></div>`;

    const statusSelect = document.getElementById("modalStatusSelect");
    if (statusSelect) {
        statusSelect.addEventListener("change", (e) => {
            changeIssueStatus(i.id, e.target.value);
        });
    }

    const deleteBtn = document.getElementById("modalDelete");
    if (deleteBtn) {
        if (i.canDelete) {
            deleteBtn.hidden = false;
            deleteBtn.onclick = () => deleteIssue(i.id);
        } else {
            deleteBtn.hidden = true;
            deleteBtn.onclick = null;
        }
    }

    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    document.getElementById("modalClose").focus();
}

async function changeIssueStatus(id, newStatus) {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "auth.html";
        return;
    }

    const selectEl = document.getElementById("modalStatusSelect");
    if (selectEl) selectEl.disabled = true;

    try {
        const res = await fetch(`${API}/issues/${id}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (res.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "auth.html";
            return;
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.detail || "Could not update status");
            if (selectEl) selectEl.disabled = false;
            return;
        }

        const updated = await res.json();
        const index = state.issues.findIndex((x) => x.id === Number(id));
        if (index !== -1) {
            state.issues[index] = { ...state.issues[index], ...updated };
        }

        openModal(id);
        render();
    } catch (err) {
        console.error("Status update failed:", err);
        alert("Failed to update status. Please try again.");
        if (selectEl) selectEl.disabled = false;
    }
}

async function deleteIssue(id) {
    if (!confirm("Are you sure you want to delete this issue?")) {
        return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "auth.html";
        return;
    }

    const deleteBtn = document.getElementById("modalDelete");
    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.style.opacity = "0.5";
    }

    try {
        const res = await fetch(`${API}/issues/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "auth.html";
            return;
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.detail || "Could not delete issue");
            return;
        }

        // Remove from local state and update UI
        state.issues = state.issues.filter((x) => x.id !== Number(id));
        closeModal();
        render();
    } catch (err) {
        console.error("Delete failed:", err);
        alert("Failed to delete issue. Please try again.");
    } finally {
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.style.opacity = "1";
        }
    }
}

function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = "";
}

/* ---------- events ---------- */
document.getElementById("filterTabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    state.filter = tab.dataset.filter;
    state.page = 1;
    render();
});

document.getElementById("viewToggle").addEventListener("click", (e) => {
    const btn = e.target.closest(".viewBtn");
    if (!btn) return;
    document.querySelectorAll(".viewBtn").forEach((b) => b.classList.toggle("active", b === btn));
    state.view = btn.dataset.view;
    render();
});

document.getElementById("pagination").addEventListener("click", (e) => {
    const btn = e.target.closest(".pageBtn");
    if (!btn || btn.disabled) return;
    state.page = Number(btn.dataset.page);
    render();
});

container.addEventListener("click", (e) => {
    const row = e.target.closest("[data-id]");
    if (row) openModal(row.dataset.id);
});

container.addEventListener("keydown", (e) => {
    const row = e.target.closest("[data-id]");
    if (row && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        openModal(row.dataset.id);
    }
});

overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("modalDone").addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !overlay.hidden) closeModal(); });

loadIssues();
