// Application State
let map;
let geoJsonLayer;
let bridgeChart;
let culvertChart;
let allDistricts = [];
let allData = null;
let bridgesData = [];
let culvertsData = [];

// Condition Colors
const conditionColors = {
    "EXCELLENT": "#3aa6a6",  // muted teal for positive
    "GOOD": "#4a90e2",       // calm blue for good
    "FAIR": "#d1d5db",       // soft gray for neutral/fair
    "POOR": "#e57373"        // muted red for poor
};


// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

async function initializeDashboard() {
    console.log("🚀 Initializing Dashboard...");
    
    try {
        initializeMap();
        initializeCharts();
        setupEventListeners();
        
        // Load both datasets using AJAX
        await loadAllData();
        
        // Hide loading spinner
        setTimeout(() => {
            document.getElementById('loadingSpinner').style.display = 'none';
        }, 1000);
        
    } catch (error) {
        console.error("❌ Initialization failed:", error);
        document.getElementById('dataStatus').innerHTML = 
            '<i class="fas fa-exclamation-triangle"></i> ' + error.message;
    }
}

// AJAX Function to Load Data
async function loadAllData() {
    try {
        document.getElementById('dataStatus').innerHTML = 
            '<i class="fas fa-spinner fa-spin"></i> Loading data...';
        
        // Load bridges data
        const bridgesPromise = loadBridgesData();
        
        // Load culverts data  
        const culvertsPromise = loadCulvertsData();
        
        // Wait for both to complete
        await Promise.all([bridgesPromise, culvertsPromise]);
        
        console.log(`📊 Loaded: ${bridgesData.length} bridges, ${culvertsData.length} culverts`);
        
        // Merge and process
        mergeAndProcessData();
        
        // Update status
        document.getElementById('dataStatus').innerHTML = 
            `<i class="fas fa-check-circle"></i> Loaded ${bridgesData.length + culvertsData.length} structures`;
            
    } catch (error) {
        console.error("❌ Error loading data:", error);
        document.getElementById('dataStatus').innerHTML = 
            `<i class="fas fa-exclamation-triangle"></i> ${error.message}`;
        
        // Load sample data as fallback
        loadSampleData();
    }
}

// Load Bridges Data
async function loadBridgesData() {
    try {
        console.log("📥 Loading bridges data...");
        
        const response = await fetch('BRIDGES.json');
        
        if (!response.ok) {
            throw new Error(`Bridges data not found (HTTP ${response.status})`);
        }
        
        let data = await response.json();
        
        // Check data structure
        console.log("Bridges data structure:", data);
        
        // Process based on structure
        if (Array.isArray(data)) {
            // If data is array of features
            bridgesData = data.map(item => {
                // Check if item has geometry
                if (item.geometry) {
                    return {
                        type: "Feature",
                        geometry: item.geometry,
                        properties: {
                            ...item.properties || item,
                            dataType: 'bridge',
                            source: 'bridges'
                        }
                    };
                } else {
                    // Create point geometry from coordinates
                    return {
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [
                                parseFloat(item.LONGITUDE_) || parseFloat(item.LONGITUDE) || 0,
                                parseFloat(item.LATITUDE_N) || parseFloat(item.LATITUDE) || 0
                            ]
                        },
                        properties: {
                            ...item,
                            dataType: 'bridge',
                            source: 'bridges',
                            // Normalize field names
                            DISTRICT: item.DISTRICT || '',
                            Rating: item.Rating || item.rating || 'UNKNOWN',
                            TOTAL_LENG: parseFloat(item.TOTAL_LENG) || 0,
                            TOTAL_WIDT: parseFloat(item.TOTAL_WIDT) || 0,
                            MAX_CLEAR_: parseFloat(item.MAX_CLEAR_) || 0,
                            MAIN_CONST: item.MAIN_CONST || '',
                            ROADNAME: item.ROADNAME || '',
                            BRIDGEID: item.BRIDGEID || ''
                        }
                    };
                }
            });
        } else if (data.type === "FeatureCollection") {
            // If FeatureCollection
            bridgesData = data.features.map(feature => ({
                type: "Feature",
                geometry: feature.geometry,
                properties: {
                    ...feature.properties,
                    dataType: 'bridge',
                    source: 'bridges'
                }
            }));
        } else {
            // Try to extract features
            bridgesData = extractFeaturesFromObject(data, 'bridge');
        }
        
        console.log(`✅ Loaded ${bridgesData.length} bridges`);
        
    } catch (error) {
        console.error("❌ Error loading bridges data:", error);
        bridgesData = [];
        throw error;
    }
}

