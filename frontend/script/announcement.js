// This file gets the announcements from the backend and displays them.

const announcementList = document.getElementById("announcementList");
const announcementCount = document.getElementById("announcementCount");

// These elements show the details of the selected announcement.
const detailNumber = document.getElementById("detailNumber");
const detailCategory = document.getElementById("detailCategory");
const detailTitle = document.getElementById("detailTitle");
const detailDate = document.getElementById("detailDate");
const detailTeam = document.getElementById("detailTeam");
const detailBody = document.getElementById("detailBody");

let announcements = [];

// Get the announcement data from the JSON file.
async function getAnnouncements() {
    try {
        // Change this URL to the API route given by your backend.
        const response = await fetch("../data/announcements.json");

        if (!response.ok) {
            throw new Error("Could not load announcements");
        }

        const data = await response.json();

        // The backend can send either an array or an object with an announcements array.
        if (Array.isArray(data)) {
            announcements = data;
        } else {
            announcements = data.announcements;
        }

        if (!Array.isArray(announcements)) {
            announcements = [];
        }

        showAnnouncements();

    } catch (error) {
        announcementCount.textContent = "Could not load notices";
        announcementList.innerHTML =
            '<p class="noAnnouncements">Announcements could not be loaded. Please try again later.</p>';

        console.log(error);
    }
}

// Create one card for every announcement in the JSON data.
function showAnnouncements() {
    announcementList.innerHTML = "";

    announcementCount.textContent = announcements.length + " announcements";

    if (announcements.length === 0) {
        announcementList.innerHTML =
            '<p class="noAnnouncements">There are no announcements right now.</p>';
        return;
    }

    // This loop runs according to the number of announcements received.
    for (let i = 0; i < announcements.length; i++) {
        let notice = announcements[i];

        let card = document.createElement("button");
        card.className = "announcementCard";
        card.type = "button";

        card.innerHTML = `
            <div class="cardTop">
                <span class="cardCategory">${notice.category}</span>
                <span class="cardDate">${notice.date}</span>
            </div>

            <h3>${notice.title}</h3>

            <p class="cardSummary">${notice.summary}</p>

            <div class="cardBottom">
                <span>Notice ${notice.id}</span>
                <span class="cardAction">Read notice →</span>
            </div>
        `;

        // When a card is clicked, show its full announcement.
        card.addEventListener("click", function () {
            showDetails(i);
        });

        announcementList.appendChild(card);
    }

    // Show the first announcement when the page opens.
    showDetails(0);
}

// Display the complete information of one announcement.
function showDetails(index) {
    let notice = announcements[index];

    if (notice === undefined) {
        return;
    }

    // Remove the selected style from all cards.
    let cards = document.getElementsByClassName("announcementCard");

    for (let i = 0; i < cards.length; i++) {
        cards[i].classList.remove("selected");
    }

    // Add the selected style to the card that was clicked.
    cards[index].classList.add("selected");

    detailNumber.textContent = "ANNOUNCEMENT " + notice.id;
    detailCategory.textContent = notice.category;
    detailTitle.textContent = notice.title;
    detailDate.textContent = notice.date;
    detailTeam.textContent = notice.team;

    // Add the announcement paragraphs.
    let bodyHTML = "";

    if (notice.greeting) {
        bodyHTML += "<p>" + notice.greeting + "</p>";
    }

    if (notice.description) {
        bodyHTML += "<p>" + notice.description + "</p>";
    }

    // Show the extra information in a small table, if it exists.
    if (notice.details) {
        bodyHTML += '<div class="infoTable">';

        for (let key in notice.details) {
            bodyHTML += `
                <div class="infoRow">
                    <span>${key}</span>
                    <strong>${notice.details[key]}</strong>
                </div>
            `;
        }

        bodyHTML += "</div>";
    }

    if (notice.extraMessage) {
        bodyHTML += "<p>" + notice.extraMessage + "</p>";
    }

    if (notice.closing) {
        bodyHTML += "<p>" + notice.closing + "</p>";
    }

    detailBody.innerHTML = bodyHTML;
}

// Start loading announcements when the page is ready.
getAnnouncements();
