"use strict";

const API_URL = window.WEDDING_CONFIG?.API_URL;

const weddingName = document.getElementById("weddingName");
const weddingDate = document.getElementById("weddingDate");

const photoUploadLink = document.getElementById("photoUploadLink");
const weddingWebsiteLink = document.getElementById("weddingWebsiteLink");
const whatsappGroupLink = document.getElementById("whatsappGroupLink");

const photoStatus = document.getElementById("photoStatus");
const websiteStatus = document.getElementById("websiteStatus");
const whatsappStatus = document.getElementById("whatsappStatus");

document.addEventListener("DOMContentLoaded", loadSettings);

async function loadSettings() {
    if (!isValidApiUrl(API_URL)) {
        console.error("The Apps Script API URL is missing or invalid.");
        showUnavailableState();
        return;
    }

    try {
        const url = new URL(API_URL);
        url.searchParams.set("action", "settings");

        const response = await fetch(url.toString(), {
            method: "GET",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`Settings API returned HTTP ${response.status}`);
        }

        const data = await response.json();

        if (
            !data ||
            data.success !== true ||
            !data.settings ||
            typeof data.settings !== "object"
        ) {
            throw new Error("Unexpected settings response.");
        }

        applySettings(data.settings);
    } catch (error) {
        console.error("Unable to load wedding settings:", error);
        showUnavailableState();
    }
}

function applySettings(settings) {
    const name = normalizeText(settings.wedding_name, 80);
    const date = normalizeText(settings.wedding_date, 80);

    if (name) {
        weddingName.textContent = name;
        document.title = `${name} Wedding Hub`;
    }

    if (date) {
        weddingDate.textContent = date;
    }

    configureExternalLink({
        element: photoUploadLink,
        statusElement: photoStatus,
        rawUrl: settings.photo_url,
        validator: isValidHttpsUrl,
        unavailableText: "Coming soon"
    });

    configureExternalLink({
        element: weddingWebsiteLink,
        statusElement: websiteStatus,
        rawUrl: settings.website_url,
        validator: isValidHttpsUrl,
        unavailableText: "Unavailable"
    });

    configureExternalLink({
        element: whatsappGroupLink,
        statusElement: whatsappStatus,
        rawUrl: settings.whatsapp_group,
        validator: isValidWhatsAppUrl,
        unavailableText: "Unavailable"
    });
}

function configureExternalLink({
    element,
    statusElement,
    rawUrl,
    validator,
    unavailableText
}) {
    const url = String(rawUrl || "").trim();

    if (!validator(url)) {
        disableLink(element, statusElement, unavailableText);
        return;
    }

    element.href = url;
    element.target = "_blank";
    element.rel = "noopener noreferrer";

    element.classList.remove("feature-disabled");
    element.removeAttribute("aria-disabled");

    if (statusElement) {
        statusElement.remove();
    }
}

function disableLink(element, statusElement, message) {
    element.href = "#";
    element.classList.add("feature-disabled");
    element.setAttribute("aria-disabled", "true");

    if (statusElement) {
        statusElement.textContent = message;
    }
}

function showUnavailableState() {
    disableLink(
        photoUploadLink,
        photoStatus,
        "Coming soon"
    );

    disableLink(
        weddingWebsiteLink,
        websiteStatus,
        "Temporarily unavailable"
    );

    disableLink(
        whatsappGroupLink,
        whatsappStatus,
        "Temporarily unavailable"
    );
}

function isValidApiUrl(value) {
    try {
        const url = new URL(String(value || ""));

        return (
            url.protocol === "https:" &&
            url.hostname === "script.google.com"
        );
    } catch {
        return false;
    }
}

function isValidHttpsUrl(value) {
    try {
        const url = new URL(String(value || ""));
        return url.protocol === "https:";
    } catch {
        return false;
    }
}

function isValidWhatsAppUrl(value) {
    try {
        const url = new URL(String(value || ""));
        const hostname = url.hostname.toLowerCase();

        const allowedHosts = [
            "chat.whatsapp.com",
            "wa.me",
            "www.whatsapp.com",
            "whatsapp.com"
        ];

        return (
            url.protocol === "https:" &&
            allowedHosts.includes(hostname)
        );
    } catch {
        return false;
    }
}

function normalizeText(value, maximumLength) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, maximumLength);
}