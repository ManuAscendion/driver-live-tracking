import { db } from "./firebase.js";
import { ref, onValue, set, remove }
from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

/* 🔒 Always generate Vercel links */
const BASE_URL = "https://multi-live-location.vercel.app";

/* Convert driver name → URL-safe ID */
function makeSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// ---- MAP ----
const map = L.map("map").setView([20.5937, 78.9629], 5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const tripsDiv = document.getElementById("trips");
const markers = {};

// ---- ADD TRIP ----
window.addTrip = function () {
  const driverName = prompt("Driver Name");
  const leaderName = prompt("Leader Name");
  if (!driverName || !leaderName) return;

  const driverId = makeSlug(driverName);

  set(ref(db, "trips/" + driverId), {
    driverName,
    leaderName,
    status: "active",
    createdAt: Date.now()
  });
};

// ---- COPY LINK ----
window.copyLink = function (link) {
  navigator.clipboard.writeText(link);
  alert("Link copied. Send it to the driver.");
};

// ---- END TRIP ----
window.endTrip = function (driverId) {
  set(ref(db, "trips/" + driverId + "/status"), "ended");

  if (markers[driverId]) {
    map.removeLayer(markers[driverId]);
    delete markers[driverId];
  }
};

// ---- DELETE TRIP ----
window.deleteTrip = function (driverId) {
  if (!confirm("Delete this trip permanently?")) return;

  remove(ref(db, "trips/" + driverId));
  remove(ref(db, "locations/" + driverId));

  if (markers[driverId]) {
    map.removeLayer(markers[driverId]);
    delete markers[driverId];
  }
};

// ---- LISTEN ----
onValue(ref(db), (snapshot) => {
  const data = snapshot.val() || {};
  const trips = data.trips || {};
  const locations = data.locations || {};

  tripsDiv.innerHTML = "";

  Object.entries(trips).forEach(([driverId, trip]) => {
    const isEnded = trip.status === "ended";
    const loc = locations[driverId];

    const link = `${BASE_URL}/driver.html?id=${driverId}`;

    const div = document.createElement("div");
    div.className = "trip" + (isEnded ? " ended" : "");
    div.innerHTML = `
      <b>${trip.driverName}</b><br/>
      Leader: ${trip.leaderName}<br/>
      Status: ${trip.status}<br/>
      <div class="link">${link}</div>
      <button onclick="copyLink('${link}')">📋 Copy</button>
      ${
        isEnded
          ? ""
          : `<button onclick="endTrip('${driverId}')">🛑 End</button>`
      }
      <button onclick="deleteTrip('${driverId}')">🗑️ Delete</button>
    `;

    div.onclick = () => {
      if (markers[driverId]) {
        map.setView(markers[driverId].getLatLng(), 18);
      }
    };

    tripsDiv.appendChild(div);

    if (!isEnded && loc) {
      if (!markers[driverId]) {
        markers[driverId] = L.marker([loc.lat, loc.lng]).addTo(map);
      } else {
        markers[driverId].setLatLng([loc.lat, loc.lng]);
      }
    }
  });
});
