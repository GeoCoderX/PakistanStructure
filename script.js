// Application state
let map;
let geoJsonLayer;
let bridgeChart;
let culvertChart;
let allDistricts = [];
let allData = null;

// Condition colors (Neon theme compatible)
const conditionColors = {
    "EXCELLENT": "#00ff88",  // Neon Green
    "GOOD": "#00ffcc",       // Neon Cyan
    "FAIR": "#ffff00",       // Neon Yellow
    "POOR": "#ff0055"        // Neon Red
};

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

async function initializeDashboard() {
    console.log("🚀 Initializing Dashboard...");
    
    try {
        // Initialize components
        initializeMap();
        initializeCharts();
        
        // Load the GeoJSON data
        await loadGeoJSONData();
        
        // Update UI elements
        updateFilterValues();
        
        // Setup event listeners
        setupEventListeners();
        
        // Hide loading spinner
        setTimeout(() => {
            document.getElementById('loadingSpinner').style.display = 'none';
        }, 1000);
        
    } catch (error) {
        console.error("❌ Dashboard initialization failed:", error);
        document.getElementById('dataStatus').innerHTML = 
            '<i class="fas fa-exclamation-triangle text-danger"></i> Initialization failed: ' + error.message;
    }
}

function setupEventListeners() {
    // Filter event listeners
    document.getElementById('districtSelect').addEventListener('change', applyFilters);
    document.getElementById('typeSelect').addEventListener('change', applyFilters);
    document.getElementById('conditionSelect').addEventListener('change', applyFilters);
    
    // Range slider listeners
    document.getElementById('lengthRange').addEventListener('input', function() {
        document.getElementById('lengthValue').textContent = `0-${this.value}`;
        applyFilters();
    });
    
    document.getElementById('widthRange').addEventListener('input', function() {
        document.getElementById('widthValue').textContent = `0-${this.value}`;
        applyFilters();
    });
    
    document.getElementById('spanRange').addEventListener('input', function() {
        document.getElementById('spanValue').textContent = `0-${this.value}`;
        applyFilters();
    });
    
    // Button listeners
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    document.getElementById('reloadData').addEventListener('click', reloadData);
}

