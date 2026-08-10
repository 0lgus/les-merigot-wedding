"use strict";

const API_URL = window.WEDDING_CONFIG?.API_URL;

const searchBox = document.getElementById("guestSearch");
const results = document.getElementById("results");

const seatingMapSection =
    document.getElementById("seatingMapSection");

const seatingMapContainer =
    document.getElementById("seatingMapContainer");

const closeMapButton =
    document.getElementById("closeMapButton");

let searchTimer = null;
let activeRequest = null;

let seatingMapLoaded = false;
let currentGuest = null;


/* ==================================================
   INITIAL VALIDATION
================================================== */

if (!API_URL || !API_URL.startsWith("https://script.google.com/")) {
    console.error(
        "The Google Apps Script API URL is missing or invalid."
    );

    results.textContent =
        "The seat finder is temporarily unavailable. Please try again later.";

    searchBox.disabled = true;
}


/* ==================================================
   SEARCH INPUT
================================================== */

searchBox.addEventListener("input", function () {
    clearTimeout(searchTimer);

    const query = normalizeInput(this.value);

    hideSeatingMap();

    if (query.length < 2) {
        cancelActiveRequest();
        results.replaceChildren();
        return;
    }

    searchTimer = setTimeout(() => {
        searchGuests(query);
    }, 250);
});


/* ==================================================
   SEARCH GUESTS
================================================== */

async function searchGuests(query) {
    if (!API_URL) {
        return;
    }

    cancelActiveRequest();

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
            throw new Error(
                `API returned HTTP ${response.status}`
            );
        }

        const guests = await response.json();

        if (!Array.isArray(guests)) {
            throw new Error(
                "Unexpected API response."
            );
        }

        displaySearchResults(guests);

    } catch (error) {

        if (error.name === "AbortError") {
            return;
        }

        console.error(
            "Guest search failed:",
            error
        );

        showMessage(
            "We couldn't complete the search. Please try again.",
            true
        );

    } finally {
        activeRequest = null;
    }
}


/* ==================================================
   DISPLAY SEARCH RESULTS
================================================== */

function displaySearchResults(guests) {
    results.replaceChildren();

    if (guests.length === 0) {
        showMessage("No guests found.");
        return;
    }

    guests.forEach((guest) => {
        if (!isValidGuestResult(guest)) {
            return;
        }

        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "list-group-item " +
            "list-group-item-action " +
            "d-flex " +
            "align-items-center " +
            "gap-2";

        const icon =
            document.createElement("i");

        icon.className =
            "bi bi-person-circle";

        icon.setAttribute(
            "aria-hidden",
            "true"
        );

        const name =
            document.createElement("span");

        name.textContent = guest.name;

        button.append(
            icon,
            name
        );

        button.addEventListener(
            "click",
            () => {
                displayGuestDetails({
                    guest: guest.name,
                    table: guest.table,
                    seat: guest.seat,
                    meal: guest.meal
                });
            }
        );

        results.appendChild(button);
    });
}


/* ==================================================
   DISPLAY GUEST DETAILS
================================================== */

