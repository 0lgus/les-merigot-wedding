const API_URL = "https://script.google.com/macros/s/AKfycbwMSkGV56bXpmeA-rlJwzj3dN5paTxf4NYk-UTDIlQtoWQ3b3VKoX_oM6pDb61c8p-xtQ/exec";

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

async function search(query) {

    results.innerHTML =
        '<div class="p-3 text-center">Searching...</div>';

    const response = await fetch(
        `${API_URL}?action=search&q=${encodeURIComponent(query)}`
    );

    const guests = await response.json();

    results.innerHTML = "";

    if (guests.length === 0) {

        results.innerHTML =
            '<div class="p-3 text-muted">No guests found.</div>';

        return;

    }

    guests.forEach(g => {

        const btn = document.createElement("button");

        btn.className =
            "list-group-item list-group-item-action";

        btn.innerHTML =
            `<i class="bi bi-person-circle"></i> ${escapeHtml(g.name)}`;

        btn.onclick = () => loadGuest(g.name);

        results.appendChild(btn);

    });

}

function escapeHtml(text) {

    const div = document.createElement("div");

    div.innerText = text;

    return div.innerHTML;

}

async function loadGuest(name){

    const response = await fetch(

        `${API_URL}?action=guest&name=${encodeURIComponent(name)}`

    );

    const guest = await response.json();

    if(!guest.success){

        alert("Guest not found.");

        return;

    }

    alert(

`Guest: ${guest.guest}

Table: ${guest.table}

Seat: ${guest.seat}

Meal: ${guest.meal}`

    );

}