async function loadGeoJSONData() {
    try {
        document.getElementById('dataStatus').innerHTML = 
            '<i class="fas fa-spinner fa-spin"></i> Loading GeoJSON data...';
        
        console.log("📂 Attempting to load GeoJSON data...");
        
        let jsonData;
        
        try {
            // Try to load from the same directory
            const response = await fetch('BRIDGES.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            jsonData = await response.json();
            console.log("✅ Raw data loaded successfully");
            
        } catch (fetchError) {
            console.warn('⚠️ Could not fetch from file:', fetchError);
            
            // Create sample data based on YOUR exact structure
            jsonData = createSampleDataFromYourStructure();
            document.getElementById('dataStatus').innerHTML = 
                '<i class="fas fa-info-circle text-warning"></i> Using sample data';
        }
        
        // Debug: Log the raw data structure
        console.log("📊 Raw JSON data type:", typeof jsonData);
        console.log("📊 Raw JSON data:", jsonData);
        
        // Process the data based on its structure
        if (typeof jsonData === 'string') {
            // If it's a string, parse it
            try {
                jsonData = JSON.parse(jsonData);
            } catch (parseError) {
                console.error("❌ Failed to parse JSON string:", parseError);
                throw new Error("Invalid JSON format");
            }
        }
        
        // Handle different data structures
        if (Array.isArray(jsonData)) {
            // If it's an array
            if (jsonData.length > 0 && jsonData[0].type === "Feature") {
                allData = {
                    "type": "FeatureCollection",
                    "features": jsonData
                };
                console.log("✅ Converted array to FeatureCollection");
            } else {
                // Assume it's an array of features
                allData = {
                    "type": "FeatureCollection",
                    "features": jsonData.map((item, index) => ({
                        "type": "Feature",
                        "geometry": item.geometry || { "type": "Point", "coordinates": [0, 0] },
                        "properties": item.properties || item
                    }))
                };
                console.log("✅ Converted array to features");
            }
        } else if (jsonData.type === "FeatureCollection") {
            allData = jsonData;
            console.log("✅ Direct FeatureCollection");
        } else if (jsonData.type === "Feature") {
            allData = {
                "type": "FeatureCollection",
                "features": [jsonData]
            };
            console.log("✅ Converted single Feature to FeatureCollection");
        } else if (jsonData.features) {
            allData = jsonData;
            console.log("✅ Data has features array");
        } else {
            console.error("❌ Unknown data structure:", jsonData);
            throw new Error("Unknown data structure");
        }
        
        console.log(`📊 Final processed data: ${allData.features.length} features`);
        
        // Process the data
        processGeoJSONData(allData);
        
        // Apply initial filters
        applyFilters();
        
        // Update status
        document.getElementById('dataStatus').innerHTML = 
            `<i class="fas fa-check-circle text-success"></i> Loaded ${allData.features.length} features successfully`;
            
    } catch (error) {
        console.error('❌ Error in loadGeoJSONData:', error);
        document.getElementById('dataStatus').innerHTML = 
            `<i class="fas fa-exclamation-triangle text-danger"></i> Error: ${error.message}`;
        
        // Fallback to sample data
        const sampleData = createSampleDataFromYourStructure();
        allData = sampleData;
        processGeoJSONData(allData);
        applyFilters();
    }
}

function processGeoJSONData(geoData) {
    if (!geoData || !geoData.features || !Array.isArray(geoData.features)) {
        console.error('❌ Invalid GeoJSON structure:', geoData);
        document.getElementById('dataStatus').innerHTML = 
            '<i class="fas fa-exclamation-triangle text-danger"></i> Invalid GeoJSON structure';
        return;
    }
    
    console.log(`🔧 Processing ${geoData.features.length} features...`);
    
    // Debug: Check first few features
    for (let i = 0; i < Math.min(3, geoData.features.length); i++) {
        const feature = geoData.features[i];
        console.log(`🔍 Feature ${i}:`, feature);
        if (feature.properties) {
            console.log(`   Properties keys:`, Object.keys(feature.properties));
            console.log(`   DISTRICT:`, feature.properties.DISTRICT);
            console.log(`   Rating:`, feature.properties.Rating);
            console.log(`   MAIN_CONST:`, feature.properties.MAIN_CONST);
            console.log(`   PASSAGE_TY:`, feature.properties.PASSAGE_TY);
        }
    }
    
    // Extract all unique districts from the data
    allDistricts = [...new Set(geoData.features
        .filter(feature => feature.properties && feature.properties.DISTRICT)
        .map(feature => feature.properties.DISTRICT.trim()))];
    
    // Sort districts alphabetically
    allDistricts.sort();
    
    console.log(`📍 Found ${allDistricts.length} unique districts:`, allDistricts);
    
    // Populate district dropdown
    const districtSelect = document.getElementById('districtSelect');
    districtSelect.innerHTML = '<option value="all">All Districts</option>';
    
    allDistricts.forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        districtSelect.appendChild(option);
    });
    
    // Count bridges and culverts based on YOUR data
    let bridgeCount = 0;
    let culvertCount = 0;
    
    geoData.features.forEach(feature => {
        if (!feature.properties) return;
        
        const mainConst = (feature.properties.MAIN_CONST || '').toLowerCase();
        const passageType = (feature.properties.PASSAGE_TY || '').toLowerCase();
        
        // Bridge detection - based on YOUR data
        if (mainConst.includes('bridge') || 
            passageType.toLowerCase().includes('bridge') ||
            mainConst.includes('slab') ||
            mainConst.includes('truss') ||
            mainConst.includes('girder') ||
            (feature.properties.BRIDGEID && feature.properties.BRIDGEID.toLowerCase().includes('b'))) {
            bridgeCount++;
        }
        // Culvert detection - based on YOUR data
        else if (mainConst.includes('culvert') || 
                passageType.includes('culvert') ||
                mainConst.includes('box') ||
                mainConst.includes('pipe') ||
                mainConst.includes('arch') ||
                passageType.includes('irrigation') ||
                passageType.includes('drain') ||
                passageType.includes('channel') ||
                (feature.properties.BRIDGEID && feature.properties.BRIDGEID.toLowerCase().includes('c'))) {
            culvertCount++;
        }
        // If no clear type, default based on dimensions
        else {
            const length = feature.properties.TOTAL_LENG || 0;
            const width = feature.properties.TOTAL_WIDT || 0;
            
            // Smaller structures are more likely culverts
            if (length < 20 && width < 10) {
                culvertCount++;
            } else {
                bridgeCount++;
            }
        }
    });
    
    const otherCount = geoData.features.length - bridgeCount - culvertCount;
    
    console.log(`📊 Counts: ${bridgeCount} bridges, ${culvertCount} culverts, ${otherCount} others`);
    
    // Update status with actual counts
    document.getElementById('dataStatus').innerHTML = 
        `<i class="fas fa-database"></i> Loaded ${geoData.features.length} features ` +
        `(${bridgeCount} bridges, ${culvertCount} culverts)`;
}

