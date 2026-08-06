"use strict";

const API_URL = window.WEDDING_CONFIG?.API_URL;

const searchBox = document.getElementById("guestSearch");
const results = document.getElementById("results");

let searchTimer = null;
let activeRequest = null;

if (!API_URL || !API_URL.startsWith("https://script.google.com/")) {
    console.error("The Google Apps Script API URL is missing or invalid.");

    results.textContent =
        "The seat finder is temporarily unavailable. Please try again later.";
}

searchBox.addEventListener("input", function () {
    clearTimeout(searchTimer);

    const query = normalizeInput(this.value);

    if (query.length < 2) {
        results.replaceChildren();
        return;
    }

    searchTimer = setTimeout(() => {
        searchGuests(query);
    }, 350);
});

async function searchGuests(query) {
    if (!API_URL) {
        return;
    }

    if (activeRequest) {
        activeRequest.abort();
    }

    activeRequest = new AbortController();

    showMessage("Searching…");

    try {
        const url = new URL(API_URL);

        url.searchParams.set("action", "search");
        url.searchParams.set("q", query);

        const response = await fetch(url.toString(), {
            method: "GET",
            signal: activeRequest.signal,
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`API returned HTTP ${response.status}`);
        }

        const guests = await response.json();

        if (!Array.isArray(guests)) {
            throw new Error("Unexpected API response.");
        }

        displaySearchResults(guests);
    } catch (error) {
        if (error.name === "AbortError") {
            return;
        }

        console.error("Guest search failed:", error);

        showMessage(
            "We couldn't complete the search. Please try again.",
            true
        );
    }
}

function displaySearchResults(guests) {
    results.replaceChildren();

    if (guests.length === 0) {
        showMessage("No guests found.");
        return;
    }

    guests.forEach((guest) => {
        if (!guest || typeof guest.name !== "string") {
            return;
        }

        const button = document.createElement("button");

        button.type = "button";
        button.className =
            "list-group-item list-group-item-action d-flex align-items-center gap-2";

        const icon = document.createElement("i");
        icon.className = "bi bi-person-circle";
        icon.setAttribute("aria-hidden", "true");

        const name = document.createElement("span");

        // textContent prevents HTML injection.
        name.textContent = guest.name;

        button.append(icon, name);

        button.addEventListener("click", () => {
            loadGuest(guest.name);
        });

        results.appendChild(button);
    });
}

async function loadGuest(guestName) {
    if (!API_URL || typeof guestName !== "string") {
        return;
    }

    showMessage("Loading your seating information…");

    try {
        const url = new URL(API_URL);

        url.searchParams.set("action", "guest");
        url.searchParams.set("name", guestName);

        const response = await fetch(url.toString(), {
            method: "GET",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`API returned HTTP ${response.status}`);
        }

        const guest = await response.json();

        if (!guest.success) {
            showMessage("Guest details could not be found.", true);
            return;
        }

        displayGuestDetails(guest);
    } catch (error) {
        console.error("Guest lookup failed:", error);

        showMessage(
            "We couldn't load the seating information. Please try again.",
            true
        );
    }
}

function displayGuestDetails(guest) {
    results.replaceChildren();

    const card = document.createElement("div");
    card.className = "card border-0 bg-light";

    const body = document.createElement("div");
    body.className = "card-body text-center";

    const title = document.createElement("h2");
    title.className = "h4 mb-3";
    title.textContent = guest.guest;

    const table = document.createElement("p");
    table.className = "mb-2";
    table.textContent = `Table: ${guest.table || "To be confirmed"}`;

    const seat = document.createElement("p");
    seat.className = "mb-2";
    seat.textContent = `Seat: ${guest.seat || "To be confirmed"}`;

    const meal = document.createElement("p");
    meal.className = "mb-4";
    meal.textContent = `Main course: ${guest.meal || "Not specified"}`;

    const searchAgainButton = document.createElement("button");
    searchAgainButton.type = "button";
    searchAgainButton.className = "btn btn-outline-success";
    searchAgainButton.textContent = "Search another guest";

    searchAgainButton.addEventListener("click", resetSearch);

    body.append(
        title,
        table,
        seat,
        meal,
        searchAgainButton
    );

    card.appendChild(body);
    results.appendChild(card);
}

function resetSearch() {
    searchBox.value = "";
    results.replaceChildren();
    searchBox.focus();
}

function showMessage(message, isError = false) {
    results.replaceChildren();

    const element = document.createElement("div");

    element.className = isError
        ? "p-3 text-danger text-center"
        : "p-3 text-muted text-center";

    element.textContent = message;

    results.appendChild(element);
}

function normalizeInput(value) {
    return String(value)
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 80);
}