/**
 * gmap object. global so clicker can access
 * @type {google.maps.Map}
 */
let map;

/**
 * map marker
 * @type {google.maps.Marker}
 */
let marker = null;

/**
 * street view panorama object. displayed in the street-view div
 * @type {google.maps.StreetViewPanorama}
 */
let panorama;

/**
 * Google Street View lookup service for checking panorama availability
 * @type {google.maps.StreetViewService}
 */
let svService;

/**
 * correct spawn location
 * @type {google.maps.LatLng|null}
 */
let spawnLocation = null;

/**
 * remaining time in seconds
 * @type {number}
 */
let timeLeft = 120; // 2 minutes

/**
 * timer interval reference
 * @type {number|null}
 */
let timerInterval = null;



//**UCI Bounding Coordinates */
const UCI_BOUNDARY = [
    { lat: 33.649915, lng: -117.854738 }, // Campus Dr & Stanford
    { lat: 33.652910, lng: -117.844074 }, // Campus Dr & Bridge
    { lat: 33.654647, lng: -117.841040 }, // University Dr Curve
    { lat: 33.650526, lng: -117.836266 }, // California Ave Entrance
    { lat: 33.643189, lng: -117.844353 }, // East Peltason & Los Trancos
    { lat: 33.644944, lng: -117.853280 }  // Michael Drake Drive Loop
];

/** Returns random coords inside UCI_BOUNDARY */
function getRandomUciCoordinate() {
    const polygon = new google.maps.Polygon({ paths: UCI_BOUNDARY });

    const minLat = 33.641;
    const maxLat = 33.656;
    const minLng = -117.857;
    const maxLng = -117.833;

    for (let i = 0; i < 80; i++) {
        const lat = minLat + Math.random() * (maxLat - minLat);
        const lng = minLng + Math.random() * (maxLng - minLng);
        const point = new google.maps.LatLng(lat, lng);

        if (google.maps.geometry.poly.containsLocation(point, polygon)) {
            return point;
        }
    }

    console.warn("Polygon randomization failed, returning fallback.");
    return new google.maps.LatLng(33.646, -117.841);
}

/**
 * asks if street view is available at given coords
 * @param {google.maps.LatLng} latLng 
 * @returns {Promise<google.maps.LatLng|null>} returns panorama location or null
 */
function getValidStreetViewLocation(latLng) {
    return new Promise((resolve) => {
        svService.getPanorama(
            { location: latLng, radius: 50 },
            (data, status) => {
                if (status === google.maps.StreetViewStatus.OK) {
                    resolve(data.location.latLng);
                } else {
                    resolve(null);
                }
            }
        );
    });
}

/**
 * tries multiple times to find a random street view location
 */
async function spawnRandomStreetView() {
    for (let i = 0; i < 25; i++) {
        const candidate = getRandomUciCoordinate();
        const validLocation = await getValidStreetViewLocation(candidate);

        if (validLocation) {
            spawnLocation = validLocation;

            console.log("Spawned at:", validLocation.toString());
            panorama.setPosition(validLocation);
            startTimer();
            return;
        }
    }

    console.warn("No street view inside bounds, using fallback.");

    const fallback = new google.maps.LatLng(33.646, -117.841);
    panorama.setPosition(fallback);


    spawnLocation = fallback;
}

function calculateScore() {
    if (!marker || !spawnLocation) return 0;

    const clicked = marker.getPosition();
    const distance = google.maps.geometry.spherical.computeDistanceBetween(clicked, spawnLocation) / 1000;

    const size = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(33.64141191981308, -117.84915619540708), new google.maps.LatLng(33.65480941557804, -117.83530280301413))
    const score = 5000 * Math.exp(-10 * (distance / size));
    return Math.round(score);
}

function startTimer() {
    // prevent multiple intervals
    if (timerInterval !== null) {
        clearInterval(timerInterval);
    }

    // set initial display
    const minutes = Math.floor(timeLeft / 60);
    const seconds = (timeLeft % 60).toString().padStart(2, "0");
    document.getElementById("timer").textContent = `${minutes}:${seconds}`;

    timerInterval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = (timeLeft % 60).toString().padStart(2, "0");
        document.getElementById("timer").textContent = `${minutes}:${seconds}`;

        if (timeLeft <= 0) {
            // ensure timer is cleared once
            clearInterval(timerInterval);
            timerInterval = null;
            endRound(); // auto-lock last guess
        }
    }, 1000);
}

//** Initializes the game map and street view */
function initGameMap() {

    const uciCenter = { lat: 33.646, lng: -117.841 }; 
    
    const noLandmarksStyle = [
        {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
        },
        {
            featureType: "transit",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
        }
    ];

    // create new map object and assign to global 'map' variable
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 15,
        center: uciCenter,
        styles: noLandmarksStyle,
        
        // disable map control
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        
        // ensure map is visible and properly sized
        disableDefaultUI: false,
        clickableIcons: false,
        gestureHandling: 'greedy',
    });

    // click listener
    map.addListener("click", (event) => {
        
        // get coords from click
        const clickedLatLng = event.latLng;

        // place marker
        if (marker === null) {
            // create marker
            marker = new google.maps.Marker({
                position: clickedLatLng,
                map: map
            });
        } else {
            // move marker
            marker.setPosition(clickedLatLng);
        }
    });

    // Street View Panorama
    const heading = Math.random() * 360
    panorama = new google.maps.StreetViewPanorama(
    document.getElementById("street-view"),
    {
        pov: { heading: heading, pitch: 0 }, // random camera rotation between 0-360 degrees
        zoom: 1,

        linksControl: false,        // removes arrows to move
        panControl: false,          // removes panning UI
        enableCloseButton: false,
        addressControl: false,
        fullscreenControl: false,
        motionTracking: false,
        motionTrackingControl: false,
        clickToGo: false,           // disables clicking to teleport
        disableDefaultUI: true,
        showRoadLabels: false,
        scrollwheel: true,
        zoomControl: true,
    }
    );

    // Lock Camera Orientation
    panorama.addListener('pov_changed', () => {
        panorama.setPov({ heading: heading, pitch: 0 });
    });

    // Connect the map with the panorama
    map.setStreetView(panorama);

    svService = new google.maps.StreetViewService();

    // Spawn player at random valid Street View location
    spawnRandomStreetView();

    document.getElementById("submit-guess").addEventListener("click", endRound);
}

function endRound() {
    // If we've already ended the round, do nothing
    const submitBtn = document.getElementById("submit-guess");
    if (submitBtn && submitBtn.disabled) return;

    // stop timer if running
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    const score = calculateScore();

    // disable further interactions on map
    map.setOptions({ draggable: false, zoomControl: false, scrollwheel: false, gestureHandling: 'none' });

    // disable submit to prevent multiple calculations
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Guess Submitted";
    }

    // optionally show distance on UI if available
    if (marker && spawnLocation) {
        const clicked = marker.getPosition();
        const distanceMeters = Math.round(google.maps.geometry.spherical.computeDistanceBetween(clicked, spawnLocation));
        document.getElementById("coords-display").textContent = `Distance: ${distanceMeters} m`;
    }

    alert(`Your Score: ${score}\nThank you for playing!`);
}
