const API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:")
    ? "http://127.0.0.1:8000"
    : "https://warden-vspr.onrender.com";

const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
if (!token && typeof window !== "undefined" && window.location) {
    window.location.href = "auth.html";
}

const form = document.getElementById("raiseIssueForm");

if (form) {
    form.addEventListener("submit", async function(event) {
        event.preventDefault();

        const studentId = document.getElementById("studentId") ? document.getElementById("studentId").value.trim() : "";
        const studentName = document.getElementById("studentName") ? document.getElementById("studentName").value.trim() : "";
        const roomNumber = document.getElementById("roomNumber") ? document.getElementById("roomNumber").value.trim() : "";
        const hostel = document.getElementById("hostel") ? document.getElementById("hostel").value.trim() : "";
        const phone = document.getElementById("phone") ? document.getElementById("phone").value.trim() : "";
        const description = document.getElementById("description") ? document.getElementById("description").value.trim() : "";

        const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector(".submitButton");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Submitting issue...";
        }

        const activeToken = (typeof localStorage !== "undefined" && localStorage.getItem("token")) || token;

        try {
            const response = await fetch(`${API}/issues`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${activeToken}`
                },
                body: JSON.stringify({
                    student_id: studentId,
                    student_name: studentName,
                    room_number: roomNumber,
                    hostel: hostel,
                    phone: phone,
                    description: description
                })
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
                let detail = "Submission failed";
                try {
                    const errData = await response.json();
                    if (typeof errData.detail === "string") {
                        detail = errData.detail;
                    } else if (Array.isArray(errData.detail)) {
                        detail = errData.detail.map(e => e.msg || JSON.stringify(e)).join(", ");
                    } else if (errData.message) {
                        detail = errData.message;
                    }
                } catch (_) {
                    detail = response.statusText || detail;
                }

                showToast({
                    type: "error",
                    title: "Error",
                    message: "Error: " + detail
                });

                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Submit";
                }
                return;
            }

            const result = await response.json();
            form.reset();

            showToast({
                id: result.id,
                category: result.category,
                priority: result.priority,
                summary: result.summary,
                type: "success"
            });

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Submit";
            }
        } catch (error) {
            showToast({
                type: "error",
                title: "Error",
                message: "Error: " + (error.message || "Network error occurred")
            });

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Submit";
            }
        }
    });
}

function showToast(options = {}) {
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
    title.textContent = options.title || (isError ? "Error" : "Issue Raised Successfully");
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

    const hasBadges = (options.id !== undefined && options.id !== null) || options.category || options.priority;
    if (hasBadges) {
        const meta = document.createElement("div");
        meta.className = "toast-meta";

        if (options.id !== undefined && options.id !== null) {
            const ticketBadge = document.createElement("span");
            ticketBadge.className = "toast-badge badge-ticket";
            ticketBadge.textContent = `Ticket #${options.id}`;
            meta.appendChild(ticketBadge);
        }

        if (options.category) {
            const categoryBadge = document.createElement("span");
            categoryBadge.className = "toast-badge badge-category";
            categoryBadge.textContent = `Category: ${options.category}`;
            meta.appendChild(categoryBadge);
        }

        if (options.priority) {
            const priorityBadge = document.createElement("span");
            const priorityClass = `badge-priority-${String(options.priority).toLowerCase()}`;
            priorityBadge.className = `toast-badge ${priorityClass}`;
            priorityBadge.textContent = `Priority: ${options.priority}`;
            meta.appendChild(priorityBadge);
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

if (typeof module !== "undefined" && module.exports) {
    module.exports = { showToast, dismissToast };
}