// Load Culverts Data
async function loadCulvertsData() {
    try {
        console.log("📥 Loading culverts data...");
        
        const response = await fetch('CULVERTS.json');
        
        if (!response.ok) {
            throw new Error(`Culverts data not found (HTTP ${response.status})`);
        }
        
        let data = await response.json();
        
        // Check data structure
        console.log("Culverts data structure:", data);
        
        // Process based on structure
        if (Array.isArray(data)) {
            // If data is array of features
            culvertsData = data.map(item => {
                // Check if item has geometry
                if (item.geometry) {
                    return {
                        type: "Feature",
                        geometry: item.geometry,
                        properties: {
                            ...item.properties || item,
                            dataType: 'culvert',
                            source: 'culverts'
                        }
                    };
                } else {
                    // Create point geometry from coordinates
                    return {
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [
                                parseFloat(item.LONGITUDE) || parseFloat(item.LONGITUDE_) || 0,
                                parseFloat(item.LATITUDE) || parseFloat(item.LATITUDE_N) || 0
                            ]
                        },
                        properties: {
                            ...item,
                            dataType: 'culvert',
                            source: 'culverts',
                            // Normalize field names
                            DISTRICT: item.DISTRICT || '',
                            Rating: item.Rating || item.rating || 'UNKNOWN',
                            TOTAL_LENG: parseFloat(item.MAX_CLEAR_) || parseFloat(item.TOTAL_LENG) || 0,
                            TOTAL_WIDT: parseFloat(item.CLEARROADW) || parseFloat(item.TOTAL_WIDT) || 0,
                            MAX_CLEAR_: parseFloat(item.CULVERTLEN) || parseFloat(item.MAX_CLEAR_) || 0,
                            MAIN_CONST: item.MAINCONSTR || item.MAIN_CONST || '',
                            ROADNAME: item.ROADNAME || '',
                            BRIDGEID: item.CULVERET_I || item.BRIDGEID || ''
                        }
                    };
                }
            });
        } else if (data.type === "FeatureCollection") {
            // If FeatureCollection
            culvertsData = data.features.map(feature => ({
                type: "Feature",
                geometry: feature.geometry,
                properties: {
                    ...feature.properties,
                    dataType: 'culvert',
                    source: 'culverts'
                }
            }));
        } else {
            // Try to extract features
            culvertsData = extractFeaturesFromObject(data, 'culvert');
        }
        
        console.log(`✅ Loaded ${culvertsData.length} culverts`);
        
    } catch (error) {
        console.error("❌ Error loading culverts data:", error);
        culvertsData = [];
        throw error;
    }
}

// Extract Features from Object
function extractFeaturesFromObject(obj, dataType) {
    const features = [];
    
    // Try to find features array in different possible locations
    if (obj.features && Array.isArray(obj.features)) {
        return obj.features.map(feature => ({
            type: "Feature",
            geometry: feature.geometry,
            properties: {
                ...feature.properties,
                dataType: dataType,
                source: dataType
            }
        }));
    }
    
    // If object itself might be a feature
    if (obj.geometry) {
        features.push({
            type: "Feature",
            geometry: obj.geometry,
            properties: {
                ...obj.properties || obj,
                dataType: dataType,
                source: dataType
            }
        });
    }
    
    return features;
}

