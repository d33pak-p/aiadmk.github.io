// Initialize map
const map = new ol.Map({
    target: 'map-view',
    layers: [
        // new ol.layer.Tile({
        //     source: new ol.source.OSM(),
        // }),
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([77.1025, 28.7041]), // Centered on New Delhi
        zoom: 6,
    }),
    controls: [
        // Add your controls here if necessary, but don't add zoom, rotate, etc.
    ],
});

// Disable zoom, rotation, and attribution
map.removeControl(new ol.control.Zoom()); // Removes zoom control (+,-)
map.removeControl(new ol.control.Rotate()); // Removes rotation control
map.removeControl(new ol.control.Attribution()); // Removes attribution (copyright)

// Handle constituency filter change
const constituencyFilter = document.getElementById('constituency-filter');
const maleVolunteers = document.getElementById('male-volunteers');
const femaleVolunteers = document.getElementById('female-volunteers');
const totalVolunteers = document.getElementById('total-volunteers');

// Add custom logo to the map
const logoDiv = document.createElement('div');
logoDiv.id = 'map-logo';
logoDiv.innerHTML = '<img src="logo_admk.png" alt="AIADMK Logo">';
document.getElementById('map-view').appendChild(logoDiv);


// Adjust map size when window is resized to prevent scrolling
window.addEventListener('resize', function () {
    map.updateSize();
});

// Create a vector layer to display the GeoJSON
const geojsonLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
        url: 'data/assembly_constituency_with_volunteer.geojson', // Replace with your GeoJSON file path
        format: new ol.format.GeoJSON(),
    }),
    style: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'transparent' // No fill color
        }),
        stroke: new ol.style.Stroke({
            color: '#000', // Outline color
            width: 2
        }),
        text: new ol.style.Text({
            font: '12px sans-serif',
            text: '',
            fill: new ol.style.Fill({ color: '#000' }),
            stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
        })
    })
});

// Add the GeoJSON layer to the map
map.addLayer(geojsonLayer);

// Load the GeoJSON features and set the map view to the extent of the data
geojsonLayer.getSource().on('addfeature', function () {
    const features = geojsonLayer.getSource().getFeatures();
    const extent = ol.extent.createEmpty();

    // Expand the extent to include each feature
    features.forEach(function (feature) {
        ol.extent.extend(extent, feature.getGeometry().getExtent());
    });

    // Set the map view to the extent of the GeoJSON data
    map.getView().fit(extent, {
        size: map.getSize(),
        padding: [50, 50, 50, 50], // Add padding around the extent
        maxZoom: 12, // Optional: set the maximum zoom level
    });
});

// Define the color thresholds and colors
const lowColor = '#99d98c'; // Light Green for low values
const mediumColor = '#34a0a4'; // Teal for medium values
const highColor = '#1e6091'; // Dark Blue for high values

// Function to categorize the value into low, medium, or high
function getCategoryForValue(value, min, max) {
    const range = max - min;
    const lowThreshold = min + range / 3;   // Threshold for low
    const highThreshold = min + (2 * range) / 3; // Threshold for high

    if (value <= lowThreshold) {
        return lowColor; // Assign low color
    } else if (value <= highThreshold) {
        return mediumColor; // Assign medium color
    } else {
        return highColor; // Assign high color
    }
}

// Function to find the min and max total_count values across the features
function getMinMaxTotalCount(features) {
    let min = Infinity;
    let max = -Infinity;

    features.forEach(function (feature) {
        const totalCount = feature.get('total_count') || 0;
        min = Math.min(min, totalCount);
        max = Math.max(max, totalCount);
    });

    return { min, max };
}

// Create a style function to label the features with assembly_constituency_name and assembly_constituency_code
geojsonLayer.setStyle(function (feature) {
    const assemblyName = feature.get('assembly_constituency_name') || '';
    const assemblyCode = feature.get('assembly_constituency_code') || '';
    const totalCount = feature.get('total_count') || 0;

    // Get the min and max total_count values from all features (run this once before rendering)
    const { min, max } = getMinMaxTotalCount(geojsonLayer.getSource().getFeatures());

    // Get the color category based on the total_count value
    const color = getCategoryForValue(totalCount, min, max);

    // Define the label for the feature
    const label = assemblyName + ' ' + assemblyCode;

    return new ol.style.Style({
        // Fill color based on total_count category
        fill: new ol.style.Fill({
            color: color
        }),
        stroke: new ol.style.Stroke({
            color: '#000',  // Border color
            width: 2
        }),
        // Text label styling
        text: new ol.style.Text({
            font: '12px sans-serif',
            text: label,
            fill: new ol.style.Fill({ color: '#000' }),
            stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
        })
    });
});






