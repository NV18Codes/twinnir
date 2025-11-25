// Main Application Logic

let map;
let drawControl;
let currentDrawingTool = null;
let drawnItems = new L.FeatureGroup();
let currentColor = '#FF0000';

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    initializeMap();
    checkAuthState();
}

function setupEventListeners() {
    // Navigation buttons
    const navMapViewBtn = document.getElementById('nav-map-view-btn');
    const navTourBtn = document.getElementById('nav-tour-btn');
    const exploreBtn = document.getElementById('explore-btn');
    const exploreSolutionsBtn = document.getElementById('explore-solutions-btn');
    const requestBtn = document.getElementById('request-btn');
    const requestDemoBtn = document.getElementById('request-demo-btn');

    if (navMapViewBtn) {
        navMapViewBtn.addEventListener('click', () => showPage('map-page'));
    }

    if (navTourBtn) {
        navTourBtn.addEventListener('click', () => {
            window.location.href = 'index.htm';
        });
    }

    if (exploreBtn || exploreSolutionsBtn) {
        [exploreBtn, exploreSolutionsBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    // Allow map viewing without login
                    showPage('map-page');
                    loadMapLocations();
                });
            }
        });
    }

    if (requestBtn || requestDemoBtn) {
        [requestBtn, requestDemoBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    alert('Demo request feature coming soon!');
                });
            }
        });
    }

    // Map controls
    setupMapControls();

    // Annotations panel
    setupAnnotationsPanel();

    // Upload panel
    setupUploadPanel();

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        const modals = ['signup-modal', 'signin-modal', 'forgot-password-modal', 'matterport-modal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

function checkAuthState() {
    // Wait for authManager to be initialized
    setTimeout(() => {
        if (authManager && authManager.isAuthenticated()) {
            authManager.updateUIForLoggedInUser();
        }
    }, 100);
}

let locationMarkers = [];

function initializeMap() {
    // Check if map is already initialized
    if (map) {
        map.invalidateSize();
        loadMapLocations();
        return;
    }

    // Check if map container exists
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }

    // Initialize Leaflet map - center on Gauteng, South Africa
    map = L.map('map', {
        zoomControl: true,
        attributionControl: true
    }).setView([-26.106, 28.17], 13);
    window.map = map; // Make globally accessible
    
    console.log('🗺️ Map initialized at:', map.getCenter());

    // Add satellite map tile layer (Google Maps style)
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
        maxZoom: 19
    });
    
    // Add OpenStreetMap as alternative
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    });
    
    // Use satellite by default
    satelliteLayer.addTo(map);
    
    // Store layers for switching
    window.mapLayers = {
        satellite: satelliteLayer,
        street: osmLayer
    };

    // Add drawn items layer
    map.addLayer(drawnItems);

    // Map click handler for coordinate input
    map.on('click', (e) => {
        const latInput = document.getElementById('location-lat');
        const lngInput = document.getElementById('location-lng');
        if (latInput && lngInput) {
            latInput.value = e.latlng.lat.toFixed(6);
            lngInput.value = e.latlng.lng.toFixed(6);
        }
    });

    // Load existing locations
    loadMapLocations();

    // Initialize drawing controls only if Leaflet Draw is available
    if (typeof L.Control.Draw !== 'undefined') {
        try {
            drawControl = new L.Control.Draw({
                edit: {
                    featureGroup: drawnItems,
                    remove: true
                },
                draw: {
                    polygon: false,
                    polyline: false,
                    rectangle: false,
                    circle: false,
                    marker: false
                }
            });

            map.addControl(drawControl);

            // Handle drawing events
            map.on(L.Draw.Event.CREATED, (e) => {
                const layer = e.layer;
                layer.setStyle({ color: currentColor });
                drawnItems.addLayer(layer);
                saveAnnotation(layer);
            });

            map.on(L.Draw.Event.EDITED, (e) => {
                const layers = e.layers;
                layers.eachLayer((layer) => {
                    updateAnnotation(layer);
                });
            });

            map.on(L.Draw.Event.DELETED, (e) => {
                const layers = e.layers;
                layers.eachLayer((layer) => {
                    deleteAnnotation(layer);
                });
            });
        } catch (error) {
            console.log('Leaflet Draw not available, skipping drawing controls');
        }
    }

    // Get coordinates on map click
    map.on('click', (e) => {
        const latInput = document.getElementById('location-lat');
        const lngInput = document.getElementById('location-lng');
        
        if (latInput && lngInput) {
            latInput.value = e.latlng.lat.toFixed(6);
            lngInput.value = e.latlng.lng.toFixed(6);
        }
    });
}