function createSampleDataFromYourStructure() {
    // Create sample data that EXACTLY matches your GeoJSON structure
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [68.10930400000007, 24.290851900000064]
                },
                "properties": {
                    "OBJECTID": 1,
                    "BRIDGEID": "10B",
                    "ROUT_ID": "SJ_XLCK_HASK_044_INW_1_01_R1",
                    "ROADNAME": "LADIUN-CHACH JEHAN KHAN TO HAJI ABDUL SATTAR KEHER",
                    "ROADID": "",
                    "DISTRICT": "SUJAWAL",
                    "LATITUDE_N": 24.2908519,
                    "LONGITUDE_": 68.109304,
                    "MAIN_CONST": "CONT. RC SLAB BRIDGE",
                    "MATERIALTY": "BRICK MASONRY",
                    "MATERIAL_1": "BRICK MASONRY",
                    "MATERIAL_2": "BRICK MASONRY",
                    "MATERIAL_3": "REINFORCED CONCRETE",
                    "TOTAL_LENG": 7.3,
                    "TOTAL_WIDT": 5.7,
                    "CLEAR_HEIG": 3,
                    "FOOTPATHSH": 0,
                    "NUMBER_OF_": 2,
                    "MAX_CLEAR_": 2.7,
                    "SKEWNESS": "NO",
                    "SKEW_WIDTH": 0,
                    "SCOUR": "",
                    "NUMBER_OF1": 0,
                    "NUMBER_O_1": 0,
                    "PARAPET_HE": 1,
                    "PARAPET_LE": 14.6,
                    "NUMBER_O_2": "",
                    "NUMBER_O_3": 0,
                    "PASSAGE_TY": "IRRIGATION CHANNEL",
                    "SLOPE_PROT": "NONE",
                    "EROSION_PR": "NONE",
                    "DECKJOBDET": "NONE",
                    "DECKQTYMOD": 0,
                    "DECKPRIORI": "NONE",
                    "RCBEAMGRID": "NONE",
                    "RCBEAMGIRD": 0,
                    "RCBEAMGR_1": "NONE",
                    "ABUTMENTJO": "NONE",
                    "ABUTMENTQT": 0,
                    "ABUTMENTPR": "NONE",
                    "PIERJOBDET": "NONE",
                    "PIERQTYMOD": 0,
                    "PIERPRIORI": "NONE",
                    "WINGWALLJO": "NONE",
                    "WINGWALLQT": 0,
                    "WINGWALLPR": "NONE",
                    "SLOPEPROTE": "NONE",
                    "SLOPPROTEC": 0,
                    "SLOPEPRO_1": "NONE",
                    "PARAPETJOB": "NONE",
                    "PARAPETQTY": 0,
                    "PARAPETPRI": "NONE",
                    "SIDEWALKJO": "NONE",
                    "SIDEWALKQT": 0,
                    "SIDEWALKPR": "NONE",
                    "OTHERDAMAG": "NONE",
                    "OTHERDAM_1": 0,
                    "OTHERDAM_2": "NONE",
                    "RIVERCANAL": "",
                    "BRIDGENAME": "",
                    "ROADMAINTE": "",
                    "REGIONALGM": "",
                    "Rating": "EXCELLENT",
                    "RD_CODE": "S-SJ-L-00183",
                    "Link": "SJ_XLCK_HASK_044_INW_1_01_R1_10B"
                }
            },
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [67.0011, 24.8607]
                },
                "properties": {
                    "OBJECTID": 2,
                    "BRIDGEID": "20C",
                    "ROUT_ID": "KHI_XLCK_HASK_045_INW_1_01_R1",
                    "ROADNAME": "KARACHI BOX CULVERT",
                    "DISTRICT": "KARACHI",
                    "MAIN_CONST": "BOX CULVERT",
                    "PASSAGE_TY": "DRAINAGE CHANNEL",
                    "TOTAL_LENG": 15.0,
                    "TOTAL_WIDT": 8.5,
                    "MAX_CLEAR_": 4.2,
                    "Rating": "GOOD"
                }
            },
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [71.5249, 30.1575]
                },
                "properties": {
                    "OBJECTID": 3,
                    "BRIDGEID": "30B",
                    "ROUT_ID": "MUL_XLCK_HASK_046_INW_1_01_R1",
                    "ROADNAME": "MULTAN HIGHWAY BRIDGE",
                    "DISTRICT": "MULTAN",
                    "MAIN_CONST": "STEEL TRUSS BRIDGE",
                    "PASSAGE_TY": "RIVER CROSSING",
                    "TOTAL_LENG": 85.0,
                    "TOTAL_WIDT": 15.0,
                    "MAX_CLEAR_": 75.0,
                    "Rating": "FAIR"
                }
            },
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [74.3587, 31.5204]
                },
                "properties": {
                    "OBJECTID": 4,
                    "BRIDGEID": "40C",
                    "ROUT_ID": "LHR_XLCK_HASK_047_INW_1_01_R1",
                    "ROADNAME": "LAHORE PIPE CULVERT",
                    "DISTRICT": "LAHORE",
                    "MAIN_CONST": "PIPE CULVERT",
                    "PASSAGE_TY": "IRRIGATION",
                    "TOTAL_LENG": 8.0,
                    "TOTAL_WIDT": 6.0,
                    "MAX_CLEAR_": 3.5,
                    "Rating": "POOR"
                }
            }
        ]
    };
}

