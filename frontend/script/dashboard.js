const API = "https://warden-vspr.onrender.com";

// Immediate auth check on script load
(function checkAuth() {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
        if (typeof window !== "undefined" && window.location) {
            window.location.href = "auth.html";
        }
        return;
    }

    // Verify token validity against backend
    fetch(`${API}/auth/me`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
    .then(async (response) => {
        if (response.status === 401 || !response.ok) {
            localStorage.removeItem("token");
            window.location.href = "auth.html";
            return;
        }

        const user = await response.json();
        // Update role display in navbar if element exists
        const appNameLink = document.querySelector(".appName a");
        if (appNameLink && user && user.role) {
            appNameLink.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        }
    })
    .catch((error) => {
        console.error("Dashboard auth verification failed:", error);
    });
})();
