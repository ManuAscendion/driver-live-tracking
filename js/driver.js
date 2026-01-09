import { db } from "./firebase.js";
import { ref, set } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const statusDiv = document.getElementById("status");
const driverIdText = document.getElementById("driverIdText");

const params = new URLSearchParams(window.location.search);
const DRIVER_ID = params.get("id");

if (!DRIVER_ID) {
  statusDiv.innerText = "❌ Driver ID missing";
  throw new Error("Driver ID missing");
}

driverIdText.innerText = `Driver ID: ${DRIVER_ID}`;

function sendLocation() {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const payload = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        timestamp: Date.now(),
      };

      // ✅ THIS IS THE CRITICAL WRITE
      set(ref(db, "locations/" + DRIVER_ID), payload);

      statusDiv.innerText =
        "Location sent ✔️\n" +
        payload.lat.toFixed(5) + ", " +
        payload.lng.toFixed(5);
    },
    (err) => {
      statusDiv.innerText = "❌ Location error";
      console.error("GPS error:", err);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    }
  );
}

/* 🚀 Send immediately */
sendLocation();

/* 🔁 Keep sending every 5 seconds */
setInterval(sendLocation, 5000);