function initializeMap() {
    // Create map centered on Pakistan
    map = L.map('map').setView([30.3753, 69.3451], 6);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
    
    console.log("🗺️ Map initialized");
}

function initializeCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 20,
                    usePointStyle: true,
                    color: '#ffffff',
                    font: {
                        size: 12,
                        weight: '600'
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(17, 17, 26, 0.9)',
                titleColor: '#ffffff',
                bodyColor: '#a0a0c0',
                borderColor: '#00f3ff',
                borderWidth: 1,
                cornerRadius: 8,
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                        return `${label}: ${value} (${percentage}%)`;
                    }
                }
            }
        },
        animation: {
            animateScale: true,
            animateRotate: true,
            duration: 1000
        }
    };
    
    // Bridge chart
    const bridgeCtx = document.getElementById('bridgeChart').getContext('2d');
    bridgeChart = new Chart(bridgeCtx, {
        type: 'doughnut',
        data: {
            labels: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [
                    conditionColors.EXCELLENT,
                    conditionColors.GOOD,
                    conditionColors.FAIR,
                    conditionColors.POOR
                ],
                borderColor: '#11111a',
                borderWidth: 2,
                hoverOffset: 15
            }]
        },
        options: chartOptions
    });
    
    // Culvert chart
    const culvertCtx = document.getElementById('culvertChart').getContext('2d');
    culvertChart = new Chart(culvertCtx, {
        type: 'doughnut',
        data: {
            labels: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [
                    conditionColors.EXCELLENT,
                    conditionColors.GOOD,
                    conditionColors.FAIR,
                    conditionColors.POOR
                ],
                borderColor: '#11111a',
                borderWidth: 2,
                hoverOffset: 15
            }]
        },
        options: chartOptions
    });
    
    console.log("📈 Charts initialized");
}

