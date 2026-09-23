// =====================================
// SMART EMERGENCY ROUTE PLANNER
// =====================================

// Create map
const map = L.map("map").setView([13.0827, 80.2707], 13);


// =====================================
// OPENSTREETMAP
// =====================================

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);


// =====================================
// VARIABLES
// =====================================

let ambulanceMarker = null;
let hospitalMarker = null;
let routeLine = null;
let ambulanceAnimation = null;


// =====================================
// FIND LOCATION
// =====================================

async function findLocation(place) {

    const url =
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Location service unavailable.");
    }

    const data = await response.json();

    if (data.length === 0) {
        throw new Error("Location not found: " + place);
    }

    return [
        parseFloat(data[0].lat),
        parseFloat(data[0].lon)
    ];
}


// =====================================
// CALCULATE EMERGENCY ROUTE
// =====================================

async function calculateRoute() {

    const button = document.getElementById("routeBtn");

    const startPlace =
        document.getElementById("startLocation").value.trim();

    const hospitalPlace =
        document.getElementById("hospitalLocation").value.trim();


    // Check input
    if (!startPlace || !hospitalPlace) {

        alert("Please enter both locations.");

        return;
    }


    // Button loading state
    button.textContent = "⏳ FINDING LOCATIONS...";
    button.disabled = true;


    try {

        // =====================================
        // FIND AMBULANCE LOCATION
        // =====================================

        const start =
            await findLocation(startPlace);


        // =====================================
        // FIND HOSPITAL LOCATION
        // =====================================

        const destination =
            await findLocation(hospitalPlace);


        // =====================================
        // REMOVE OLD ROUTE / MARKERS
        // =====================================

        if (ambulanceAnimation) {
            clearInterval(ambulanceAnimation);
            ambulanceAnimation = null;
        }

        if (ambulanceMarker) {
            map.removeLayer(ambulanceMarker);
        }

        if (hospitalMarker) {
            map.removeLayer(hospitalMarker);
        }

        if (routeLine) {
            map.removeLayer(routeLine);
        }


        // =====================================
        // AMBULANCE MARKER
        // =====================================

        ambulanceMarker = L.marker(start)
            .addTo(map)
            .bindPopup("🚑 Ambulance AMB-001");


        // =====================================
        // HOSPITAL MARKER
        // =====================================

        hospitalMarker = L.marker(destination)
            .addTo(map)
            .bindPopup("🏥 Destination Hospital");


        // =====================================
        // CALCULATE ROAD ROUTE
        // =====================================

        button.textContent =
            "⏳ CALCULATING ROUTE...";


        const routeURL =
            `https://router.project-osrm.org/route/v1/driving/` +
            `${start[1]},${start[0]};` +
            `${destination[1]},${destination[0]}` +
            `?overview=full&geometries=geojson`;


        const routeResponse =
            await fetch(routeURL);


        if (!routeResponse.ok) {
            throw new Error("Routing service unavailable.");
        }


        const routeData =
            await routeResponse.json();


        if (routeData.code !== "Ok") {
            throw new Error("Unable to calculate route.");
        }


        const route =
            routeData.routes[0];


        // =====================================
        // GET ROUTE COORDINATES
        // =====================================

        const coordinates =
            route.geometry.coordinates.map(
                point => [point[1], point[0]]
            );


        // =====================================
        // DRAW EMERGENCY ROUTE
        // =====================================

        routeLine = L.geoJSON(
            route.geometry,
            {
                style: {
                    color: "#ef4444",
                    weight: 7,
                    opacity: 0.9
                }
            }
        ).addTo(map);


        // =====================================
        // DISTANCE
        // =====================================

        const distance =
            (route.distance / 1000).toFixed(1);


        // =====================================
        // ETA
        // =====================================

        const eta =
            Math.ceil(route.duration / 60);


        // =====================================
        // UPDATE DASHBOARD
        // =====================================

        document.getElementById("distance").textContent =
            distance + " km";


        document.getElementById("eta").textContent =
            eta + " min";


        // =====================================
        // UPDATE STATUS
        // =====================================

        const statusElement =
            document.querySelector(".green");

        if (statusElement) {
            statusElement.textContent = "ACTIVE";
        }


        // =====================================
        // FIT MAP TO ROUTE
        // =====================================

        map.fitBounds(
            routeLine.getBounds(),
            {
                padding: [30, 30]
            }
        );


        // =====================================
        // AMBULANCE ANIMATION
        // =====================================

        let currentIndex = 0;


        ambulanceAnimation =
            setInterval(() => {

                if (currentIndex >= coordinates.length) {

                    clearInterval(ambulanceAnimation);

                    ambulanceAnimation = null;

                    return;
                }


                ambulanceMarker.setLatLng(
                    coordinates[currentIndex]
                );


                currentIndex++;

            }, 300);


        // =====================================
        // SUCCESS
        // =====================================

        button.textContent =
            "✓ ROUTE CALCULATED";


        button.style.background =
            "#16a34a";


    } catch (error) {

        console.error(error);


        alert(
            "Location or route could not be found. " +
            "Try a more specific location."
        );


        button.textContent =
            "🚑 CALCULATE EMERGENCY ROUTE";


        button.style.background =
            "#dc2626";
    }


    // =====================================
    // ENABLE BUTTON AGAIN
    // =====================================

    setTimeout(() => {

        button.disabled = false;

    }, 1500);

}


// =====================================
// BUTTON EVENT
// =====================================

document
    .getElementById("routeBtn")
    .addEventListener(
        "click",
        calculateRoute
    );