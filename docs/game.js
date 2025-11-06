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
 * returns a random lat/lng inside UCI bounding zone
 */
function getRandomUciCoordinate() {
    const lat = 33.640 + Math.random() * 0.020; // ~2km box
    const lng = -117.855 + Math.random() * 0.030;
    return new google.maps.LatLng(lat, lng);
}

/**
 * tries multiple times to find a random street view location
 */
async function spawnRandomStreetView() {
    for (let i = 0; i < 15; i++) {
        const candidate = getRandomUciCoordinate();
        const validLocation = await getValidStreetViewLocation(candidate);

        if (validLocation) {
            console.log("✅ Spawned at:", validLocation.toString());
            panorama.setPosition(validLocation);
            return;
        }
    }

    console.warn("⚠️ Could not find random Street View spot. Defaulting to center.");
    panorama.setPosition({ lat: 33.646, lng: -117.841 });
}


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
        
        // TO REMOVE
        const coordsDisplay = document.getElementById("coords-display");
        coordsDisplay.textContent = `Lat: ${clickedLatLng.lat()}, Lng: ${clickedLatLng.lng()}`;

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
    panorama = new google.maps.StreetViewPanorama(
        document.getElementById("street-view"),
        {
            pov: { heading: 34, pitch: 10 },
            visible: true,
            enableCloseButton: false,
            addressControl: false,
            fullscreenControl: false,
            motionTrackingControl: false,
            linksControl: true,
            panControl: false,
        }
    );

    // Connect the map with the panorama
    map.setStreetView(panorama);

    svService = new google.maps.StreetViewService();

    // ✅ Spawn player at random valid Street View location
    spawnRandomStreetView();
}