function applyFilters() {
    if (!allData || !allData.features) {
        console.error("❌ No data available to filter");
        return;
    }
    
    console.log("🔍 Applying filters...");
    
    // Get filter values
    const selectedDistrict = document.getElementById('districtSelect').value;
    const selectedType = document.getElementById('typeSelect').value;
    const selectedCondition = document.getElementById('conditionSelect').value;
    const maxLength = parseFloat(document.getElementById('lengthRange').value);
    const maxWidth = parseFloat(document.getElementById('widthRange').value);
    const maxSpan = parseFloat(document.getElementById('spanRange').value);
    
    console.log(`Filters: District=${selectedDistrict}, Type=${selectedType}, Condition=${selectedCondition}`);
    console.log(`Ranges: Length=${maxLength}, Width=${maxWidth}, Span=${maxSpan}`);
    
    // Filter features based on YOUR exact data structure
    const filteredFeatures = allData.features.filter(feature => {
        const props = feature.properties;
        if (!props) {
            console.log("⚠️ Feature has no properties");
            return false;
        }
        
        // District filter
        const district = props.DISTRICT;
        if (selectedDistrict !== 'all' && district !== selectedDistrict) {
            return false;
        }
        
        // Type filter - based on YOUR data structure
        if (selectedType !== 'all') {
            const mainConst = (props.MAIN_CONST || '').toLowerCase();
            const passageType = (props.PASSAGE_TY || '').toLowerCase();
            const bridgeId = (props.BRIDGEID || '').toLowerCase();
            
            let isBridge = mainConst.includes('bridge') || 
                          passageType.includes('bridge') ||
                          bridgeId.includes('b') ||
                          mainConst.includes('slab') ||
                          mainConst.includes('truss') ||
                          mainConst.includes('girder');
            
            let isCulvert = mainConst.includes('culvert') || 
                           passageType.includes('culvert') ||
                           bridgeId.includes('c') ||
                           mainConst.includes('box') ||
                           mainConst.includes('pipe') ||
                           mainConst.includes('arch') ||
                           passageType.includes('irrigation') ||
                           passageType.includes('drain') ||
                           passageType.includes('channel');
            
            if (selectedType === 'bridge' && !isBridge) return false;
            if (selectedType === 'culvert' && !isCulvert) return false;
            if (selectedType === 'other' && (isBridge || isCulvert)) return false;
        }
        
        // Condition filter - using Rating field from YOUR data
        const condition = props.Rating;
        if (selectedCondition !== 'all' && condition !== selectedCondition) {
            return false;
        }
        
        // Length filter - using TOTAL_LENG from YOUR data
        const length = props.TOTAL_LENG;
        if (length && length > maxLength) {
            return false;
        }
        
        // Width filter - using TOTAL_WIDT from YOUR data
        const width = props.TOTAL_WIDT;
        if (width && width > maxWidth) {
            return false;
        }
        
        // Span filter - using MAX_CLEAR_ from YOUR data
        const span = props.MAX_CLEAR_;
        if (span && span > maxSpan) {
            return false;
        }
        
        return true;
    });
    
    console.log(`✅ Filtered to ${filteredFeatures.length} features`);
    
    // Update visualization
    updateMap(filteredFeatures);
    updateCharts(filteredFeatures);
    
    // Update global statistics
    updateGlobalStats(filteredFeatures);
}