// Merge and Process All Data
function mergeAndProcessData() {
    // Combine both datasets
    const combinedFeatures = [...bridgesData, ...culvertsData];
    
    allData = {
        "type": "FeatureCollection",
        "features": combinedFeatures
    };
    
    console.log(`📊 Total features: ${combinedFeatures.length}`);
    console.log("Sample bridge feature:", bridgesData[0]);
    console.log("Sample culvert feature:", culvertsData[0]);
    
    // Extract all unique districts
    allDistricts = [...new Set(combinedFeatures
        .filter(feature => {
            const district = feature.properties?.DISTRICT;
            return district && district !== 'undefined' && district !== '' && district !== 'null';
        })
        .map(feature => {
            const district = feature.properties.DISTRICT;
            return district.toString().trim().toUpperCase();
        })
    )];
    
    allDistricts.sort();
    
    // Populate district dropdown
    const districtSelect = document.getElementById('districtSelect');
    districtSelect.innerHTML = '<option value="all">All Districts</option>';
    
    allDistricts.forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        districtSelect.appendChild(option);
    });
    
    // Calculate and set range maximums based on actual data
    calculateDataRanges();
    
    // Immediately update counts
    updateCounts();
    
    // Apply initial filters
    applyFilters();
}

// Update Counts Immediately
function updateCounts() {
    // Update bridge counts
    document.getElementById('totalBridges').textContent = bridgesData.length;
    
    // Update culvert counts
    document.getElementById('totalCulverts').textContent = culvertsData.length;
    
    // Calculate condition breakdowns
    const bridgeConditions = { EXCELLENT: 0, GOOD: 0, FAIR: 0, POOR: 0 };
    const culvertConditions = { EXCELLENT: 0, GOOD: 0, FAIR: 0, POOR: 0 };
    
    bridgesData.forEach(feature => {
        const condition = feature.properties?.Rating?.toUpperCase();
        if (condition && bridgeConditions.hasOwnProperty(condition)) {
            bridgeConditions[condition]++;
        }
    });
    
    culvertsData.forEach(feature => {
        const condition = feature.properties?.Rating?.toUpperCase();
        if (condition && culvertConditions.hasOwnProperty(condition)) {
            culvertConditions[condition]++;
        }
    });
    
    // Update bridge condition counts
    document.getElementById('bridgeExcellent').textContent = bridgeConditions.EXCELLENT;
    document.getElementById('bridgeGood').textContent = bridgeConditions.GOOD;
    document.getElementById('bridgeFair').textContent = bridgeConditions.FAIR;
    document.getElementById('bridgePoor').textContent = bridgeConditions.POOR;
    
    // Update culvert condition counts
    document.getElementById('culvertExcellent').textContent = culvertConditions.EXCELLENT;
    document.getElementById('culvertGood').textContent = culvertConditions.GOOD;
    document.getElementById('culvertFair').textContent = culvertConditions.FAIR;
    document.getElementById('culvertPoor').textContent = culvertConditions.POOR;
    
    console.log("Bridge conditions:", bridgeConditions);
    console.log("Culvert conditions:", culvertConditions);
}

// Calculate Data Ranges for Sliders
function calculateDataRanges() {
    if ((!bridgesData || bridgesData.length === 0) && (!culvertsData || culvertsData.length === 0)) return;
    
    let maxLength = 0;
    let maxWidth = 0;
    let maxSpan = 0;
    
    // Check bridges
    bridgesData.forEach(feature => {
        const props = feature.properties;
        
        if (props.TOTAL_LENG && props.TOTAL_LENG > maxLength) {
            maxLength = Math.ceil(props.TOTAL_LENG);
        }
        if (props.TOTAL_WIDT && props.TOTAL_WIDT > maxWidth) {
            maxWidth = Math.ceil(props.TOTAL_WIDT);
        }
        if (props.MAX_CLEAR_ && props.MAX_CLEAR_ > maxSpan) {
            maxSpan = Math.ceil(props.MAX_CLEAR_);
        }
    });
    
    // Check culverts
    culvertsData.forEach(feature => {
        const props = feature.properties;
        
        const length = props.TOTAL_LENG || props.MAX_CLEAR_;
        if (length && length > maxLength) {
            maxLength = Math.ceil(length);
        }
        
        const width = props.TOTAL_WIDT || props.CLEARROADW;
        if (width && width > maxWidth) {
            maxWidth = Math.ceil(width);
        }
        
        const span = props.MAX_CLEAR_ || props.CULVERTLEN;
        if (span && span > maxSpan) {
            maxSpan = Math.ceil(span);
        }
    });
    
    // Add some padding
    maxLength = Math.max(100, maxLength + 10);
    maxWidth = Math.max(20, maxWidth + 5);
    maxSpan = Math.max(50, maxSpan + 10);
    
    // Update slider ranges
    const lengthSlider = document.getElementById('maxLengthRange');
    lengthSlider.max = maxLength;
    lengthSlider.value = maxLength;
    
    const widthSlider = document.getElementById('maxWidthRange');
    widthSlider.max = maxWidth;
    widthSlider.value = maxWidth;
    
    const spanSlider = document.getElementById('maxSpanRange');
    spanSlider.max = maxSpan;
    spanSlider.value = maxSpan;
    
    // Update display values
    updateRangeValues();
    
    console.log(`📏 Data ranges: Length=${maxLength}, Width=${maxWidth}, Span=${maxSpan}`);
}