// Function to populate the dropdown with constituency names from the vector layer
function populateDropdownFromLayer() {
    const features = geojsonLayer.getSource().getFeatures();

    // Clear existing options
    constituencyFilter.innerHTML = '<option value="">Select Constituency</option>';

    // Sort features by constituencyCode in ascending order
    features.sort(function (a, b) {
        const codeA = a.get('assembly_constituency_code');
        const codeB = b.get('assembly_constituency_code');

        // Compare constituency codes (assuming they are strings or numbers)
        if (codeA < codeB) return -1;
        if (codeA > codeB) return 1;
        return 0;
    });

    features.forEach(function (feature) {
        // Get the constituency name from the feature properties
        const constituencyName = feature.get('assembly_constituency_name');
        const constituencyCode = feature.get('assembly_constituency_code');

        // Create a new option element
        const option = document.createElement("option");
        option.value = constituencyCode;
        option.textContent = constituencyCode + ' ' + constituencyName;

        // Append the option to the dropdown
        constituencyFilter.appendChild(option);
    });
}

const populateVolunteerStats = () => {
    let constituency = constituencyFilter.value
    let total_male = 0;
    let total_female = 0;
    const features = geojsonLayer.getSource().getFeatures();
    features.forEach(function (feature) {
        const featureCode = feature.get('assembly_constituency_code');
        if (constituency) {
            constituency = parseInt(constituency);
            if (featureCode === constituency) {
                total_male += feature.get('male_count');
                total_female += feature.get('female_count');
            } else {
                total_male += 0;
                total_female += 0;
            }
        } else {
            total_male += feature.get('male_count');
            total_female += feature.get('female_count');
        }
    });
    total_volunteer_count = total_male + total_female;

    maleVolunteers.textContent = total_male;
    femaleVolunteers.textContent = total_female
    totalVolunteers.textContent = total_volunteer_count;
};


// Call populateDropdownFromLayer after the vector source has finished loading the features
geojsonLayer.getSource().on('change', function () {
    // Check if the source has finished loading the data
    if (geojsonLayer.getSource().getState() === 'ready') {
        console.log("Source Change Detected")
        // Call populateDropdown only once after the initial load
        populateDropdownFromLayer();
        populateVolunteerStats()
    }
});


// Function to filter and display only the selected constituency polygon and zoom to it
function filterConstituencyPolygon() {
    let selectedCode = constituencyFilter.value;
    console.log("Selected Constituency - ", selectedCode)

    // Convert selectedCode to an integer
    if (selectedCode !== "") {
        selectedCode = parseInt(selectedCode);
    }
    console.log("After Converting the Selected Constituency - ", selectedCode)

    // Hide the current geojsonLayer
    geojsonLayer.setVisible(false);

    // Create a new vector source for the filtered polygons
    const filteredSource = new ol.source.Vector();

    // Array to store the filtered features for later zoom calculation
    let filteredFeatures = [];

    // Filter the features based on the selected constituency code
    const features = geojsonLayer.getSource().getFeatures();
    features.forEach(function (feature) {
        const featureCode = feature.get('assembly_constituency_code');
        if (selectedCode === "" || featureCode === selectedCode) {
            // Add the feature to the filtered source if it matches the selected constituency
            filteredSource.addFeature(feature);
            filteredFeatures.push(feature); // Save the filtered feature
        }
    });

    // Create a new layer for the filtered constituency
    const filteredLayer = new ol.layer.Vector({
        source: filteredSource,
        style: new ol.style.Style({
            fill: new ol.style.Fill({
                color: 'rgba(255, 255, 255, 0.4)'  // Change to your desired style
            }),
            stroke: new ol.style.Stroke({
                color: 'rgba(0, 0, 0, 1)',  // Change to your desired style
                width: 1
            })
        })
    });

    // Add the filtered layer to the map
    map.addLayer(filteredLayer);

    // Zoom to the extent of the filtered features if any are selected
    if (filteredFeatures.length > 0) {
        const extent = ol.extent.createEmpty(); // Initialize an empty extent
        filteredFeatures.forEach(function (feature) {
            ol.extent.extend(extent, feature.getGeometry().getExtent()); // Extend the extent with each feature's geometry
        });

        // Zoom to the extent of the filtered area
        map.getView().fit(extent, { size: map.getSize(), padding: [50, 50, 50, 50] });

        // Get the name and code of the first filtered feature for display
        const firstFeature = filteredFeatures[0];
        const constituencyName = firstFeature.get('assembly_constituency_name');
        const constituencyCode = firstFeature.get('assembly_constituency_code');

        // Display the name and code on the page
        const infoDiv = document.getElementById('constituency-info');
        infoDiv.innerHTML = `Selected Constituency: ${constituencyCode} - ${constituencyName}`;
    } else {
        alert("No Values matched for filtering")
        geojsonLayer.setVisible(true);
        map.removeLayer(filteredLayer);
        // Clear the displayed information when no selection is made
        const infoDiv = document.getElementById('constituency-info');
        infoDiv.innerHTML = '';
    }

    // If the selection is cleared, show the original geojsonLayer and remove the filtered layer
    if (selectedCode === "") {
        geojsonLayer.setVisible(true);
        map.removeLayer(filteredLayer);

        // Clear the displayed information when no selection is made
        const infoDiv = document.getElementById('constituency-info');
        infoDiv.innerHTML = '';
    }
}