function updateMap(features) {
    console.log(`🗺️ Updating map with ${features.length} features...`);
    
    // Clear existing layer
    if (geoJsonLayer) {
        map.removeLayer(geoJsonLayer);
    }
    
    if (features.length === 0) {
        console.log("⚠️ No features to display on map");
        return;
    }
    
    // Create new layer with filtered features
    geoJsonLayer = L.geoJSON(features, {
        pointToLayer: function(feature, latlng) {
            // Determine marker properties based on condition from YOUR data
            const condition = feature.properties ? feature.properties.Rating : 'UNKNOWN';
            const color = conditionColors[condition] || '#666688';
            const radius = feature.properties && (feature.properties.MAIN_CONST || '').toLowerCase().includes('culvert') ? 6 : 8;
            
            // Create marker
            return L.circleMarker(latlng, {
                radius: radius,
                fillColor: color,
                color: '#ffffff',
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.7
            });
        },
        onEachFeature: function(feature, layer) {
            // Create popup content from YOUR data
            const props = feature.properties || {};
            const popupContent = createPopupFromYourData(props);
            
            // Bind popup
            layer.bindPopup(popupContent, {
                maxWidth: 300
            });
            
            // Add hover effect
            layer.on('mouseover', function(e) {
                this.openPopup();
                this.setStyle({
                    fillOpacity: 0.9,
                    weight: 3
                });
            });
            
            layer.on('mouseout', function(e) {
                this.closePopup();
                this.setStyle({
                    fillOpacity: 0.7,
                    weight: 2
                });
            });
        }
    }).addTo(map);
    
    // Fit bounds to show all markers
    if (features.length > 0) {
        try {
            const bounds = geoJsonLayer.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50] });
            } else {
                // If bounds are invalid, check individual coordinates
                const validCoords = features.filter(f => 
                    f.geometry && 
                    f.geometry.coordinates && 
                    Array.isArray(f.geometry.coordinates) &&
                    f.geometry.coordinates.length >= 2
                );
                
                if (validCoords.length > 0) {
                    const coords = validCoords.map(f => f.geometry.coordinates);
                    const lats = coords.map(c => c[1]);
                    const lngs = coords.map(c => c[0]);
                    
                    const bounds = L.latLngBounds([
                        [Math.min(...lats), Math.min(...lngs)],
                        [Math.max(...lats), Math.max(...lngs)]
                    ]);
                    
                    map.fitBounds(bounds);
                }
            }
        } catch (e) {
            console.log("⚠️ Could not fit bounds:", e);
            // Set default view
            map.setView([30.3753, 69.3451], 6);
        }
    }
    
    console.log("✅ Map updated");
}

function createPopupFromYourData(props) {
    // Extract data from YOUR exact structure
    const name = props.ROADNAME || 'Unnamed Structure';
    const type = props.MAIN_CONST || 'Unknown Type';
    const district = props.DISTRICT || 'Unknown District';
    const condition = props.Rating || 'UNKNOWN';
    const length = props.TOTAL_LENG !== undefined ? `${props.TOTAL_LENG}m` : 'N/A';
    const width = props.TOTAL_WIDT !== undefined ? `${props.TOTAL_WIDT}m` : 'N/A';
    const span = props.MAX_CLEAR_ !== undefined ? `${props.MAX_CLEAR_}m` : 'N/A';
    const bridgeId = props.BRIDGEID || 'N/A';
    const passageType = props.PASSAGE_TY || 'N/A';
    
    // Determine structure type
    let structureType = 'Unknown';
    const mainConst = (props.MAIN_CONST || '').toLowerCase();
    const passage = (props.PASSAGE_TY || '').toLowerCase();
    
    if (mainConst.includes('bridge') || passage.includes('bridge')) {
        structureType = 'Bridge';
    } else if (mainConst.includes('culvert') || passage.includes('culvert') || 
              mainConst.includes('box') || mainConst.includes('pipe') || 
              mainConst.includes('arch')) {
        structureType = 'Culvert';
    }
    
    // Create HTML content
    return `
        <div style="min-width: 250px; background: #11111a; color: white; padding: 15px; border-radius: 8px; border: 1px solid #00f3ff;">
            <h6 style="margin-bottom: 10px; color: #00f3ff; border-bottom: 1px solid #00f3ff; padding-bottom: 5px;">
                ${name}
            </h6>
            <table style="width: 100%; font-size: 12px;">
                <tr>
                    <td style="padding: 3px 0; color: #a0a0c0;"><strong>ID:</strong></td>
                    <td style="padding: 3px 0;">${bridgeId}</td>
                </tr>
                <tr>
                    <td style="padding: 3px 0; color: #a0a0c0;"><strong>Type:</strong></td>
                    <td style="padding: 3px 0;">${structureType} (${type})</td>
                </tr>
                <tr>
                    <td style="padding: 3px 0; color: #a0a0c0;"><strong>District:</strong></td>
                    <td style="padding: 3px 0;">${district}</td>
                </tr>
                <tr>
                    <td style="padding: 3px 0; color: #a0a0c0;"><strong>Condition:</strong></td>
                    <td style="padding: 3px 0; color: ${conditionColors[condition] || '#ffffff'}">
                        <strong>${condition}</strong>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 3px 0; color: #a0a0c0;"><strong>Passage:</strong></td>
                    <td style="padding: 3px 0;">${passageType}</td>
                </tr>
                <tr>
                    <td style="padding: 3px 0; color: #a0a0c0;"><strong>Dimensions:</strong></td>
                    <td style="padding: 3px 0;">L: ${length}, W: ${width}, S: ${span}</td>
                </tr>
            </table>
        </div>
    `;
}