// Load Sample Data (Fallback)
function loadSampleData() {
    console.log("📝 Loading sample data...");
    
    // Create sample bridges
    bridgesData = [
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [68.109304, 24.290852]
            },
            "properties": {
                "OBJECTID": 1,
                "BRIDGEID": "10B",
                "ROADNAME": "LADIUN-CHACH JEHAN KHAN TO HAJI ABDUL SATTAR KEHER",
                "DISTRICT": "SUJAWAL",
                "MAIN_CONST": "CONT. RC SLAB BRIDGE",
                "TOTAL_LENG": 7.3,
                "TOTAL_WIDT": 5.7,
                "MAX_CLEAR_": 2.7,
                "Rating": "EXCELLENT",
                "dataType": "bridge",
                "source": "bridges"
            }
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [71.5249, 30.1575]
            },
            "properties": {
                "OBJECTID": 2,
                "BRIDGEID": "20B",
                "ROADNAME": "MULTAN HIGHWAY BRIDGE",
                "DISTRICT": "MULTAN",
                "MAIN_CONST": "STEEL TRUSS BRIDGE",
                "TOTAL_LENG": 85.0,
                "TOTAL_WIDT": 15.0,
                "MAX_CLEAR_": 75.0,
                "Rating": "FAIR",
                "dataType": "bridge",
                "source": "bridges"
            }
        }
    ];
    
    // Create sample culverts
    culvertsData = [
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [67.0011, 24.8607]
            },
            "properties": {
                "OBJECTID": 3,
                "CULVERET_I": "30C",
                "ROADNAME": "KARACHI BOX CULVERT",
                "DISTRICT": "KARACHI",
                "MAINCONSTR": "BOX CULVERT",
                "MAX_CLEAR_": 15.0,
                "CLEARROADW": 8.5,
                "CULVERTLEN": 4.2,
                "Rating": "GOOD",
                "dataType": "culvert",
                "source": "culverts",
                "TOTAL_LENG": 15.0,
                "TOTAL_WIDT": 8.5
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
                "CULVERET_I": "40C",
                "ROADNAME": "LAHORE PIPE CULVERT",
                "DISTRICT": "LAHORE",
                "MAINCONSTR": "PIPE CULVERT",
                "MAX_CLEAR_": 8.0,
                "CLEARROADW": 6.0,
                "CULVERTLEN": 3.5,
                "Rating": "POOR",
                "dataType": "culvert",
                "source": "culverts",
                "TOTAL_LENG": 8.0,
                "TOTAL_WIDT": 6.0
            }
        }
    ];
    
    mergeAndProcessData();
}

// Initialize Map
function initializeMap() {
    map = L.map('map').setView([30.3753, 69.3451], 6);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    console.log("🗺️ Map initialized");
}