function setupMapControls() {
    // Space and Organization dropdowns
    const spaceDropdown = document.getElementById('space-dropdown');
    const orgDropdown = document.getElementById('organization-dropdown');

    if (spaceDropdown) {
        spaceDropdown.addEventListener('change', (e) => {
            filterMapBySpace(e.target.value);
        });
    }

    if (orgDropdown) {
        orgDropdown.addEventListener('change', (e) => {
            filterMapByOrganization(e.target.value);
        });
    }

    // Export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportMapData);
    }

    // 360 Views button
    const views360Btn = document.getElementById('views-360-btn');
    if (views360Btn) {
        views360Btn.addEventListener('click', () => {
            window.location.href = 'index.htm';
        });
    }

    // Drone Footage button
    const droneFootageBtn = document.getElementById('drone-footage-btn');
    if (droneFootageBtn) {
        droneFootageBtn.addEventListener('click', () => {
            alert('Drone footage feature coming soon!');
        });
    }

    // Zoom controls
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => map.zoomIn());
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => map.zoomOut());
    }

    // Fullscreen button
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    // Get coordinates button
    const getCoordinatesBtn = document.getElementById('get-coordinates-btn');
    if (getCoordinatesBtn) {
        getCoordinatesBtn.addEventListener('click', getCurrentCoordinates);
    }
}

function setupAnnotationsPanel() {
    const editControlBtn = document.getElementById('edit-control-btn');
    const closeAnnotationsBtn = document.getElementById('close-annotations-btn');
    const drawingTools = document.querySelectorAll('.draw-tool');
    const eraseBtn = document.getElementById('erase-btn');
    const colorBtns = document.querySelectorAll('.color-btn');

    if (editControlBtn) {
        editControlBtn.addEventListener('click', () => {
            const panel = document.getElementById('annotations-panel');
            panel.classList.toggle('collapsed');
        });
    }

    if (closeAnnotationsBtn) {
        closeAnnotationsBtn.addEventListener('click', () => {
            document.getElementById('annotations-panel').classList.add('collapsed');
        });
    }

    drawingTools.forEach(tool => {
        tool.addEventListener('click', (e) => {
            const toolType = e.currentTarget.dataset.tool;
            activateDrawingTool(toolType);
        });
    });

    if (eraseBtn) {
        eraseBtn.addEventListener('click', () => {
            if (confirm('Delete all annotations?')) {
                drawnItems.clearLayers();
                clearAllAnnotations();
            }
        });
    }

    colorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentColor = e.currentTarget.dataset.color;
            colorBtns.forEach(b => b.style.border = '2px solid #fff');
            e.currentTarget.style.border = '3px solid #2F98CA';
        });
    });
}

function setupUploadPanel() {
    const uploadControlBtn = document.getElementById('upload-control-btn');
    const closeUploadBtn = document.getElementById('close-upload-btn');
    const uploadForm = document.getElementById('upload-form');
    const locationFile = document.getElementById('location-file');
    const fileName = document.getElementById('file-name');

    if (uploadControlBtn) {
        uploadControlBtn.addEventListener('click', () => {
            if (!authManager || !authManager.isAuthenticated()) {
                authManager.openModal('signin-modal');
                return;
            }
            const panel = document.getElementById('upload-panel');
            panel.classList.toggle('collapsed');
        });
    }

    if (closeUploadBtn) {
        closeUploadBtn.addEventListener('click', () => {
            document.getElementById('upload-panel').classList.add('collapsed');
        });
    }

    if (locationFile) {
        locationFile.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                fileName.textContent = `Selected: ${e.target.files[0].name}`;
            }
        });
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleLocationUpload();
        });
    }
}

