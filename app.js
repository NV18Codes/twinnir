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

    // Initialize Leaflet map
    map = L.map('map').setView([-26.106, 28.17], 13);
    window.map = map; // Make globally accessible

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
    
    EXIF.getData(file, function() {
        const lat = EXIF.getTag(this, 'GPSLatitude');
        const latRef = EXIF.getTag(this, 'GPSLatitudeRef');
        const lng = EXIF.getTag(this, 'GPSLongitude');
        const lngRef = EXIF.getTag(this, 'GPSLongitudeRef');
        
        if (lat && lng) {
            // Convert to decimal degrees
            let latDecimal = lat[0] + lat[1]/60 + lat[2]/3600;
            let lngDecimal = lng[0] + lng[1]/60 + lng[2]/3600;
            
            // Apply reference (N/S, E/W)
            if (latRef === 'S') latDecimal = -latDecimal;
            if (lngRef === 'W') lngDecimal = -lngDecimal;
            
            callback({ lat: latDecimal, lng: lngDecimal });
        } else {
            callback(null);
        }
    });
}

async function handleLocationUpload(event) {
    if (event) event.preventDefault();
    
    if (!authManager || !authManager.isAuthenticated()) {
        alert('Please sign in to upload locations');
        return;
    }

    const name = document.getElementById('location-name').value.trim();
    const description = document.getElementById('location-description').value.trim();
    const category = document.getElementById('location-category').value;
    let lat = parseCoordinate(document.getElementById('location-lat').value);
    let lng = parseCoordinate(document.getElementById('location-lng').value);
    const file = document.getElementById('location-file').files[0];
    const urlInput = document.getElementById('location-url');
    const url = urlInput ? urlInput.value.trim() : null;

    if (!name || !category) {
        alert('Please fill in Name and Category fields');
        return;
    }
    
    // If coordinates not provided, try to extract from image
    if ((!lat || !lng) && file && file.type.startsWith('image/')) {
        extractGPSFromImage(file, (coords) => {
            if (coords) {
                lat = coords.lat;
                lng = coords.lng;
                document.getElementById('location-lat').value = lat.toFixed(6);
                document.getElementById('location-lng').value = lng.toFixed(6);
                // Show on map
                if (window.map) {
                    window.map.setView([lat, lng], 15);
                    L.marker([lat, lng]).addTo(window.map).bindPopup('Extracted from image').openPopup();
                }
                // Continue with upload
                continueUpload();
            } else {
                alert('No GPS coordinates found in image. Please enter coordinates manually.');
            }
        });
        return;
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

            // Check if bucket exists, create if not
            const { data: buckets } = await supabase.storage.listBuckets();
            const bucketExists = buckets && buckets.some(b => b.name === 'location-files');
            
            if (!bucketExists) {
                // Try to create bucket (may fail if user doesn't have permission)
                const { error: createError } = await supabase.storage.createBucket('location-files', {
                    public: true,
                    allowedMimeTypes: ['image/*', 'video/*'],
                    fileSizeLimit: 52428800 // 50MB
                });
                if (createError && !createError.message.includes('already exists')) {
                    console.warn('Could not create bucket:', createError.message);
                    alert('Storage bucket not found. Please create a bucket named "location-files" in Supabase Storage with public access.');
                    return;
                }
            }

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('location-files')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                if (uploadError.message.includes('Bucket not found')) {
                    alert('Storage bucket "location-files" not found. Please create it in Supabase Storage settings.');
                } else {
                    throw uploadError;
                }
                return;
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
        
        // Only add file_url if no media will be saved to location_media
        if (fileUrl && !url) {
            locationData.file_url = fileUrl;
            locationData.media_type = mediaType;
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
        if (fileUrl || url) {
            const mediaUrl = fileUrl || url;
            const mediaData = {
                location_id: savedLocation.id,
                file_url: mediaUrl,
                media_type: mediaType || (url ? (url.toLowerCase().includes('video') ? 'video' : 'image') : null)
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
        
        // Add blue marker to map and center view
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
                const marker = L.marker([lat, lng], { icon: blueIcon })
                    .addTo(currentMap)
                    .bindPopup(`<b>${name}</b><br><strong>Category:</strong> ${category}<br>${description || ''}`)
                    .openPopup();
                
                locationMarkers.push(marker);
            }
        }

        // Reload all locations
        loadMapLocations();

    } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading location: ' + error.message);
    }
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
        const { data: locations, error } = await supabase
            .from('locations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading locations:', error);
            return;
        }

        if (!locations || locations.length === 0) {
            // This is normal - no locations have been uploaded yet
            return;
        }

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
        locations.forEach(location => {
            const popupContent = `
                <div style="min-width: 200px;">
                    <b>${location.name}</b><br>
                    <strong>Category:</strong> ${location.category}<br>
                    ${location.description ? `<p style="margin: 0.5rem 0;">${location.description}</p>` : ''}
                    ${location.file_url ? `<a href="${location.file_url}" target="_blank" style="color: #23d18b; text-decoration: underline;">View Media</a>` : ''}
                </div>
            `;

            const marker = L.marker([location.latitude, location.longitude], { icon: blueIcon })
                .addTo(currentMap)
                .bindPopup(popupContent);
            
            locationMarkers.push(marker);
        });

        console.log(`Loaded ${locations.length} locations`);

    } catch (error) {
        console.error('Error loading locations:', error);
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