function displayGuestDetails(guest) {
    results.replaceChildren();

    hideSeatingMap();

    currentGuest = guest;

    const card =
        document.createElement("div");

    card.className =
        "card border-0 bg-light";

    const body =
        document.createElement("div");

    body.className =
        "card-body text-center";

    const title =
        document.createElement("h2");

    title.className =
        "h4 mb-3";

    title.textContent =
        guest.guest;


    const table =
        document.createElement("p");

    table.className = "mb-2";

    table.textContent =
        `Table: ${
            displayValue(
                guest.table,
                "To be confirmed"
            )
        }`;


    const seat =
        document.createElement("p");

    seat.className = "mb-2";

    seat.textContent =
        `Seat: ${
            displayValue(
                guest.seat,
                "To be confirmed"
            )
        }`;


    const meal =
        document.createElement("p");

    meal.className = "mb-4";

    meal.textContent =
        `Main course: ${
            displayValue(
                guest.meal,
                "Not specified"
            )
        }`;


    /* SEARCH AGAIN */

    const searchAgainButton =
        document.createElement("button");

    searchAgainButton.type =
        "button";

    searchAgainButton.className =
        "btn btn-outline-success me-2 mb-2";

    searchAgainButton.textContent =
        "Search another guest";

    searchAgainButton.addEventListener(
        "click",
        resetSearch
    );


    /* SHOW MY SEAT */

    const showSeatButton =
        document.createElement("button");

    showSeatButton.type =
        "button";

    showSeatButton.className =
        "btn btn-success mb-2";

    showSeatButton.textContent =
        "Show My Seat";


    const tableNumber =
        normalizeNumberValue(
            guest.table
        );

    const seatNumber =
        normalizeNumberValue(
            guest.seat
        );


    if (!tableNumber || !seatNumber) {
        showSeatButton.disabled = true;

        showSeatButton.textContent =
            "Seat map unavailable";
    }


    showSeatButton.addEventListener(
        "click",
        async () => {

            await showGuestSeat(
                tableNumber,
                seatNumber
            );

        }
    );


    body.append(
        title,
        table,
        seat,
        meal,
        searchAgainButton,
        showSeatButton
    );

    card.appendChild(body);

    results.appendChild(card);
}


/* ==================================================
   LOAD / SHOW SVG MAP
================================================== */

async function showGuestSeat(
    tableNumber,
    seatNumber
) {
    if (!tableNumber || !seatNumber) {
        return;
    }

    try {

        if (!seatingMapLoaded) {
            await loadSeatingMap();
        }

        clearMapHighlights();

        const tableId =
            `table-${tableNumber}`;

        const seatId =
            `table-${tableNumber}-seat-${seatNumber}`;


        const tableElement =
            seatingMapContainer
                .querySelector(
                    `#${CSS.escape(tableId)}`
                );

        const seatElement =
            seatingMapContainer
                .querySelector(
                    `#${CSS.escape(seatId)}`
                );


        if (!tableElement) {
            throw new Error(
                `Table not found in SVG: ${tableId}`
            );
        }


        tableElement.classList.add(
            "is-active"
        );


        if (seatElement) {
            seatElement.classList.add(
                "seat-position",
                "is-active"
            );
        } else {
            console.warn(
                `Seat not found in SVG: ${seatId}`
            );
        }

        /* Focus map on the guest's table */


        seatingMapSection.hidden = false;
            


        requestAnimationFrame(() => {


            seatingMapSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        });

    } catch (error) {

        console.error(
            "Unable to show seating map:",
            error
        );

        showMessage(
            "We couldn't load the seating map. Please try again.",
            true
        );

    }
}

/* ==================================================
   FOCUS MAP ON SELECTED TABLE
================================================== */

/* function focusMapOnTable(tableElement) {
    const svg =
        seatingMapContainer.querySelector("svg");

    if (!svg || !tableElement) {
        return;
    }

    const box =
        tableElement.getBBox();
    
    if (
        !Number.isFinite(box.x) ||
        !Number.isFinite(box.y) ||
        !Number.isFinite(box.width) ||
        !Number.isFinite(box.height) ||
        box.width <= 0 ||
        box.height <= 0
    ) {
        console.warn(
            "Invalid SVG table bounds. Keeping full map view."
        );

        return;
    }
    
    const paddingX =
        box.width * 0.8;

    const paddingY =
        box.height * 0.8;

    const x =
        box.x - paddingX;

    const y =
        box.y - paddingY;

    const width =
        box.width + paddingX * 2;

    const height =
        box.height + paddingY * 2;

    svg.setAttribute(
        "viewBox",
        `${x} ${y} ${width} ${height}`
    );
}
*/
/* ==================================================
   LOAD SVG INLINE
================================================== */