// Call filter function on change of dropdown selection
constituencyFilter.addEventListener('change', function () {
    filterConstituencyPolygon();
    populateVolunteerStats();
});

// Function to categorize the value into low, medium, or high
function getCategoryForValueFocus(value, min, max) {
    const range = max - min;
    const lowThreshold = min + range / 3; // Threshold for low
    const highThreshold = min + (2 * range) / 3; // Threshold for high

    if (value <= lowThreshold) {
        return 'low'; // Assign low category
    } else if (value <= highThreshold) {
        return 'medium'; // Assign medium category
    } else {
        return 'high'; // Assign high category
    }
}

// Function to filter and create a temporary highlight layer based on dynamic thresholds
function filterAndHighlightLayer(category) {
    const features = geojsonLayer.getSource().getFeatures();

    // Calculate dynamic thresholds based on the features
    const { min, max } = getMinMaxTotalCount(features);

    // Create a temporary vector source for highlighting
    const highlightSource = new ol.source.Vector();

    // Remove any previous highlight layer if it exists
    const existingHighlightLayer = map.getLayers().getArray().find(layer => layer.get('highlight'));
    if (existingHighlightLayer) {
        map.removeLayer(existingHighlightLayer);
    }
    // Display the name and code on the page
    const infoDiv = document.getElementById('constituency-info');
    infoDiv.innerHTML = '';
    // If no category is selected, return and do not add any highlight layer
    if (!category) return;

    // Filter features based on the selected category (low, medium, high)
    let matchingFeatureCount = 0;
    geojsonLayer.getSource().forEachFeature(function (feature) {
        const totalCount = feature.get('total_count'); // Assuming total_count is the property for filtering
        const categoryForFeature = getCategoryForValueFocus(totalCount, min, max);
        if (category === categoryForFeature) {
            highlightSource.addFeature(feature);
            matchingFeatureCount++;
        }
    });
    // Display the name and code on the page
    infoDiv.innerHTML = `Focus Area ${category}: ${matchingFeatureCount} Constituency`;
    // Create a highlight layer with cyan color for the selected category
    const highlightLayer = new ol.layer.Vector({
        source: highlightSource,
        style: new ol.style.Style({
            // fill: new ol.style.Fill({
            //     color: '#00FFFF' // Cyan color for highlighting
            // }),
            stroke: new ol.style.Stroke({
                color: '#00FFFF', // Black border for better visibility
                width: 2
            })
        }),
        'highlight': true // Mark this layer as a highlight layer
    });

    // Add the highlight layer to the map
    map.addLayer(highlightLayer);
}

const focusOption = document.getElementById('focusOption');

focusOption.addEventListener('change', function () {
    let category = focusOption.value;
    console.log("Focus Area - ", category)
    filterAndHighlightLayer(category);
});