// Initialize Charts
function initializeCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 10,
                    usePointStyle: true,
                    color: '#ffffff',
                    font: { size: 10, weight: '600' }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(17, 17, 26, 0.9)',
                titleColor: '#ffffff',
                bodyColor: '#a0a0c0',
                borderColor: '#00f3ff',
                borderWidth: 1,
                cornerRadius: 6,
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
                borderWidth: 1,
                hoverOffset: 10
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
                borderWidth: 1,
                hoverOffset: 10
            }]
        },
        options: chartOptions
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Filter event listeners
    document.getElementById('districtSelect').addEventListener('change', applyFilters);
    document.getElementById('typeSelect').addEventListener('change', applyFilters);
    document.getElementById('conditionSelect').addEventListener('change', applyFilters);
    
    // Range slider listeners
    const rangeSliders = [
        'minLengthRange', 'maxLengthRange',
        'minWidthRange', 'maxWidthRange',
        'minSpanRange', 'maxSpanRange'
    ];
    
    rangeSliders.forEach(sliderId => {
        document.getElementById(sliderId).addEventListener('input', function() {
            updateRangeValues();
            applyFilters();
        });
    });
    
    // Button listeners
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    document.getElementById('reloadData').addEventListener('click', reloadData);
    document.getElementById('exportData').addEventListener('click', exportData);
    document.getElementById('debugBtn').addEventListener('click', debugData);
    document.getElementById('toggleView').addEventListener('click', toggleView);
}

// Update Range Display Values
function updateRangeValues() {
    document.getElementById('minLengthValue').textContent = document.getElementById('minLengthRange').value;
    document.getElementById('maxLengthValue').textContent = document.getElementById('maxLengthRange').value;
    
    document.getElementById('minWidthValue').textContent = document.getElementById('minWidthRange').value;
    document.getElementById('maxWidthValue').textContent = document.getElementById('maxWidthRange').value;
    
    document.getElementById('minSpanValue').textContent = document.getElementById('minSpanRange').value;
    document.getElementById('maxSpanValue').textContent = document.getElementById('maxSpanRange').value;
}

// Apply Filters
function applyFilters() {
    if ((!bridgesData || bridgesData.length === 0) && (!culvertsData || culvertsData.length === 0)) {
        console.error("❌ No data available to filter");
        return;
    }
    
    console.log("🔍 Applying filters...");
    
    // Get filter values
    const selectedDistrict = document.getElementById('districtSelect').value;
    const selectedType = document.getElementById('typeSelect').value;
    const selectedCondition = document.getElementById('conditionSelect').value;
    
    // Get range values
    const minLength = parseFloat(document.getElementById('minLengthRange').value);
    const maxLength = parseFloat(document.getElementById('maxLengthRange').value);
    const minWidth = parseFloat(document.getElementById('minWidthRange').value);
    const maxWidth = parseFloat(document.getElementById('maxWidthRange').value);
    const minSpan = parseFloat(document.getElementById('minSpanRange').value);
    const maxSpan = parseFloat(document.getElementById('maxSpanRange').value);
    
    console.log(`📏 Ranges: Length=${minLength}-${maxLength}, Width=${minWidth}-${maxWidth}, Span=${minSpan}-${maxSpan}`);
    
    // Filter bridges
    const filteredBridges = bridgesData.filter(feature => {
        const props = feature.properties;
        if (!props) return false;
        
        // District filter
        if (selectedDistrict !== 'all' && props.DISTRICT !== selectedDistrict) {
            return false;
        }
        
        // Type filter (should always be bridge for bridgesData)
        if (selectedType !== 'all' && selectedType !== 'bridge') {
            return false;
        }
        
        // Condition filter
        if (selectedCondition !== 'all' && props.Rating !== selectedCondition) {
            return false;
        }
        
        // Length filter
        const length = props.TOTAL_LENG;
        if (length !== undefined && length !== null) {
            if (length < minLength || length > maxLength) return false;
        }
        
        // Width filter
        const width = props.TOTAL_WIDT;
        if (width !== undefined && width !== null) {
            if (width < minWidth || width > maxWidth) return false;
        }
        
        // Span filter
        const span = props.MAX_CLEAR_;
        if (span !== undefined && span !== null) {
            if (span < minSpan || span > maxSpan) return false;
        }
        
        return true;
    });
    
    // Filter culverts
    const filteredCulverts = culvertsData.filter(feature => {
        const props = feature.properties;
        if (!props) return false;
        
        // District filter
        if (selectedDistrict !== 'all' && props.DISTRICT !== selectedDistrict) {
            return false;
        }
        
        // Type filter (should always be culvert for culvertsData)
        if (selectedType !== 'all' && selectedType !== 'culvert') {
            return false;
        }
        
        // Condition filter
        if (selectedCondition !== 'all' && props.Rating !== selectedCondition) {
            return false;
        }
        
        // Length filter
        const length = props.TOTAL_LENG || props.MAX_CLEAR_;
        if (length !== undefined && length !== null) {
            if (length < minLength || length > maxLength) return false;
        }
        
        // Width filter
        const width = props.TOTAL_WIDT || props.CLEARROADW;
        if (width !== undefined && width !== null) {
            if (width < minWidth || width > maxWidth) return false;
        }
        
        // Span filter
        const span = props.MAX_CLEAR_ || props.CULVERTLEN;
        if (span !== undefined && span !== null) {
            if (span < minSpan || span > maxSpan) return false;
        }
        
        return true;
    });
    
    // Combine filtered features
    const filteredFeatures = [...filteredBridges, ...filteredCulverts];
    
    console.log(`✅ Filtered to ${filteredFeatures.length} features (${filteredBridges.length} bridges, ${filteredCulverts.length} culverts)`);
    
    // Update visualizations
    updateMap(filteredFeatures);
    updateCharts(filteredBridges, filteredCulverts);
    updateGlobalStats(filteredFeatures);
}

