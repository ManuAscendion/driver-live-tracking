import { db } from "./firebase.js";
import { ref, onValue, set, remove }
from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

/* ================= CONFIG ================= */

const DRIVER_BASE_URL = "https://driver-live-tracking.vercel.app";

/* ================= STATE ================= */

let map;
let autocompletePickup;
let autocompleteDrop;
let pickupPlace = null;
let dropPlace = null;

const driverMarkers = {};
const pickupMarkers = {};
const dropMarkers = {};

const tripsDiv = document.getElementById("trips");

/* ================= MAP INIT ================= */

function waitForGoogleMaps() {
  if (window.google && window.google.maps && window.google.maps.places) {
    initMap();
  } else {
    setTimeout(waitForGoogleMaps, 100);
  }
}

function initMap() {
  if (map) return;

  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 20.5937, lng: 78.9629 },
    zoom: 5,
  });

  initSearchBoxes();
  startFirebaseListener();
}

waitForGoogleMaps();

/* ================= SEARCH (PICKUP / DROP) ================= */

function initSearchBoxes() {
  const pickupInput = document.getElementById("pickupInput");
  const dropInput = document.getElementById("dropInput");

  autocompletePickup = new google.maps.places.Autocomplete(pickupInput);
  autocompleteDrop = new google.maps.places.Autocomplete(dropInput);

  autocompletePickup.addListener("place_changed", () => {
    pickupPlace = autocompletePickup.getPlace();
  });

  autocompleteDrop.addListener("place_changed", () => {
    dropPlace = autocompleteDrop.getPlace();
  });
}

/* ================= HELPERS ================= */

function makeSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/* ================= ETA (CORRECT WAY) ================= */

const directionsService = new google.maps.DirectionsService();

function getETA(origin, destination) {
  return new Promise((resolve) => {
    directionsService.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.BEST_GUESS,
        },
      },
      (result, status) => {
        if (status !== "OK" || !result.routes.length) {
          resolve(null);
          return;
        }

        const leg = result.routes[0].legs[0];
        resolve({
          time: leg.duration_in_traffic
            ? leg.duration_in_traffic.text
            : leg.duration.text,
          distance: leg.distance.text,
        });
      }
    );
  });
}

/* ================= ACTIONS ================= */

window.startAddTrip = function () {
  const driverName = prompt("Driver Name");
  const leaderName = prompt("Leader Name");
  if (!driverName || !leaderName) return;

  window._tripDraft = {
    driverId: makeSlug(driverName),
    driverName,
    leaderName,
  };

  document.getElementById("searchBox").style.display = "block";
};

window.confirmTrip = function () {
  if (!pickupPlace || !dropPlace) {
    alert("Please select both pickup and drop");
    return;
  }

  const { driverId, driverName, leaderName } = window._tripDraft;

  set(ref(db, "trips/" + driverId), {
    driverName,
    leaderName,
    status: "active",
    pickup: {
      lat: pickupPlace.geometry.location.lat(),
      lng: pickupPlace.geometry.location.lng(),
      name: pickupPlace.name,
    },
    drop: {
      lat: dropPlace.geometry.location.lat(),
      lng: dropPlace.geometry.location.lng(),
      name: dropPlace.name,
    },
    createdAt: Date.now(),
  });

  document.getElementById("searchBox").style.display = "none";
  document.getElementById("pickupInput").value = "";
  document.getElementById("dropInput").value = "";
  pickupPlace = dropPlace = null;
};

window.copyLink = (link) => navigator.clipboard.writeText(link);
window.endTrip = (id) => set(ref(db, "trips/" + id + "/status"), "ended");

window.deleteTrip = (id) => {
  if (!confirm("Delete trip?")) return;
  remove(ref(db, "trips/" + id));
  remove(ref(db, "locations/" + id));
};

/* ================= FIREBASE LISTENER ================= */

function startFirebaseListener() {
  onValue(ref(db), async (snap) => {
    const data = snap.val() || {};
    const trips = data.trips || {};
    const locations = data.locations || {};

    tripsDiv.innerHTML = "";

    for (const [id, trip] of Object.entries(trips)) {
      const loc = locations[id];
      const link = `${DRIVER_BASE_URL}/driver.html?id=${id}`;

      const div = document.createElement("div");
      div.className = "trip";
      div.innerHTML = `
        <b>${trip.driverName}</b>
        <div>${trip.pickup?.name} ➜ ${trip.drop?.name}</div>
        <div>Status: ${trip.status}</div>
        <div class="eta">ETA: waiting for driver...</div>
        <small>${link}</small><br/>
        <button onclick="copyLink('${link}')">📋</button>
        <button onclick="endTrip('${id}')">🛑</button>
        <button onclick="deleteTrip('${id}')">🗑️</button>
      `;
      tripsDiv.appendChild(div);

      const bounds = new google.maps.LatLngBounds();

      /* DRIVER MARKER */
      if (loc) {
        const pos = { lat: loc.lat, lng: loc.lng };
        bounds.extend(pos);

        if (!driverMarkers[id]) {
          driverMarkers[id] = new google.maps.Marker({
            map,
            position: pos,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#fff",
            },
            title: "Driver",
          });
        } else {
          driverMarkers[id].setPosition(pos);
        }
      }

      /* PICKUP */
      if (trip.pickup) {
        bounds.extend(trip.pickup);
        if (!pickupMarkers[id]) {
          pickupMarkers[id] = new google.maps.Marker({
            map,
            position: trip.pickup,
            label: "P",
          });
        }
      }

      /* DROP */
      if (trip.drop) {
        bounds.extend(trip.drop);
        if (!dropMarkers[id]) {
          dropMarkers[id] = new google.maps.Marker({
            map,
            position: trip.drop,
            label: "X",
          });
        }
      }

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
      }

      /* ETA */
      if (loc && trip.drop && trip.status !== "ended") {
        const eta = await getETA(
          { lat: loc.lat, lng: loc.lng },
          trip.drop
        );

        if (eta) {
          div.querySelector(".eta").innerText =
            `ETA: ${eta.time} (${eta.distance})`;
        }
      }
    }
  });
}