function activateDrawingTool(toolType) {
    currentDrawingTool = toolType;
    
    // Remove existing draw control
    map.removeControl(drawControl);
    
    // Create new draw control with selected tool
    const drawOptions = {
        edit: {
            featureGroup: drawnItems,
            remove: true
        },
        draw: {
            polygon: toolType === 'polygon',
            polyline: toolType === 'polyline',
            rectangle: toolType === 'rectangle',
            circle: toolType === 'circle',
            marker: toolType === 'marker'
        }
    };
    
    drawControl = new L.Control.Draw(drawOptions);
    map.addControl(drawControl);
    
    // Highlight selected tool
    document.querySelectorAll('.draw-tool').forEach(tool => {
        tool.style.background = 'rgba(47, 152, 202, 0.1)';
    });
    event.currentTarget.style.background = 'rgba(47, 152, 202, 0.3)';
}

// Validate South Africa coordinates
function validateSouthAfricaCoordinates(lat, lng) {
    // South Africa bounds: lat -35 to -22, lng 16 to 33
    if (lat < -35 || lat > -22) {
        return { valid: false, message: 'Latitude must be between -35 and -22 (South Africa bounds)' };
    }
    if (lng < 16 || lng > 33) {
        return { valid: false, message: 'Longitude must be between 16 and 33 (South Africa bounds)' };
    }
    return { valid: true };
}

// Extract GPS coordinates from image using EXIF
function extractGPSFromImage(file, callback) {
    if (!file || !file.type.startsWith('image/')) {
        callback(null);
        return;
    }
    
    if (typeof EXIF === 'undefined') {
        console.warn('EXIF.js library not loaded');
        callback(null);
        return;
    }
    
    try {
        EXIF.getData(file, function() {
            const lat = EXIF.getTag(this, 'GPSLatitude');
            const latRef = EXIF.getTag(this, 'GPSLatitudeRef');
            const lng = EXIF.getTag(this, 'GPSLongitude');
            const lngRef = EXIF.getTag(this, 'GPSLongitudeRef');
            
            if (lat && Array.isArray(lat) && lng && Array.isArray(lng)) {
                // Convert to decimal degrees (handle cases where minutes/seconds might be missing)
                let latDecimal = lat[0] + (lat[1] || 0)/60 + (lat[2] || 0)/3600;
                let lngDecimal = lng[0] + (lng[1] || 0)/60 + (lng[2] || 0)/3600;
                
                // Apply reference (N/S, E/W)
                if (latRef === 'S') latDecimal = -latDecimal;
                if (lngRef === 'W') lngDecimal = -lngDecimal;
                
                callback({ lat: latDecimal, lng: lngDecimal });
            } else {
                console.log('GPS coordinates not found in EXIF data');
                callback(null);
            }
        });
    } catch (error) {
        console.error('Error extracting GPS from image:', error);
        callback(null);
    }
}

