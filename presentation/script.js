document.addEventListener("DOMContentLoaded", () => {
    const slides = Array.from(document.querySelectorAll(".slide"));
    const totalSlides = slides.length;
    let currentSlideIndex = 0;
    let notesVisible = false;
    let gridVisible = false;

    const slideIndicator = document.getElementById("slideIndicator");
    const progressBar = document.getElementById("progressBar");
    const btnPrev = document.getElementById("btnPrev");
    const btnNext = document.getElementById("btnNext");
    const btnNotes = document.getElementById("btnNotes");
    const btnGrid = document.getElementById("btnGrid");
    const btnPrint = document.getElementById("btnPrint");
    const btnFullscreen = document.getElementById("btnFullscreen");
    const gridModal = document.getElementById("gridModal");
    const btnCloseGrid = document.getElementById("btnCloseGrid");
    const gridThumbnails = document.getElementById("gridThumbnails");

    function updateSlide(index) {
        if (index < 0) index = 0;
        if (index >= totalSlides) index = totalSlides - 1;

        slides.forEach((slide, i) => {
            slide.classList.toggle("active", i === index);
            const notes = slide.querySelector(".speaker-notes");
            if (notes) {
                notes.classList.toggle("open", notesVisible);
            }
        });

        currentSlideIndex = index;

        // Update indicator & progress bar
        if (slideIndicator) {
            slideIndicator.textContent = `Slide ${currentSlideIndex + 1} of ${totalSlides}`;
        }
        if (progressBar) {
            const percentage = ((currentSlideIndex + 1) / totalSlides) * 100;
            progressBar.style.width = `${percentage}%`;
        }

        // Update nav arrow states
        if (btnPrev) btnPrev.style.opacity = currentSlideIndex === 0 ? "0.4" : "1";
        if (btnNext) btnNext.style.opacity = currentSlideIndex === totalSlides - 1 ? "0.4" : "1";

        // Update thumbnail active states if grid is rendered
        document.querySelectorAll(".thumb-card").forEach((thumb, i) => {
            thumb.classList.toggle("active-thumb", i === currentSlideIndex);
        });
    }

    function toggleNotes() {
        notesVisible = !notesVisible;
        if (btnNotes) btnNotes.classList.toggle("active", notesVisible);
        const activeSlide = slides[currentSlideIndex];
        if (activeSlide) {
            const notes = activeSlide.querySelector(".speaker-notes");
            if (notes) notes.classList.toggle("open", notesVisible);
        }
    }

    function toggleGrid() {
        gridVisible = !gridVisible;
        if (gridModal) gridModal.classList.toggle("open", gridVisible);
        if (btnGrid) btnGrid.classList.toggle("active", gridVisible);
    }

    function renderThumbnails() {
        if (!gridThumbnails) return;
        gridThumbnails.innerHTML = "";
        slides.forEach((slide, i) => {
            const title = slide.getAttribute("data-title") || `Slide ${i + 1}`;
            const card = document.createElement("div");
            card.className = `thumb-card ${i === currentSlideIndex ? "active-thumb" : ""}`;
            card.innerHTML = `
                <div class="thumb-num">SLIDE ${String(i + 1).padStart(2, "0")}</div>
                <div class="thumb-title">${title}</div>
            `;
            card.addEventListener("click", () => {
                updateSlide(i);
                toggleGrid();
            });
            gridThumbnails.appendChild(card);
        });
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.warn("Fullscreen request error:", err);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    // Event Listeners for Controls
    if (btnPrev) btnPrev.addEventListener("click", () => updateSlide(currentSlideIndex - 1));
    if (btnNext) btnNext.addEventListener("click", () => updateSlide(currentSlideIndex + 1));
    if (btnNotes) btnNotes.addEventListener("click", toggleNotes);
    if (btnGrid) btnGrid.addEventListener("click", toggleGrid);
    if (btnCloseGrid) btnCloseGrid.addEventListener("click", toggleGrid);
    if (btnFullscreen) btnFullscreen.addEventListener("click", toggleFullscreen);
    if (btnPrint) btnPrint.addEventListener("click", () => window.print());

    // Keyboard Shortcuts
    document.addEventListener("keydown", (e) => {
        // If grid modal is open, Escape closes it
        if (gridVisible && (e.key === "Escape" || e.key === "g" || e.key === "G")) {
            toggleGrid();
            return;
        }

        switch (e.key) {
            case "ArrowRight":
            case "PageDown":
            case " ": // Spacebar
                e.preventDefault();
                updateSlide(currentSlideIndex + 1);
                break;
            case "ArrowLeft":
            case "PageUp":
            case "Backspace":
                e.preventDefault();
                updateSlide(currentSlideIndex - 1);
                break;
            case "Home":
                e.preventDefault();
                updateSlide(0);
                break;
            case "End":
                e.preventDefault();
                updateSlide(totalSlides - 1);
                break;
            case "s":
            case "S":
                toggleNotes();
                break;
            case "g":
            case "G":
                toggleGrid();
                break;
            case "f":
            case "F":
                toggleFullscreen();
                break;
            case "p":
            case "P":
                window.print();
                break;
        }
    });

    renderThumbnails();
    updateSlide(0);
});