function updateCharts(features) {
    console.log(`📊 Updating charts with ${features.length} features...`);
    
    // Separate bridges and culverts based on YOUR data
    const bridges = features.filter(f => {
        const props = f.properties;
        if (!props) return false;
        
        const mainConst = (props.MAIN_CONST || '').toLowerCase();
        const passageType = (props.PASSAGE_TY || '').toLowerCase();
        const bridgeId = (props.BRIDGEID || '').toLowerCase();
        
        return mainConst.includes('bridge') || 
               passageType.includes('bridge') ||
               bridgeId.includes('b') ||
               mainConst.includes('slab') ||
               mainConst.includes('truss') ||
               mainConst.includes('girder');
    });
    
    const culverts = features.filter(f => {
        const props = f.properties;
        if (!props) return false;
        
        const mainConst = (props.MAIN_CONST || '').toLowerCase();
        const passageType = (props.PASSAGE_TY || '').toLowerCase();
        const bridgeId = (props.BRIDGEID || '').toLowerCase();
        
        return mainConst.includes('culvert') || 
               passageType.includes('culvert') ||
               bridgeId.includes('c') ||
               mainConst.includes('box') ||
               mainConst.includes('pipe') ||
               mainConst.includes('arch') ||
               passageType.includes('irrigation') ||
               passageType.includes('drain') ||
               passageType.includes('channel');
    });
    
    console.log(`📊 Charts: ${bridges.length} bridges, ${culverts.length} culverts`);
    
    // Update bridge statistics
    updateStatistics('bridge', bridges);
    updateChartData(bridgeChart, bridges);
    
    // Update culvert statistics
    updateStatistics('culvert', culverts);
    updateChartData(culvertChart, culverts);
}

function updateStatistics(type, features) {
    const conditions = {
        EXCELLENT: 0,
        GOOD: 0,
        FAIR: 0,
        POOR: 0
    };
    
    features.forEach(feature => {
        const condition = feature.properties ? feature.properties.Rating : null;
        if (condition && conditions.hasOwnProperty(condition)) {
            conditions[condition]++;
        }
    });
    
    // Update DOM elements
    document.getElementById(`${type}Excellent`).textContent = conditions.EXCELLENT;
    document.getElementById(`${type}Good`).textContent = conditions.GOOD;
    document.getElementById(`${type}Fair`).textContent = conditions.FAIR;
    document.getElementById(`${type}Poor`).textContent = conditions.POOR;
    
    // Update total count
    const totalElement = document.getElementById(`total${type.charAt(0).toUpperCase() + type.slice(1)}s`);
    if (totalElement) {
        totalElement.textContent = features.length;
    }
    
    console.log(`📈 ${type} conditions:`, conditions);
}

function updateChartData(chart, features) {
    const conditions = {
        EXCELLENT: 0,
        GOOD: 0,
        FAIR: 0,
        POOR: 0
    };
    
    features.forEach(feature => {
        const condition = feature.properties ? feature.properties.Rating : null;
        if (condition && conditions.hasOwnProperty(condition)) {
            conditions[condition]++;
        }
    });
    
    // Update chart data
    chart.data.datasets[0].data = [
        conditions.EXCELLENT,
        conditions.GOOD,
        conditions.FAIR,
        conditions.POOR
    ];
    
    chart.update();
}

