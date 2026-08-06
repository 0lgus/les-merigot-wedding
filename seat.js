const API_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";

const searchBox = document.getElementById("guestSearch");
const results = document.getElementById("results");

let timeout = null;

searchBox.addEventListener("input", function () {

    clearTimeout(timeout);

    const text = this.value.trim();

    if (text.length < 2) {

        results.innerHTML = "";

        return;

    }

    timeout = setTimeout(() => {

        search(text);

    }, 300);

});

async function search(query){

    results.innerHTML =
        '<div class="text-center p-3">Searching...</div>';

    // TEMPORARY:
    // We'll replace this with the real API after updating Apps Script.

    const demoGuests = [

        "Olga Chernova",
        "Benjamin Merigot",
        "Emma Smith",
        "Olivia Brown",
        "John Smith"

    ];

    const matches = demoGuests.filter(name =>
        name.toLowerCase().includes(query.toLowerCase())
    );

    results.innerHTML = "";

    if(matches.length===0){

        results.innerHTML =
            '<div class="text-muted p-3">No guests found.</div>';

        return;

    }

    matches.forEach(name=>{

        results.innerHTML +=

        `<button class="list-group-item list-group-item-action">

            <i class="bi bi-person-circle"></i>

            ${name}

        </button>`;

    });

}