async function handleLocationUpload(event) {
    if (event) event.preventDefault();
    
    if (!authManager || !authManager.isAuthenticated()) {
        alert('Please sign in to upload locations');
        return;
    }

    const name = document.getElementById('location-name').value.trim();
    const description = document.getElementById('location-description').value.trim();
    const category = 'property'; // Default category
    let lat = parseCoordinate(document.getElementById('location-lat').value);
    let lng = parseCoordinate(document.getElementById('location-lng').value);
    const file = document.getElementById('location-file').files[0];
    const urlInput = document.getElementById('location-url');
    const url = urlInput ? urlInput.value.trim() : null;
    
    // Check file size (1GB = 1073741824 bytes)
    if (file && file.size > 1073741824) {
        alert('File size exceeds 1GB limit. Please use a direct link for files larger than 1GB.');
        return;
    }

    if (!name || !category) {
        alert('Please fill in Name and Category fields');
        return;
    }
    
    // If coordinates not provided, try to extract from image
    if ((!lat || !lng) && file && file.type.startsWith('image/') && typeof EXIF !== 'undefined') {
        extractGPSFromImage(file, (coords) => {
            if (coords) {
                // Validate South Africa bounds
                const validation = validateSouthAfricaCoordinates(coords.lat, coords.lng);
                if (validation.valid) {
                    lat = coords.lat;
                    lng = coords.lng;
                    document.getElementById('location-lat').value = lat.toFixed(6);
                    document.getElementById('location-lng').value = lng.toFixed(6);
                    // Show on map
                    const currentMap = map || window.map;
                    if (currentMap && typeof currentMap.setView === 'function') {
                        currentMap.setView([lat, lng], 15);
                        const marker = L.marker([lat, lng])
                            .addTo(currentMap)
                            .bindPopup('GPS extracted from image')
                            .openPopup();
                    }
                    // Continue with upload
                    continueUpload();
                } else {
                    alert('GPS coordinates found but outside South Africa bounds. Please enter coordinates manually.');
                }
            } else {
                alert('No GPS coordinates found in image. Please enter coordinates manually.');
            }
        });
        return;
    }
    
    // If coordinates are provided manually, validate and show on map
    if (lat && lng) {
        const validation = validateSouthAfricaCoordinates(lat, lng);
        if (validation.valid) {
            // Show location on map
            const currentMap = map || window.map;
            if (currentMap && typeof currentMap.setView === 'function') {
                currentMap.setView([lat, lng], 15);
                const marker = L.marker([lat, lng])
                    .addTo(currentMap)
                    .bindPopup('Location to upload')
                    .openPopup();
            }
        }
    }

    if (!lat || !lng) {
        alert('Please provide coordinates or upload an image with GPS data');
        return;
    }
    
    // Validate South Africa coordinates
    const validation = validateSouthAfricaCoordinates(lat, lng);
    if (!validation.valid) {
        alert(validation.message);
        return;
    }
    
    continueUpload();
    
    async function continueUpload() {

    try {
        let fileUrl = null;
        
        // Upload file to Supabase Storage if file is selected
        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `locations/${fileName}`;

            // Try to upload directly - bucket should exist
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('location-files')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
                    alert('⚠️ Storage bucket "location-files" not accessible.\n\nPlease verify in Supabase:\n1. Go to Storage > Buckets\n2. Ensure "location-files" bucket exists\n3. Ensure it is marked as "Public"\n4. Check Storage Policies allow authenticated users to INSERT');
                    return;
                } else {
                    console.error('Upload error:', uploadError);
                    alert('Upload failed: ' + uploadError.message);
                    return;
                }
            }

            const { data: { publicUrl } } = supabase.storage
                .from('location-files')
                .getPublicUrl(filePath);

            fileUrl = publicUrl;
        }

        // Determine media type from file
        let mediaType = null;
        if (file) {
            const fileType = file.type.toLowerCase();
            if (fileType.startsWith('image/')) {
                mediaType = 'image';
            } else if (fileType.startsWith('video/')) {
                mediaType = 'video';
            } else if (file.name.toLowerCase().includes('360') || file.name.toLowerCase().includes('panorama')) {
                mediaType = '360';
            } else if (file.name.toLowerCase().includes('3dgs') || file.name.toLowerCase().includes('3d')) {
                mediaType = '3dgs';
            }
        }

        // Get URL if provided
        const urlInput = document.getElementById('location-url');
        const url = urlInput ? urlInput.value.trim() : null;
        
        // Get organization/space IDs if provided (from dropdowns in upload form)
        const organizationId = document.getElementById('location-organization')?.value || null;
        const spaceId = document.getElementById('location-space')?.value || null;
        const propertyId = document.getElementById('location-property')?.value || null;
        const assetId = document.getElementById('location-asset')?.value || null;
        
        // Validate coordinates again before saving
        const validation = validateSouthAfricaCoordinates(lat, lng);
        if (!validation.valid) {
            alert(validation.message);
            return;
        }
        
        // Save location to database
        const locationData = {
            name: name.trim(),
            description: description ? description.trim() : null,
            category: category,
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
            user_id: authManager.getCurrentUser().id,
            organization_id: organizationId || null,
            space_id: spaceId || null,
            property_id: propertyId || null,
            asset_id: assetId || null
        };
        
        // Always add file_url and media_type to location for popup display
        const mediaUrl = fileUrl || url;
        if (mediaUrl) {
            locationData.file_url = mediaUrl;
            locationData.media_type = mediaType || (url ? (url.toLowerCase().includes('video') ? 'video' : 'image') : null);
        }
        
        const { data: locationResult, error: locationError } = await supabase
            .from('locations')
            .insert([locationData])
            .select();

        if (locationError) {
            throw locationError;
        }

        if (!locationResult || locationResult.length === 0) {
            throw new Error('Location was not saved');
        }

        const savedLocation = locationResult[0];
        
        // Save media to location_media table if file or URL provided
        if (mediaUrl) {
            const mediaData = {
                location_id: savedLocation.id,
                file_url: mediaUrl,
                media_type: locationData.media_type
            };
            
            const { error: mediaError } = await supabase
                .from('location_media')
                .insert([mediaData]);
            
            if (mediaError) {
                console.error('Error saving media:', mediaError);
                // Don't throw, location is already saved
            }
        }

        alert('Location uploaded successfully!');
        const uploadForm = document.getElementById('uploadLocationForm');
        if (uploadForm) uploadForm.reset();
        const fileName = document.getElementById('file-name');
        if (fileName) fileName.textContent = '';
        closeUploadModal();
        
        // Remove preview marker if exists
        if (window.previewMarker) {
            const currentMap = map || window.map;
            if (currentMap) {
                currentMap.removeLayer(window.previewMarker);
            }
            window.previewMarker = null;
        }
        
        // Add blue marker to map and center view with image preview
        if (lat && lng) {
            const currentMap = map || window.map;
            if (currentMap) {
                const blueIcon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });

                currentMap.setView([lat, lng], 15);
                
                // Build popup content with image preview
                // Use saved location data which includes file_url and media_type
                const savedMediaUrl = savedLocation.file_url || mediaUrl;
                const savedMediaType = savedLocation.media_type || mediaType;
                
                let popupContent = `<div style="min-width: 250px; max-width: 400px;">
                    <b style="font-size: 1.1rem; color: #333;">${name}</b><br>`;
                
                if (description) {
                    popupContent += `<p style="margin: 0.5rem 0; color: #666;">${description}</p>`;
                }
                
                if (savedMediaUrl) {
                    if (savedMediaType === 'image') {
                        popupContent += `<img src="${savedMediaUrl}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 4px; margin-top: 0.5rem; cursor: pointer;" onclick="window.open('${savedMediaUrl}', '_blank')" title="Click to view full size" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">`;
                    } else if (savedMediaType === 'video') {
                        popupContent += `<video src="${savedMediaUrl}" controls style="width: 100%; max-height: 300px; border-radius: 4px; margin-top: 0.5rem;"></video>`;
                    } else {
                        popupContent += `<a href="${savedMediaUrl}" target="_blank" style="color: #23d18b; text-decoration: underline; display: block; margin-top: 0.5rem;">View Media</a>`;
                    }
                }
                
                popupContent += `</div>`;
                
                const marker = L.marker([lat, lng], { icon: blueIcon })
                    .addTo(currentMap)
                    .bindPopup(popupContent)
                    .openPopup();
                
                locationMarkers.push(marker);
            }
        }

        // Reload all locations and center on the new one
        setTimeout(() => {
            // Clear existing markers first to ensure fresh load
            const currentMap = map || window.map;
            if (currentMap) {
                locationMarkers.forEach(marker => {
                    if (currentMap.hasLayer(marker)) {
                        currentMap.removeLayer(marker);
                    }
                });
            }
            locationMarkers = [];
            console.log('🔄 Cleared existing markers, reloading all locations...');
            
            // Reload all locations from database
            loadMapLocations();
            
            // Center map on the newly uploaded location
            if (lat && lng) {
                if (currentMap) {
                    currentMap.setView([lat, lng], 15);
                    console.log(`✅ Map centered on uploaded location: (${lat}, ${lng})`);
                    
                    // Find and highlight the new marker after a short delay
                    setTimeout(() => {
                        const newMarker = locationMarkers.find(m => {
                            if (m.locationData) {
                                // Try to match by coordinates
                                const pos = m.getLatLng();
                                return Math.abs(pos.lat - lat) < 0.0001 && Math.abs(pos.lng - lng) < 0.0001;
                            }
                            return false;
                        });
                        if (newMarker) {
                            newMarker.openPopup();
                            console.log(`✅ New marker found and popup opened: ${newMarker.locationData?.name || 'Unknown'}`);
                        } else {
                            console.warn(`⚠️ New marker not found at (${lat}, ${lng}) - check if location was saved`);
                        }
                    }, 1000);
                }
            }
        }, 500);

    } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading location: ' + error.message);
    }
    } // Close continueUpload function
}

