const API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:")
    ? "http://127.0.0.1:8000"
    : "https://warden-vspr.onrender.com";

const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
if (!token && typeof window !== "undefined" && window.location) {
    window.location.href = "auth.html";
}

// Ensure only admin/warden can access this page
async function verifyRole() {
    if (!token) return;
    try {
        const response = await fetch(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (response.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "auth.html";
            return;
        }
        if (!response.ok) {
            window.location.href = "announcement.html";
            return;
        }
        const user = await response.json();
        if (user.role !== "admin" && user.role !== "warden") {
            alert("Access restricted to administrators and wardens.");
            window.location.href = "announcement.html";
        }
    } catch (e) {
        console.error("Role verification failed", e);
    }
}

verifyRole();

const form = document.getElementById("raiseAnnouncementForm");

if (form) {
    form.addEventListener("submit", async function(event) {
        event.preventDefault();

        const title = document.getElementById("title") ? document.getElementById("title").value.trim() : "";
        const category = document.getElementById("category") ? document.getElementById("category").value.trim() : "";
        const hostel = document.getElementById("hostel") ? document.getElementById("hostel").value.trim() : "";
        const team = document.getElementById("team") ? document.getElementById("team").value.trim() : "";
        const body = document.getElementById("body") ? document.getElementById("body").value.trim() : "";

        const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector(".submitButton");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Posting announcement...";
        }

        const activeToken = (typeof localStorage !== "undefined" && localStorage.getItem("token")) || token;

        try {
            const payload = {
                title: title,
                category: category,
                hostel: hostel,
                team: team || "Hostel Administration",
                body: body
            };

            const response = await fetch(`${API}/announcements`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${activeToken}`
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 401) {
                if (typeof localStorage !== "undefined") {
                    localStorage.removeItem("token");
                }
                if (typeof window !== "undefined" && window.location) {
                    window.location.href = "auth.html";
                }
                return;
            }

            if (!response.ok) {
                let detail = "Failed to post announcement";
                try {
                    const errData = await response.json();
                    if (typeof errData.detail === "string") {
                        detail = errData.detail;
                    }
                } catch (_) {}
                showToast({
                    type: "error",
                    title: "Posting Failed",
                    message: detail
                });
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Submit";
                }
                return;
            }

            const data = await response.json();

            showToast({
                type: "success",
                title: "Announcement Posted Successfully",
                id: data.id,
                category: data.category,
                summary: data.summary,
                message: "Your announcement is now visible to all students."
            });

            form.reset();

            setTimeout(() => {
                window.location.href = "announcement.html";
            }, 1500);

        } catch (error) {
            showToast({
                type: "error",
                title: "Network Error",
                message: "Failed to connect to the server. Please try again."
            });
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Submit";
            }
        }
    });
}

function showToast(options) {
    if (typeof document === "undefined") return;

    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        container.setAttribute("aria-live", "polite");
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    const isError = options.type === "error";
    toast.className = `toast ${isError ? "toast-error" : "toast-success"}`;
    toast.setAttribute("role", "alert");

    const header = document.createElement("div");
    header.className = "toast-header";

    const title = document.createElement("h4");
    title.className = "toast-title";
    title.textContent = options.title || (isError ? "Error" : "Announcement Posted");
    header.appendChild(title);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "toast-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "&times;";
    header.appendChild(closeBtn);

    toast.appendChild(header);

    const body = document.createElement("div");
    body.className = "toast-body";

    const hasBadges = (options.id !== undefined && options.id !== null) || options.category;
    if (hasBadges) {
        const meta = document.createElement("div");
        meta.className = "toast-meta";

        if (options.id !== undefined && options.id !== null) {
            const ticketBadge = document.createElement("span");
            ticketBadge.className = "toast-badge badge-ticket";
            ticketBadge.textContent = `Notice #${options.id}`;
            meta.appendChild(ticketBadge);
        }

        if (options.category) {
            const categoryBadge = document.createElement("span");
            categoryBadge.className = "toast-badge badge-category";
            categoryBadge.textContent = `Category: ${options.category}`;
            meta.appendChild(categoryBadge);
        }

        body.appendChild(meta);
    }

    if (options.summary) {
        const summaryP = document.createElement("p");
        summaryP.className = "toast-summary";
        summaryP.textContent = options.summary;
        body.appendChild(summaryP);
    }

    if (options.message) {
        const messageP = document.createElement("p");
        messageP.className = "toast-message";
        messageP.textContent = options.message;
        body.appendChild(messageP);
    }

    toast.appendChild(body);
    container.appendChild(toast);

    let timer = setTimeout(() => {
        dismissToast(toast);
    }, 10000);

    toast.addEventListener("mouseenter", () => {
        clearTimeout(timer);
    });

    toast.addEventListener("mouseleave", () => {
        timer = setTimeout(() => {
            dismissToast(toast);
        }, 5000);
    });

    closeBtn.addEventListener("click", () => {
        clearTimeout(timer);
        toast.remove();
    });

    return toast;
}

function dismissToast(element) {
    if (!element || !element.parentNode) return;
    element.classList.add("hide");
    element.addEventListener("animationend", () => {
        if (element.parentNode) {
            element.remove();
        }
    }, { once: true });
    setTimeout(() => {
        if (element.parentNode) {
            element.remove();
        }
    }, 350);
}