// Update Map with Filtered Features
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
    
    // Create new layer
    geoJsonLayer = L.geoJSON(features, {
        pointToLayer: function(feature, latlng) {
            const condition = feature.properties.Rating || 'UNKNOWN';
            const color = conditionColors[condition] || '#666688';
            const radius = feature.properties.dataType === 'culvert' ? 6 : 8;
            
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
            const props = feature.properties;
            
            // Create popup content
            const popupContent = createPopupContent(props);
            
            // Bind popup
            layer.bindPopup(popupContent, {
                maxWidth: 300,
                className: 'neon-popup'
            });
            
            // Hover effects
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
            }
        } catch (e) {
            console.log("⚠️ Could not fit bounds:", e);
        }
    }
}

// Create Popup Content
function createPopupContent(props) {
    const name = props.ROADNAME || 'Unnamed Structure';
    const type = props.MAIN_CONST || props.MAINCONSTR || 'Unknown Type';
    const district = props.DISTRICT || 'Unknown District';
    const condition = props.Rating || 'UNKNOWN';
    const length = props.TOTAL_LENG !== undefined ? `${props.TOTAL_LENG.toFixed(1)}m` : 'N/A';
    const width = props.TOTAL_WIDT !== undefined ? `${props.TOTAL_WIDT.toFixed(1)}m` : 'N/A';
    const span = props.MAX_CLEAR_ !== undefined ? `${props.MAX_CLEAR_.toFixed(1)}m` : 'N/A';
    const id = props.BRIDGEID || props.CULVERET_I || 'N/A';
    const dataType = props.dataType || 'unknown';
    
    return `
        <div class="popup-content">
            <h6>${name}</h6>
            <table>
                <tr><td><strong>ID:</strong></td><td>${id}</td></tr>
                <tr><td><strong>Type:</strong></td><td>${dataType.toUpperCase()} (${type})</td></tr>
                <tr><td><strong>District:</strong></td><td>${district}</td></tr>
                <tr><td><strong>Condition:</strong></td>
                    <td style="color: ${conditionColors[condition] || '#ffffff'}">
                        <strong>${condition}</strong>
                    </td>
                </tr>
                <tr><td><strong>Dimensions:</strong></td>
                    <td>L: ${length}, W: ${width}, S: ${span}</td>
                </tr>
            </table>
        </div>
    `;
}

// Update Charts
function updateCharts(filteredBridges, filteredCulverts) {
    updateStatistics('bridge', filteredBridges);
    updateStatistics('culvert', filteredCulverts);
    
    updateChartData(bridgeChart, filteredBridges);
    updateChartData(culvertChart, filteredCulverts);
}

