// Database Dashboard Functions

let currentDbTab = 'organizations';
let currentEditId = null;

// Show database dashboard
function showDatabaseDashboard() {
    const dashboard = document.getElementById('db-dashboard');
    if (dashboard) {
        dashboard.style.display = 'block';
        loadDbData('organizations');
    }
}

// Close database dashboard
function closeDatabaseDashboard() {
    const dashboard = document.getElementById('db-dashboard');
    if (dashboard) {
        dashboard.style.display = 'none';
    }
}

// Switch database tab
function switchDbTab(tabName) {
    currentDbTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.db-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    // Update tab content
    document.querySelectorAll('.db-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    const activeContent = document.getElementById(`db-tab-${tabName}`);
    if (activeContent) {
        activeContent.style.display = 'block';
    }
    
    // Load data for the tab
    loadDbData(tabName);
}

// Load data for a specific table
async function loadDbData(tableName) {
    const listElement = document.getElementById(`${tableName}-list`);
    if (!listElement) return;
    
    listElement.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Loading...</p>';
    
    try {
        let query = supabase.from(tableName).select('*');
        
        // Add joins for related data
        if (tableName === 'properties') {
            query = query.select('*, organizations(name)');
        } else if (tableName === 'spaces') {
            query = query.select('*, properties(name), space_types(name)');
        } else if (tableName === 'assets') {
            query = query.select('*, spaces(name), asset_types(name), properties(name)');
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        if (!data || data.length === 0) {
            listElement.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No items found. Click the "+ Add" button to create one.</p>';
            return;
        }
        
        if (tableName === 'media') {
            renderMediaList(data);
        } else {
            renderDbList(listElement, data, tableName);
        }
    } catch (error) {
        console.error(`Error loading ${tableName}:`, error);
        listElement.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 2rem;">Error loading data: ${error.message}</p>`;
    }
}

// Render database list
function renderDbList(container, items, tableName) {
    container.innerHTML = '';
    
    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'db-item';
        
        let html = `
            <div class="db-item-header">
                <h4 class="db-item-title">${escapeHtml(item.name || 'Unnamed')}</h4>
                <div class="db-item-actions">
                    <button class="db-item-btn db-item-btn-edit" onclick="editDbItem('${tableName}', '${item.id}')">Edit</button>
                    <button class="db-item-btn db-item-btn-delete" onclick="deleteDbItem('${tableName}', '${item.id}')">Delete</button>
                </div>
            </div>
        `;
        
        // Add fields based on table type
        if (tableName === 'organizations') {
            if (item.description) html += `<div class="db-item-field"><span class="db-item-field-label">Description:</span><span class="db-item-field-value">${escapeHtml(item.description)}</span></div>`;
            if (item.contact_email) html += `<div class="db-item-field"><span class="db-item-field-label">Email:</span><span class="db-item-field-value">${escapeHtml(item.contact_email)}</span></div>`;
            if (item.contact_phone) html += `<div class="db-item-field"><span class="db-item-field-label">Phone:</span><span class="db-item-field-value">${escapeHtml(item.contact_phone)}</span></div>`;
        } else if (tableName === 'properties') {
            if (item.organizations) html += `<div class="db-item-field"><span class="db-item-field-label">Organization:</span><span class="db-item-field-value">${escapeHtml(item.organizations.name)}</span></div>`;
            if (item.address) html += `<div class="db-item-field"><span class="db-item-field-label">Address:</span><span class="db-item-field-value">${escapeHtml(item.address)}</span></div>`;
            if (item.latitude && item.longitude) html += `<div class="db-item-field"><span class="db-item-field-label">Coordinates:</span><span class="db-item-field-value">${item.latitude}, ${item.longitude}</span></div>`;
        } else if (tableName === 'spaces') {
            if (item.properties) html += `<div class="db-item-field"><span class="db-item-field-label">Property:</span><span class="db-item-field-value">${escapeHtml(item.properties.name)}</span></div>`;
            if (item.space_types) html += `<div class="db-item-field"><span class="db-item-field-label">Type:</span><span class="db-item-field-value">${escapeHtml(item.space_types.name)}</span></div>`;
            if (item.latitude && item.longitude) html += `<div class="db-item-field"><span class="db-item-field-label">Coordinates:</span><span class="db-item-field-value">${item.latitude}, ${item.longitude}</span></div>`;
        } else if (tableName === 'assets') {
            if (item.spaces) html += `<div class="db-item-field"><span class="db-item-field-label">Space:</span><span class="db-item-field-value">${escapeHtml(item.spaces.name)}</span></div>`;
            if (item.asset_types) html += `<div class="db-item-field"><span class="db-item-field-label">Type:</span><span class="db-item-field-value">${escapeHtml(item.asset_types.name)}</span></div>`;
            if (item.properties) html += `<div class="db-item-field"><span class="db-item-field-label">Property:</span><span class="db-item-field-value">${escapeHtml(item.properties.name)}</span></div>`;
        } else if (tableName === 'space_types' || tableName === 'asset_types') {
            if (item.description) html += `<div class="db-item-field"><span class="db-item-field-label">Description:</span><span class="db-item-field-value">${escapeHtml(item.description)}</span></div>`;
        }
        
        if (item.description && tableName !== 'organizations' && tableName !== 'space_types' && tableName !== 'asset_types') {
            html += `<div class="db-item-field"><span class="db-item-field-label">Description:</span><span class="db-item-field-value">${escapeHtml(item.description)}</span></div>`;
        }
        
        html += `<div class="db-item-field" style="margin-top: 0.5rem; font-size: 0.8rem; color: #999;">Created: ${new Date(item.created_at).toLocaleDateString()}</div>`;
        
        itemDiv.innerHTML = html;
        container.appendChild(itemDiv);
    });
}

