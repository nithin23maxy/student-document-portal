const form = document.getElementById("uploadForm");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const formData = new FormData(form);

    try {

        const response = await fetch("/api/document/upload", {

            method: "POST",
            body: formData

        });

        const data = await response.json();

        document.getElementById("msg").innerHTML = data.message;

        if(data.success){

            form.reset();

        }

    } catch(err){

        document.getElementById("msg").innerHTML = "Upload Failed";

    }

});