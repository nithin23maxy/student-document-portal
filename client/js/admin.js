async function loadStudents() {

    const response = await fetch("/api/students");

    const data = await response.json();

    document.getElementById("totalStudents").innerHTML = data.students.length;
    document.getElementById("totalDocs").innerHTML = data.students.length;

    let rows = "";

    data.students.forEach(student => {

        rows += `

        <tr>

            <td>${student.usn}</td>

            <td>${student.name}</td>

            <td>${student.department}</td>

            <td>${student.filename}</td>

            <td>

                <a href="/uploads/${student.filepath}" target="_blank">
                    <button class="view">View</button>
                </a>

                <button onclick="editStudent(
                    ${student.id},
                    '${student.usn}',
                    '${student.name}',
                    '${student.department}'
                )">
                    Edit
                </button>

                <button class="delete" onclick="deleteStudent(${student.id})">
                    Delete
                </button>

            </td>

        </tr>

        `;

    });

    document.getElementById("studentTable").innerHTML = rows;

}

async function editStudent(id, usn, name, department) {

    const newUSN = prompt("Enter USN", usn);
    if (newUSN === null) return;

    const newName = prompt("Enter Student Name", name);
    if (newName === null) return;

    const newDepartment = prompt("Enter Department", department);
    if (newDepartment === null) return;

    const response = await fetch("/api/document/update/" + id, {

        method: "PUT",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            usn: newUSN,
            name: newName,
            department: newDepartment
        })

    });

    const data = await response.json();

    alert(data.message);

    loadStudents();

}

async function deleteStudent(id) {

    if (!confirm("Are you sure you want to delete this student?")) {
        return;
    }

    const response = await fetch("/api/document/delete/" + id, {

        method: "DELETE"

    });

    const data = await response.json();

    alert(data.message);

    loadStudents();

}

loadStudents();

function searchStudents() {

    const input = document.getElementById("search").value.toLowerCase();

    const rows = document.querySelectorAll("#studentTable tr");

    rows.forEach(row => {

        const text = row.innerText.toLowerCase();

        if (text.includes(input)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }

    });

}