// Render media list grouped by location
async function renderMediaList() {
    const container = document.getElementById('media-list');
    if (!container) return;
    
    container.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Loading media...</p>';
    
    try {
        // Get all locations with their media
        const { data: locations, error } = await supabase
            .from('locations')
            .select('*, location_media(*)')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!locations || locations.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No locations with media found.</p>';
            return;
        }
        
        container.innerHTML = '';
        
        locations.forEach(location => {
            if (!location.location_media || location.location_media.length === 0) return;
            
            const locationDiv = document.createElement('div');
            locationDiv.className = 'db-item';
            locationDiv.style.marginBottom = '2rem';
            
            let html = `
                <h4 style="margin: 0 0 1rem 0; color: #333; font-size: 1.2rem;">${escapeHtml(location.name)}</h4>
                <div class="db-item-field" style="margin-bottom: 1rem;">
                    <span class="db-item-field-label">Category:</span>
                    <span class="db-item-field-value">${escapeHtml(location.category)}</span>
                </div>
                <div class="media-gallery">
            `;
            
            location.location_media.forEach(media => {
                if (media.media_type === 'image') {
                    html += `
                        <div class="media-item">
                            <img src="${escapeHtml(media.file_url)}" alt="${escapeHtml(media.description || '')}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3Ctext fill=%22%23999%22 font-family=%22sans-serif%22 font-size=%2214%22 dy=%2210.5%22 x=%2250%22 text-anchor=%22middle%22%3EImage%3C/text%3E%3C/svg%3E'">
                            <div class="media-item-info">
                                <div style="font-weight: 600; margin-bottom: 0.25rem;">${escapeHtml(media.media_type)}</div>
                                ${media.description ? `<div style="color: #666; font-size: 0.8rem;">${escapeHtml(media.description)}</div>` : ''}
                                <button onclick="deleteMedia('${media.id}')" style="margin-top: 0.5rem; padding: 0.3rem 0.6rem; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Delete</button>
                            </div>
                        </div>
                    `;
                } else if (media.media_type === 'video') {
                    html += `
                        <div class="media-item">
                            <video src="${escapeHtml(media.file_url)}" controls style="width: 100%; height: 150px; object-fit: cover;"></video>
                            <div class="media-item-info">
                                <div style="font-weight: 600; margin-bottom: 0.25rem;">${escapeHtml(media.media_type)}</div>
                                ${media.description ? `<div style="color: #666; font-size: 0.8rem;">${escapeHtml(media.description)}</div>` : ''}
                                <button onclick="deleteMedia('${media.id}')" style="margin-top: 0.5rem; padding: 0.3rem 0.6rem; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Delete</button>
                            </div>
                        </div>
                    `;
                }
            });
            
            html += '</div></div>';
            locationDiv.innerHTML = html;
            container.appendChild(locationDiv);
        });
    } catch (error) {
        console.error('Error loading media:', error);
        container.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 2rem;">Error loading media: ${error.message}</p>`;
    }
}

