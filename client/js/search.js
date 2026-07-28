async function searchStudent() {

    const usn = document.getElementById("usn").value.trim();

    const result = document.getElementById("result");

    if(usn===""){

        result.innerHTML="<p>Please enter USN</p>";
        return;

    }

    const response = await fetch("/api/student/search/"+usn);

    const data = await response.json();

    if(!data.success){

        result.innerHTML="<h3 style='color:red;'>Document Not Found</h3>";
        return;

    }

    const s=data.student;

    result.innerHTML=`

    <h3>Student Details</h3>

    <p><b>Name :</b> ${s.name}</p>

    <p><b>USN :</b> ${s.usn}</p>

    <p><b>Department :</b> ${s.department}</p>

    <p><b>Document :</b> ${s.filename}</p>

    <a href="/uploads/${s.filepath}" target="_blank">

    Open PDF

    </a>

    `;

}