// Update Statistics
function updateStatistics(type, features) {
    const conditions = { EXCELLENT: 0, GOOD: 0, FAIR: 0, POOR: 0 };
    
    features.forEach(feature => {
        const condition = feature.properties?.Rating?.toUpperCase();
        if (condition && conditions.hasOwnProperty(condition)) {
            conditions[condition]++;
        }
    });
    
    // Update UI
    document.getElementById(`${type}Excellent`).textContent = conditions.EXCELLENT;
    document.getElementById(`${type}Good`).textContent = conditions.GOOD;
    document.getElementById(`${type}Fair`).textContent = conditions.FAIR;
    document.getElementById(`${type}Poor`).textContent = conditions.POOR;
    
    // Update total count
    const totalElement = document.getElementById(`total${type.charAt(0).toUpperCase() + type.slice(1)}s`);
    if (totalElement) {
        totalElement.textContent = features.length;
    }
    
    console.log(`${type} conditions:`, conditions);
}

// Update Chart Data
function updateChartData(chart, features) {
    const conditions = { EXCELLENT: 0, GOOD: 0, FAIR: 0, POOR: 0 };
    
    features.forEach(feature => {
        const condition = feature.properties?.Rating?.toUpperCase();
        if (condition && conditions.hasOwnProperty(condition)) {
            conditions[condition]++;
        }
    });
    
    chart.data.datasets[0].data = [
        conditions.EXCELLENT,
        conditions.GOOD,
        conditions.FAIR,
        conditions.POOR
    ];
    
    chart.update('active');
}

// Update Global Statistics
function updateGlobalStats(features) {
    if (!features || features.length === 0) {
        document.getElementById('totalFeatures').textContent = '0';
        document.getElementById('avgLength').textContent = '0.0';
        document.getElementById('avgWidth').textContent = '0.0';
        document.getElementById('avgSpan').textContent = '0.0';
        return;
    }
    
    const lengths = [];
    const widths = [];
    const spans = [];
    
    features.forEach(feature => {
        const props = feature.properties;
        
        // Length
        const length = props.TOTAL_LENG || props.MAX_CLEAR_;
        if (length && !isNaN(length)) {
            lengths.push(length);
        }
        
        // Width
        const width = props.TOTAL_WIDT || props.CLEARROADW;
        if (width && !isNaN(width)) {
            widths.push(width);
        }
        
        // Span
        const span = props.MAX_CLEAR_ || props.CULVERTLEN;
        if (span && !isNaN(span)) {
            spans.push(span);
        }
    });
    
    const avgLength = lengths.length > 0 ? 
        (lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1) : '0.0';
    const avgWidth = widths.length > 0 ? 
        (widths.reduce((a, b) => a + b, 0) / widths.length).toFixed(1) : '0.0';
    const avgSpan = spans.length > 0 ? 
        (spans.reduce((a, b) => a + b, 0) / spans.length).toFixed(1) : '0.0';
    
    document.getElementById('totalFeatures').textContent = features.length;
    document.getElementById('avgLength').textContent = avgLength;
    document.getElementById('avgWidth').textContent = avgWidth;
    document.getElementById('avgSpan').textContent = avgSpan;
}

// Reset Filters
function resetFilters() {
    console.log("🔄 Resetting filters...");
    
    document.getElementById('districtSelect').value = 'all';
    document.getElementById('typeSelect').value = 'all';
    document.getElementById('conditionSelect').value = 'all';
    
    // Reset range sliders to default
    document.getElementById('minLengthRange').value = 0;
    document.getElementById('maxLengthRange').value = 100;
    
    document.getElementById('minWidthRange').value = 0;
    document.getElementById('maxWidthRange').value = 20;
    
    document.getElementById('minSpanRange').value = 0;
    document.getElementById('maxSpanRange').value = 50;
    
    updateRangeValues();
    applyFilters();
    
    // Visual feedback
    const resetBtn = document.getElementById('resetFilters');
    const originalHtml = resetBtn.innerHTML;
    resetBtn.innerHTML = '<i class="fas fa-check"></i> Reset!';
    
    setTimeout(() => {
        resetBtn.innerHTML = originalHtml;
    }, 1000);
}