// Show add form
async function showAddForm(entityType) {
    currentEditId = null;
    const modal = document.getElementById('db-form-modal');
    const form = document.getElementById('db-form');
    const title = document.getElementById('db-form-title');
    
    if (!modal || !form || !title) return;
    
    const entityNames = {
        'organization': 'Organization',
        'property': 'Property',
        'space': 'Space',
        'asset': 'Asset',
        'space_type': 'Space Type',
        'asset_type': 'Asset Type'
    };
    
    title.textContent = `Add ${entityNames[entityType]}`;
    form.innerHTML = '';
    
    // Build form based on entity type
    let formHTML = '';
    
    if (entityType === 'organization') {
        formHTML = `
            <div class="form-group">
                <label>Name *</label>
                <input type="text" name="name" required placeholder="Organization name">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="description" rows="3" placeholder="Organization description"></textarea>
            </div>
            <div class="form-group">
                <label>Address</label>
                <input type="text" name="address" placeholder="Organization address">
            </div>
            <div class="form-group">
                <label>Contact Email</label>
                <input type="email" name="contact_email" placeholder="contact@example.com">
            </div>
            <div class="form-group">
                <label>Contact Phone</label>
                <input type="tel" name="contact_phone" placeholder="+27 11 123 4567">
            </div>
        `;
    } else if (entityType === 'property') {
        const { data: orgs } = await supabase.from('organizations').select('id, name').order('name');
        let orgOptions = '<option value="">Select Organization</option>';
        if (orgs) {
            orgs.forEach(org => {
                orgOptions += `<option value="${org.id}">${escapeHtml(org.name)}</option>`;
            });
        }
        
        formHTML = `
            <div class="form-group">
                <label>Name *</label>
                <input type="text" name="name" required placeholder="Property name">
            </div>
            <div class="form-group">
                <label>Organization</label>
                <select name="organization_id">${orgOptions}</select>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="description" rows="3" placeholder="Property description"></textarea>
            </div>
            <div class="form-group">
                <label>Address</label>
                <input type="text" name="address" placeholder="Property address">
            </div>
            <div class="form-group">
                <label>Coordinates</label>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" name="latitude" placeholder="Latitude" style="flex: 1;">
                    <input type="text" name="longitude" placeholder="Longitude" style="flex: 1;">
                </div>
            </div>
        `;
    } else if (entityType === 'space') {
        const { data: properties } = await supabase.from('properties').select('id, name').order('name');
        const { data: spaceTypes } = await supabase.from('space_types').select('id, name').order('name');
        
        let propOptions = '<option value="">Select Property</option>';
        if (properties) {
            properties.forEach(prop => {
                propOptions += `<option value="${prop.id}">${escapeHtml(prop.name)}</option>`;
            });
        }
        
        let typeOptions = '<option value="">Select Space Type</option>';
        if (spaceTypes) {
            spaceTypes.forEach(type => {
                typeOptions += `<option value="${type.id}">${escapeHtml(type.name)}</option>`;
            });
        }
        
        formHTML = `
            <div class="form-group">
                <label>Name *</label>
                <input type="text" name="name" required placeholder="Space name">
            </div>
            <div class="form-group">
                <label>Property</label>
                <select name="property_id">${propOptions}</select>
            </div>
            <div class="form-group">
                <label>Space Type</label>
                <select name="space_type_id">${typeOptions}</select>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="description" rows="3" placeholder="Space description"></textarea>
            </div>
            <div class="form-group">
                <label>Coordinates</label>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" name="latitude" placeholder="Latitude" style="flex: 1;">
                    <input type="text" name="longitude" placeholder="Longitude" style="flex: 1;">
                </div>
            </div>
        `;
    } else if (entityType === 'asset') {
        const { data: spaces } = await supabase.from('spaces').select('id, name').order('name');
        const { data: assetTypes } = await supabase.from('asset_types').select('id, name').order('name');
        const { data: properties } = await supabase.from('properties').select('id, name').order('name');
        
        let spaceOptions = '<option value="">Select Space</option>';
        if (spaces) {
            spaces.forEach(space => {
                spaceOptions += `<option value="${space.id}">${escapeHtml(space.name)}</option>`;
            });
        }
        
        let typeOptions = '<option value="">Select Asset Type</option>';
        if (assetTypes) {
            assetTypes.forEach(type => {
                typeOptions += `<option value="${type.id}">${escapeHtml(type.name)}</option>`;
            });
        }
        
        let propOptions = '<option value="">Select Property</option>';
        if (properties) {
            properties.forEach(prop => {
                propOptions += `<option value="${prop.id}">${escapeHtml(prop.name)}</option>`;
            });
        }
        
        formHTML = `
            <div class="form-group">
                <label>Name *</label>
                <input type="text" name="name" required placeholder="Asset name">
            </div>
            <div class="form-group">
                <label>Space</label>
                <select name="space_id">${spaceOptions}</select>
            </div>
            <div class="form-group">
                <label>Asset Type</label>
                <select name="asset_type_id">${typeOptions}</select>
            </div>
            <div class="form-group">
                <label>Property</label>
                <select name="property_id">${propOptions}</select>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="description" rows="3" placeholder="Asset description"></textarea>
            </div>
            <div class="form-group">
                <label>Coordinates</label>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" name="latitude" placeholder="Latitude" style="flex: 1;">
                    <input type="text" name="longitude" placeholder="Longitude" style="flex: 1;">
                </div>
            </div>
        `;
    } else if (entityType === 'space_type' || entityType === 'asset_type') {
        formHTML = `
            <div class="form-group">
                <label>Name *</label>
                <input type="text" name="name" required placeholder="Type name">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="description" rows="3" placeholder="Type description"></textarea>
            </div>
        `;
    }
    
    formHTML += '<button type="submit" class="btn-submit" style="width: 100%; margin-top: 1rem;">Save</button>';
    form.innerHTML = formHTML;
    modal.style.display = 'block';
}

