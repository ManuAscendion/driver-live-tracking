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

navigator.geolocation.watchPosition(
  (position) => {
    set(ref(db, "locations/" + DRIVER_ID), {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      timestamp: Date.now()
    });

    statusDiv.innerText =
      "Location sent ✔️\n" +
      position.coords.latitude.toFixed(5) + ", " +
      position.coords.longitude.toFixed(5);
  },
  () => {
    statusDiv.innerText = "Location permission denied ❌";
  },
  { enableHighAccuracy: true }
);
