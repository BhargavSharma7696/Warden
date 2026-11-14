const form = document.getElementById('raiseAnnouncementForm');
if (form) {
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        const title = document.getElementById('title').value.trim();
        const category = document.getElementById('category').value.trim();
        const team = document.getElementById('team').value.trim();
        const hostel = document.getElementById('hostel') ? document.getElementById('hostel').value.trim() : '';
        const body = document.getElementById('body').value.trim();

        const announcementData = {
            title: title,
            category: category,
            team: team,
            hostel: hostel,
            body: body
        };

        
    });
}