// Load all locations from database and display on map
async function loadMapLocations() {
    if (!map && !window.map) {
        console.log('Map not initialized yet');
        return;
    }
    
    const currentMap = map || window.map;
    if (!currentMap) return;

    try {
        // Clear existing markers
        locationMarkers.forEach(marker => {
            if (currentMap.hasLayer(marker)) {
                currentMap.removeLayer(marker);
            }
        });
        locationMarkers = [];

        // Fetch all locations from database
        console.log('🔄 Loading locations from database...');
        let locations, error;
        try {
            const result = await supabase
                .from('locations')
                .select('*')
                .order('created_at', { ascending: false });
            locations = result.data;
            error = result.error;
        } catch (fetchError) {
            console.error('❌ Network error loading locations:', fetchError);
            // Don't show alert for network errors - might be temporary
            return;
        }

        if (error) {
            console.error('❌ Error loading locations:', error);
            // Don't show alert - just log it
            return;
        }

        if (!locations || locations.length === 0) {
            console.log('ℹ️ No locations found in database');
            return;
        }

        console.log(`📍 Found ${locations.length} location(s) in database:`, locations);

        // Create blue icon for markers
        const blueIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        // Add markers for each location
        let bounds = null;
        locations.forEach(location => {
            // Ensure coordinates are numbers
            const lat = parseFloat(location.latitude);
            const lng = parseFloat(location.longitude);
            
            // Validate coordinates
            if (isNaN(lat) || isNaN(lng)) {
                console.error('Invalid coordinates for location:', location.id, location.name, 'lat:', location.latitude, 'lng:', location.longitude);
                return;
            }
            
            // Build popup content with coordinates and image preview (like the example)
            let popupContent = `<div style="min-width: 200px; max-width: 400px; font-family: Arial, sans-serif;">
                <b style="font-size: 1.1rem; color: #333; display: block; margin-bottom: 0.5rem;">${location.name || 'Unnamed Location'}</b>`;
            
            // Add coordinates like in the example
            popupContent += `<div style="font-size: 0.85rem; color: #666; margin-bottom: 0.5rem; line-height: 1.4;">
                <div>Lat: ${lat.toFixed(6)}</div>
                <div>Lng: ${lng.toFixed(6)}</div>
            </div>`;
            
            if (location.description) {
                popupContent += `<p style="margin: 0.5rem 0; color: #666; font-size: 0.9rem;">${location.description}</p>`;
            }
            
            if (location.file_url) {
                if (location.media_type === 'image') {
                    popupContent += `<img src="${location.file_url}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 4px; margin-top: 0.5rem; cursor: pointer;" onclick="window.open('${location.file_url}', '_blank')" title="Click to view full size" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">`;
                } else if (location.media_type === 'video') {
                    popupContent += `<video src="${location.file_url}" controls style="width: 100%; max-height: 300px; border-radius: 4px; margin-top: 0.5rem;"></video>`;
                } else {
                    popupContent += `<a href="${location.file_url}" target="_blank" style="color: #23d18b; text-decoration: underline; display: block; margin-top: 0.5rem;">View Media</a>`;
                }
            }
            
            popupContent += `</div>`;

            // Check if marker already exists for this specific location ID (avoid duplicate database entries)
            // Allow multiple markers at same coordinates if they're different database entries
            const existingMarker = locationMarkers.find(m => {
                if (m.locationData && m.locationData.id === location.id) {
                    return true; // Same location ID already has a marker
                }
                return false;
            });
            
            if (existingMarker) {
                console.log(`⚠️ Skipping duplicate marker for location ID: ${location.id} (${location.name})`);
                return; // Skip if this exact location ID already has a marker
            }
            
            // Create marker - store location data for reference
            const marker = L.marker([lat, lng], { 
                icon: blueIcon
            })
                .addTo(currentMap)
                .bindPopup(popupContent, {
                    closeButton: true,
                    autoClose: false,
                    closeOnClick: false,
                    className: 'custom-popup'
                });
            
            // Store location data in marker for duplicate detection and reference
            marker.locationData = location;
            
            // Open popup automatically for the first marker or most recent location
            if (locationMarkers.length === 0 || location === locations[0]) {
                marker.openPopup();
            }
            
            locationMarkers.push(marker);
            
            // Make marker more visible - add a click event
            marker.on('click', function() {
                this.openPopup();
                console.log(`📍 Clicked marker: ${location.name} at (${lat}, ${lng})`);
            });
            
            console.log(`✅ Created marker for: ${location.name} (ID: ${location.id}) at (${lat}, ${lng})`);
            
            // Add to bounds for fitting map view
            if (!bounds) {
                bounds = L.latLngBounds([[lat, lng], [lat, lng]]);
            } else {
                bounds.extend([lat, lng]);
            }
            
            console.log(`✅ Added marker for: ${location.name} at (${lat}, ${lng})`);
        });

        // Fit map to show all markers if we have any
        if (bounds && locationMarkers.length > 0) {
            // If only one location, center and zoom on it
            if (locationMarkers.length === 1) {
                const singleLocation = locations[0];
                const singleLat = parseFloat(singleLocation.latitude);
                const singleLng = parseFloat(singleLocation.longitude);
                if (!isNaN(singleLat) && !isNaN(singleLng)) {
                    currentMap.setView([singleLat, singleLng], 15);
                    console.log(`✅ Map centered on single location: ${singleLocation.name} at (${singleLat}, ${singleLng})`);
                }
            } else {
                // Multiple locations - fit bounds but ensure good zoom
                currentMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
                console.log('✅ Map fitted to show all locations');
            }
            
            // Always center on the most recent location (first in the list) and open its popup
            if (locations.length > 0) {
                const mostRecent = locations[0];
                const recentLat = parseFloat(mostRecent.latitude);
                const recentLng = parseFloat(mostRecent.longitude);
                if (!isNaN(recentLat) && !isNaN(recentLng)) {
                    // Center on most recent
                    currentMap.setView([recentLat, recentLng], 15);
                    console.log(`✅ Map centered on most recent location: ${mostRecent.name} at (${recentLat}, ${recentLng})`);
                    
                    // Find and open popup for most recent marker
                    setTimeout(() => {
                        const recentMarker = locationMarkers.find(m => {
                            const pos = m.getLatLng();
                            return Math.abs(pos.lat - recentLat) < 0.0001 && Math.abs(pos.lng - recentLng) < 0.0001;
                        });
                        if (recentMarker) {
                            recentMarker.openPopup();
                            console.log(`✅ Popup opened for: ${mostRecent.name}`);
                        }
                    }, 500);
                }
            }
        }

        console.log(`✅ Loaded ${locations.length} locations, ${locationMarkers.length} unique markers displayed`);
        
        // Log unique locations vs duplicates
        if (locations.length > locationMarkers.length) {
            console.warn(`⚠️ Found ${locations.length - locationMarkers.length} duplicate location(s) in database`);
        }
        
        // Verify markers are actually on the map
        if (locationMarkers.length > 0) {
            locationMarkers.forEach((marker, idx) => {
                const pos = marker.getLatLng();
                const isOnMap = currentMap.hasLayer(marker);
                console.log(`📍 Marker ${idx + 1} position: (${pos.lat}, ${pos.lng}) - On map: ${isOnMap}`);
                if (!isOnMap) {
                    console.error(`❌ Marker ${idx + 1} is NOT on the map!`);
                }
            });
        }

    } catch (error) {
        console.error('❌ Error loading locations:', error);
    }
}