async function loadSeatingMap() {
    const response =
        await fetch(
            "seating-map.svg",
            {
                cache: "no-store"
            }
        );

    if (!response.ok) {
        throw new Error(
            `SVG returned HTTP ${response.status}`
        );
    }

    const svgText =
        await response.text();

    const parser =
        new DOMParser();

    const documentSvg =
        parser.parseFromString(
            svgText,
            "image/svg+xml"
        );

    const svg =
        documentSvg.querySelector("svg");

    if (!svg) {
        throw new Error(
            "No SVG element found."
        );
    }


    /* Remove potentially unsafe nodes */

    svg
        .querySelectorAll(
            "script, foreignObject"
        )
        .forEach(
            (node) => node.remove()
        );


    svg.removeAttribute("width");
    svg.removeAttribute("height");

    svg.setAttribute(
        "role",
        "img"
    );

    svg.setAttribute(
        "aria-label",
        "Wedding seating plan"
    );

/*    const originalViewBox =
        svg.getAttribute("viewBox");

    if (originalViewBox) {
        svg.dataset.originalViewBox =
            originalViewBox;
    }
*/

    seatingMapContainer
        .replaceChildren(
            document.importNode(
                svg,
                true
            )
        );


    seatingMapLoaded = true;
}


/* ==================================================
   CLEAR HIGHLIGHTS
================================================== */

function clearMapHighlights() {
    seatingMapContainer
        .querySelectorAll(
            ".is-active"
        )
        .forEach(
            (element) => {
                element.classList.remove(
                    "is-active"
                );
            }
        );
}

/* ==================================================
   RESET MAP VIEW
================================================== */

/*function resetMapView() {
    const svg =
        seatingMapContainer.querySelector("svg");

    if (!svg) {
        return;
    }

    const originalViewBox =
        svg.dataset.originalViewBox;

    if (originalViewBox) {
        svg.setAttribute(
            "viewBox",
            originalViewBox
        );
    }
}
*/

/* ==================================================
   HIDE MAP
================================================== */

function hideSeatingMap() {
    if (!seatingMapSection) {
        return;
    }

    seatingMapSection.hidden =
        true;

    clearMapHighlights();
}


/* ==================================================
   CLOSE MAP
================================================== */

if (closeMapButton) {

    closeMapButton.addEventListener(
        "click",
        () => {

            hideSeatingMap();

            if (currentGuest) {
                results.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            }

        }
    );

}


/* ==================================================
   RESET SEARCH
================================================== */

function resetSearch() {
    cancelActiveRequest();

    currentGuest = null;

    hideSeatingMap();

    searchBox.value = "";

    results.replaceChildren();

    searchBox.focus();
}


/* ==================================================
   REQUEST CONTROL
================================================== */

function cancelActiveRequest() {
    if (activeRequest) {

        activeRequest.abort();

        activeRequest = null;
    }
}


/* ==================================================
   MESSAGES
================================================== */

function showMessage(
    message,
    isError = false
) {
    results.replaceChildren();

    const element =
        document.createElement("div");

    element.className =
        isError
            ? "p-3 text-danger text-center"
            : "p-3 text-muted text-center";

    element.textContent =
        message;

    results.appendChild(element);
}


/* ==================================================
   VALIDATION / NORMALIZATION
================================================== */

function normalizeInput(value) {
    return String(value)
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 80);
}


function normalizeNumberValue(value) {
    const normalized =
        String(value ?? "")
            .trim();

    const match =
        normalized.match(/\d+/);

    return match
        ? match[0]
        : "";
}


function isValidGuestResult(guest) {
    return Boolean(
        guest &&
        typeof guest.name === "string" &&
        guest.name.trim()
    );
}


function displayValue(
    value,
    fallback
) {
    const normalized =
        String(value ?? "")
            .trim();

    return normalized || fallback;
}