// Reload Data
async function reloadData() {
    const reloadBtn = document.getElementById('reloadData');
    const originalHtml = reloadBtn.innerHTML;
    reloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    reloadBtn.disabled = true;
    
    document.getElementById('loadingSpinner').style.display = 'flex';
    
    try {
        // Clear existing data
        bridgesData = [];
        culvertsData = [];
        
        // Reload data
        await loadAllData();
        console.log("✅ Data reloaded successfully");
    } catch (error) {
        console.error("❌ Failed to reload data:", error);
    } finally {
        setTimeout(() => {
            reloadBtn.innerHTML = originalHtml;
            reloadBtn.disabled = false;
            document.getElementById('loadingSpinner').style.display = 'none';
        }, 500);
    }
}

// Export Data
function exportData() {
    if ((!bridgesData || bridgesData.length === 0) && (!culvertsData || culvertsData.length === 0)) {
        alert('No data available to export');
        return;
    }
    
    const exportData = {
        bridges: bridgesData,
        culverts: culvertsData,
        metadata: {
            totalBridges: bridgesData.length,
            totalCulverts: culvertsData.length,
            exportDate: new Date().toISOString()
        }
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'infrastructure_data.json');
    linkElement.click();
    
    // Show notification
    showNotification('Data exported successfully!', 'success');
}

// Debug Function
function debugData() {
    console.log("=== DEBUG INFORMATION ===");
    console.log("Bridges count:", bridgesData.length);
    console.log("Culverts count:", culvertsData.length);
    console.log("Total features:", bridgesData.length + culvertsData.length);
    console.log("Districts:", allDistricts);
    
    if (bridgesData.length > 0) {
        console.log("First bridge:", bridgesData[0]);
        console.log("Bridge properties:", bridgesData[0].properties);
    }
    
    if (culvertsData.length > 0) {
        console.log("First culvert:", culvertsData[0]);
        console.log("Culvert properties:", culvertsData[0].properties);
    }
    
    // Show counts in alert
    const message = `
Bridges: ${bridgesData.length}
Culverts: ${culvertsData.length}
Total: ${bridgesData.length + culvertsData.length}

Check console (F12) for detailed structure
    `.trim();
    
    alert(message);
}

// Toggle View
function toggleView() {
    const mapContainer = document.querySelector('.map-container');
    const currentHeight = mapContainer.style.height;
    
    if (currentHeight === '100%') {
        mapContainer.style.height = '';
    } else {
        mapContainer.style.height = '100%';
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Add popup styles
const popupStyles = document.createElement('style');
popupStyles.textContent = `
    .neon-popup .leaflet-popup-content-wrapper {
        background: #11111a !important;
        border: 2px solid #00f3ff !important;
        border-radius: 8px !important;
        color: white !important;
    }
    
    .neon-popup .leaflet-popup-tip {
        background: #11111a !important;
        border: 2px solid #00f3ff !important;
    }
    
    .popup-content h6 {
        color: #00f3ff;
        margin-bottom: 10px;
        border-bottom: 1px solid #00f3ff;
        padding-bottom: 5px;
        font-size: 14px;
    }
    
    .popup-content table {
        width: 100%;
        font-size: 12px;
        border-collapse: collapse;
    }
    
    .popup-content tr {
        border-bottom: 1px solid rgba(0, 243, 255, 0.2);
    }
    
    .popup-content td {
        padding: 4px 0;
        vertical-align: top;
    }
    
    .popup-content td:first-child {
        color: #a0a0c0;
        white-space: nowrap;
        padding-right: 10px;
        font-weight: 600;
    }
`;
document.head.appendChild(popupStyles);

// Add notification styles
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(17, 17, 26, 0.95);
        border: 2px solid #00f3ff;
        border-radius: 8px;
        padding: 12px 20px;
        color: white;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    }
    
    .notification-success {
        border-color: #00ff88;
    }
    
    .notification i {
        font-size: 18px;
    }
    
    .notification-success i {
        color: #00ff88;
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(notificationStyles);

// Global access for debugging
window.debugData = debugData;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.reloadData = reloadData;

console.log("✅ Dashboard initialized successfully");