// Make loadMapLocations globally accessible
window.loadMapLocations = loadMapLocations;
window.initializeMap = initializeMap;

function parseCoordinate(value) {
    if (!value) return null;
    
    // Check if it's DMS format (26;6;22.889)
    if (value.includes(';')) {
        const parts = value.split(';').map(Number);
        if (parts.length === 3) {
            return parts[0] + parts[1] / 60 + parts[2] / 3600;
        }
    }
    
    // Otherwise, treat as decimal
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
}

function getCurrentCoordinates() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.getElementById('location-lat').value = position.coords.latitude.toFixed(6);
                document.getElementById('location-lng').value = position.coords.longitude.toFixed(6);
            },
            (error) => {
                alert('Error getting location: ' + error.message);
            }
        );
    } else {
        alert('Geolocation is not supported by this browser');
    }
}

async function saveAnnotation(layer) {
    if (!authManager || !authManager.isAuthenticated()) return;

    try {
        const geoJson = layer.toGeoJSON();
        const { data, error } = await supabase
            .from('annotations')
            .insert([
                {
                    user_id: authManager.getCurrentUser().id,
                    geo_json: geoJson,
                    color: currentColor,
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;
        
        // Store annotation ID in layer
        layer._annotationId = data[0].id;
    } catch (error) {
        console.error('Error saving annotation:', error);
    }
}

async function updateAnnotation(layer) {
    if (!authManager || !authManager.isAuthenticated() || !layer._annotationId) return;

    try {
        const geoJson = layer.toGeoJSON();
        const { error } = await supabase
            .from('annotations')
            .update({ geo_json: geoJson })
            .eq('id', layer._annotationId);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating annotation:', error);
    }
}

async function deleteAnnotation(layer) {
    if (!authManager || !authManager.isAuthenticated() || !layer._annotationId) return;

    try {
        const { error } = await supabase
            .from('annotations')
            .delete()
            .eq('id', layer._annotationId);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting annotation:', error);
    }
}

async function clearAllAnnotations() {
    if (!authManager || !authManager.isAuthenticated()) return;

    try {
        const { error } = await supabase
            .from('annotations')
            .delete()
            .eq('user_id', authManager.getCurrentUser().id);

        if (error) throw error;
    } catch (error) {
        console.error('Error clearing annotations:', error);
    }
}

function filterMapBySpace(spaceId) {
    // Implement space filtering logic
    console.log('Filtering by space:', spaceId);
}

function filterMapByOrganization(orgId) {
    // Implement organization filtering logic
    console.log('Filtering by organization:', orgId);
}

function exportMapData() {
    // Implement export functionality
    alert('Export feature coming soon!');
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        
        // Initialize map if showing map page
        if (pageId === 'map-page') {
            setTimeout(() => {
                if (!map) {
                    initializeMap();
                } else {
                    // Map already initialized, just load locations
                    loadMapLocations();
                    // Trigger map resize to fix display issues
                    map.invalidateSize();
                }
            }, 100);
        }
    }
}