function updateGlobalStats(features) {
    if (!features || features.length === 0) {
        document.getElementById('totalFeatures').textContent = '0';
        document.getElementById('avgLength').textContent = '0.0';
        document.getElementById('avgWidth').textContent = '0.0';
        document.getElementById('avgSpan').textContent = '0.0';
        return;
    }
    
    // Calculate averages from YOUR data
    const lengths = features.map(f => f.properties?.TOTAL_LENG).filter(l => l && !isNaN(l));
    const widths = features.map(f => f.properties?.TOTAL_WIDT).filter(w => w && !isNaN(w));
    const spans = features.map(f => f.properties?.MAX_CLEAR_).filter(s => s && !isNaN(s));
    
    const avgLength = lengths.length > 0 ? 
        (lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1) : '0.0';
    const avgWidth = widths.length > 0 ? 
        (widths.reduce((a, b) => a + b, 0) / widths.length).toFixed(1) : '0.0';
    const avgSpan = spans.length > 0 ? 
        (spans.reduce((a, b) => a + b, 0) / spans.length).toFixed(1) : '0.0';
    
    // Update footer stats
    document.getElementById('totalFeatures').textContent = features.length;
    document.getElementById('avgLength').textContent = avgLength;
    document.getElementById('avgWidth').textContent = avgWidth;
    document.getElementById('avgSpan').textContent = avgSpan;
}

function updateFilterValues() {
    const lengthValue = document.getElementById('lengthRange').value;
    const widthValue = document.getElementById('widthRange').value;
    const spanValue = document.getElementById('spanRange').value;
    
    document.getElementById('lengthValue').textContent = `0-${lengthValue}`;
    document.getElementById('widthValue').textContent = `0-${widthValue}`;
    document.getElementById('spanValue').textContent = `0-${spanValue}`;
}

function resetFilters() {
    console.log("🔄 Resetting filters...");
    
    document.getElementById('districtSelect').value = 'all';
    document.getElementById('typeSelect').value = 'all';
    document.getElementById('conditionSelect').value = 'all';
    document.getElementById('lengthRange').value = 100;
    document.getElementById('widthRange').value = 20;
    document.getElementById('spanRange').value = 50;
    
    updateFilterValues();
    applyFilters();
    
    // Visual feedback
    const resetBtn = document.getElementById('resetFilters');
    const originalHtml = resetBtn.innerHTML;
    resetBtn.innerHTML = '<i class="fas fa-check"></i> Reset Complete!';
    resetBtn.classList.add('btn-success');
    
    setTimeout(() => {
        resetBtn.innerHTML = originalHtml;
        resetBtn.classList.remove('btn-success');
    }, 2000);
}

async function reloadData() {
    console.log("🔄 Reloading data...");
    
    // Show loading state
    const reloadBtn = document.getElementById('reloadData');
    const originalHtml = reloadBtn.innerHTML;
    reloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    reloadBtn.disabled = true;
    
    // Show loading spinner
    document.getElementById('loadingSpinner').style.display = 'flex';
    
    try {
        await loadGeoJSONData();
        console.log("✅ Data reloaded successfully");
    } catch (error) {
        console.error("❌ Failed to reload data:", error);
    } finally {
        // Restore button state
        setTimeout(() => {
            reloadBtn.innerHTML = originalHtml;
            reloadBtn.disabled = false;
            document.getElementById('loadingSpinner').style.display = 'none';
        }, 500);
    }
}

// Debug function to check data structure
function debugData() {
    console.log("=== DEBUG DATA STRUCTURE ===");
    console.log("allData type:", typeof allData);
    console.log("allData:", allData);
    
    if (allData && allData.features) {
        console.log("Number of features:", allData.features.length);
        
        if (allData.features.length > 0) {
            const firstFeature = allData.features[0];
            console.log("First feature:", firstFeature);
            
            if (firstFeature.properties) {
                console.log("First feature properties keys:", Object.keys(firstFeature.properties));
                console.log("DISTRICT:", firstFeature.properties.DISTRICT);
                console.log("Rating:", firstFeature.properties.Rating);
                console.log("MAIN_CONST:", firstFeature.properties.MAIN_CONST);
                console.log("PASSAGE_TY:", firstFeature.properties.PASSAGE_TY);
                console.log("TOTAL_LENG:", firstFeature.properties.TOTAL_LENG);
                console.log("TOTAL_WIDT:", firstFeature.properties.TOTAL_WIDT);
                console.log("MAX_CLEAR_:", firstFeature.properties.MAX_CLEAR_);
            }
        }
    }
    
    console.log("=== END DEBUG ===");
}

// Export for global access
window.debugData = debugData;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;

console.log("✅ dashboard.js loaded successfully");