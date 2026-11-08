const form = document.getElementById("raiseIssueForm");
form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const studentId = document.getElementById("studentId").value;
    const studentName = document.getElementById("studentName").value;
    const roomNumber = document.getElementById("roomNumber").value;
    const hostel = document.getElementById("hostel").value;
    const phone = document.getElementById("phone").value;
    const description = document.getElementById("description").value;

    const issueData = {
        student_id: studentId,
        student_name: studentName,
        room_number: roomNumber,
        hostel: hostel,
        phone: phone,
        description: description
    };

});