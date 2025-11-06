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


function initMap() {
    
    const uciCenter = { lat: 33.646, lng: -117.841 }; 
    
    const noLandmarksStyle = [
        {
            featureType: "poi",
            elementType: "labels",
            stylers: [
                { visibility: "off" }
            ]
        },
        {
            featureType: "transit",
            elementType: "labels",
            stylers: [
                { visibility: "off" }
            ]
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
}