// Handle form submit
async function handleDbFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
        if (value.trim()) {
            if (key === 'latitude' || key === 'longitude') {
                data[key] = parseFloat(value) || null;
            } else if (key.includes('_id')) {
                data[key] = value || null;
            } else {
                data[key] = value.trim();
            }
        }
    }
    
    try {
        const tableName = currentDbTab;
        let result;
        
        if (currentEditId) {
            result = await supabase.from(tableName).update(data).eq('id', currentEditId);
        } else {
            result = await supabase.from(tableName).insert([data]);
        }
        
        if (result.error) {
            throw result.error;
        }
        
        alert(currentEditId ? 'Item updated successfully!' : 'Item created successfully!');
        closeDbFormModal();
        loadDbData(tableName);
    } catch (error) {
        console.error('Error saving:', error);
        alert('Error saving: ' + error.message);
    }
}

// Edit item
async function editDbItem(tableName, id) {
    currentEditId = id;
    
    const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
    
    if (error || !data) {
        alert('Error loading item: ' + (error?.message || 'Item not found'));
        return;
    }
    
    const modal = document.getElementById('db-form-modal');
    const form = document.getElementById('db-form');
    const title = document.getElementById('db-form-title');
    
    const entityNames = {
        'organizations': 'Organization',
        'properties': 'Property',
        'spaces': 'Space',
        'assets': 'Asset',
        'space_types': 'Space Type',
        'asset_types': 'Asset Type'
    };
    
    title.textContent = `Edit ${entityNames[tableName]}`;
    
    // Rebuild form with data
    await showAddForm(tableName.replace('s', '').replace('_', '_').replace('ies', 'y').replace('types', 'type'));
    
    // Populate form fields
    setTimeout(() => {
        Object.keys(data).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = data[key] || '';
            }
        });
    }, 100);
    
    modal.style.display = 'block';
}

// Delete item
async function deleteDbItem(tableName, id) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }
    
    try {
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        
        if (error) {
            throw error;
        }
        
        alert('Item deleted successfully!');
        loadDbData(tableName);
    } catch (error) {
        console.error('Error deleting:', error);
        alert('Error deleting: ' + error.message);
    }
}

// Delete media
async function deleteMedia(mediaId) {
    if (!confirm('Are you sure you want to delete this media?')) {
        return;
    }
    
    try {
        const { error } = await supabase.from('location_media').delete().eq('id', mediaId);
        
        if (error) {
            throw error;
        }
        
        alert('Media deleted successfully!');
        loadDbData('media');
    } catch (error) {
        console.error('Error deleting media:', error);
        alert('Error deleting media: ' + error.message);
    }
}

// Close form modal
function closeDbFormModal() {
    const modal = document.getElementById('db-form-modal');
    if (modal) {
        modal.style.display = 'none';
        currentEditId = null;
    }
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

