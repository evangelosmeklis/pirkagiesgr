// Main application logic for PirkagiesGr
class GreeceFierAlert {
    constructor() {
        this.map = null;
        this.fireMarkers = [];
        this.activeFires = [];
        this.refreshInterval = null;
        this.currentTab = 'live';
        this.geocodeCache = new Map(); // Cache for location names
        this.apiService = new APIService(); // Frontend API service
        
        // Greece bounds
        this.greeceBounds = {
            north: 41.75,
            south: 34.5,
            east: 29.65,
            west: 19.5
        };

        // Initialize the application
        this.init();
    }

    async init() {
        try {
            this.apiService.init(); // Initialize API service
            this.setupEventListeners();
            this.initializeMap();
            await this.loadSettings();
            await this.loadFireData();
            this.setupUpdateScheduleDisplay();
            this.setupCookieConsent();
            this.checkBetaDisclaimer();
            this.hideLoading();
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to initialize application. Please check your settings.');
        }
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Beta disclaimer close button
        const betaClose = document.getElementById('beta-close');
        if (betaClose) {
            betaClose.addEventListener('click', () => {
                this.closeBetaDisclaimer();
            });
        }

        // Update schedule display is handled in setupUpdateScheduleDisplay method

        // Fire info panel
        document.getElementById('close-panel').addEventListener('click', () => {
            this.hideFireInfoPanel();
        });

        // Map controls
        const confidenceFilter = document.getElementById('confidence-filter');
        if (confidenceFilter) {
            confidenceFilter.addEventListener('change', () => {
                this.filterFireMarkers();
            });
        }

        const timeFilter = document.getElementById('time-filter');
        if (timeFilter) {
            timeFilter.addEventListener('change', () => {
                this.refreshFireData();
            });
        }

        // Historical data controls
        const filterHistoricalBtn = document.getElementById('filter-historical');
        if (filterHistoricalBtn) {
            filterHistoricalBtn.addEventListener('click', () => {
                this.filterHistoricalData();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideFireInfoPanel();
            }
            if (e.key === 'r' && e.ctrlKey) {
                e.preventDefault();
                this.refreshFireData();
            }
        });
    }

    initializeMap() {
        // Initialize Leaflet map centered on Greece
        this.map = L.map('map', {
            center: [39.0742, 21.8243], // Center of Greece
            zoom: 7,
            maxZoom: 18,
            minZoom: 5
        });

        // Add satellite imagery as default and only layer
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Satellite imagery © Esri, NASA FIRMS fire data'
        }).addTo(this.map);

        // Restrict view to Greece area
        this.map.setMaxBounds([
            [this.greeceBounds.south - 2, this.greeceBounds.west - 2],
            [this.greeceBounds.north + 2, this.greeceBounds.east + 2]
        ]);

        // Add scale control
        L.control.scale().addTo(this.map);

        console.log('Map initialized successfully');
    }

    async loadSettings() {
        // Check backend API status
        try {
            const response = await fetch('/api/status');
            const status = await response.json();
            
            if (!status.nasa_firms_configured) {
                this.showNotification('NASA FIRMS API key not configured on server. Please update config.env file.', 'warning');
            }
            
            if (!status.openweather_configured) {
                console.warn('OpenWeather API key not configured - weather features will be limited');
            }
        } catch (error) {
            console.error('Failed to check API status:', error);
        }
    }

    async loadFireData() {
        this.showLoading('Loading fire data...');

        try {
            const sources = ['MODIS_NRT', 'VIIRS_SNPP_NRT']; // Use both MODIS and VIIRS data
            const days = parseFloat(document.getElementById('time-filter').value);
            const confidence = document.getElementById('confidence-filter').value;
            
            // Use frontend API service for direct calls to NASA FIRMS
            const data = await this.apiService.getFireData(sources, days, confidence);
            this.activeFires = data.fires || [];

            // Store fires in database if available
            if (window.fireDB) {
                await window.fireDB.bulkAddFires(this.activeFires);
            }

            this.displayFireMarkers();
            this.updateStats(data.timestamp);
            
            console.log(`Loaded ${this.activeFires.length} fires from ${data.sources.join(', ')}`);
            this.showNotification(`Loaded ${this.activeFires.length} fires from ${data.sources.join(', ')}`);
        } catch (error) {
            console.error('Failed to load fire data:', error);
            this.showError('Failed to load fire data: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length <= 1) return [];

        const headers = lines[0].split(',');
        const fires = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length === headers.length) {
                const fire = {};
                headers.forEach((header, index) => {
                    const value = values[index].trim();
                    
                    // Parse numeric values
                    if (['latitude', 'longitude', 'brightness', 'scan', 'track', 'frp', 'confidence'].includes(header)) {
                        fire[header] = parseFloat(value) || 0;
                    } else if (['acq_time'].includes(header)) {
                        fire[header] = parseInt(value) || 0;
                    } else {
                        fire[header] = value;
                    }
                });
                fires.push(fire);
            }
        }

        return fires;
    }

    displayFireMarkers() {
        // Clear existing markers
        this.clearFireMarkers();

        // Add new markers
        this.activeFires.forEach(fire => {
            const marker = this.createFireMarker(fire);
            this.fireMarkers.push(marker);
            marker.addTo(this.map);
        });

        this.filterFireMarkers();
        
        // Fit map to show all fires if there are any
        if (this.fireMarkers.length > 0) {
            const group = new L.featureGroup(this.fireMarkers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    createFireMarker(fire) {
        const confidence = fire.confidence;
        const dataSource = fire.data_source || fire.satellite || 'MODIS_NRT';
        let emoji = '🔥';
        let size = 30;
        
        // Different emojis based on data source and confidence
        const isViirs = dataSource.includes('VIIRS');
        
        // Simple 3-emoji system as requested:
        // 1. 🔥 Fire emoji for MODIS fires (≥50% confidence)
        // 2. ⚠️ Warning emoji for low confidence fires from both sources (<50%)
        // 3. 🟠 Orange emoji only for VIIRS (≥50% confidence)
        
        if (isViirs) {
            // VIIRS data
            if (confidence >= 50) {
                emoji = '🟠'; // VIIRS-specific emoji for all good detections
                size = confidence >= 80 ? 30 : 25;
            } else {
                emoji = '⚠️'; // Warning for low confidence VIIRS
                size = 20;
            }
        } else {
            // MODIS data
            if (confidence >= 50) {
                emoji = '🔥'; // Fire emoji for live MODIS fires
                size = confidence >= 80 ? 30 : 25;
            } else {
                emoji = '⚠️'; // Warning for low confidence MODIS
                size = 20;
            }
        }

        const markerIcon = L.divIcon({
            className: 'fire-emoji-marker',
            html: `<span style="font-size: ${size}px; cursor: pointer; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); display: block; background: transparent;">${emoji}</span>`,
            iconSize: [size, size],
            iconAnchor: [size/2, size/2],
            popupAnchor: [0, -size/2]
        });

        const marker = L.marker([fire.latitude, fire.longitude], {
            icon: markerIcon
        });

        // Add click event
        marker.on('click', () => {
            this.showFireInfo(fire);
        });

        // Add hover effect
        marker.on('mouseover', function() {
            const element = this.getElement();
            if (element && element.firstChild) {
                element.firstChild.style.transform = 'scale(1.2)';
                element.style.zIndex = '1000';
            }
        });

        marker.on('mouseout', function() {
            const element = this.getElement();
            if (element && element.firstChild) {
                element.firstChild.style.transform = 'scale(1)';
                element.style.zIndex = '';
            }
        });

        // Store fire data with marker
        marker.fireData = fire;

        return marker;
    }

    clearFireMarkers() {
        this.fireMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.fireMarkers = [];
    }

    filterFireMarkers() {
        const confidenceFilter = document.getElementById('confidence-filter').value;
        
        this.fireMarkers.forEach(marker => {
            const fire = marker.fireData;
            let show = true;

            // Apply confidence filter (simplified system)
            if (confidenceFilter !== 'all') {
                if (confidenceFilter === 'high' && fire.confidence < 50) show = false;
                else if (confidenceFilter === 'low' && fire.confidence >= 50) show = false;
            }

            if (show) {
                marker.addTo(this.map);
            } else {
                this.map.removeLayer(marker);
            }
        });
    }

    async showFireInfo(fire) {
        const panel = document.getElementById('fire-info-panel');
        const content = document.getElementById('panel-content');
        
        panel.classList.add('active');
        
        // Show basic fire information immediately (with coordinates as placeholder)
        const basicInfo = this.generateBasicFireInfo(fire);
        content.innerHTML = basicInfo;

        // Get location name and update the display
        try {
            const locationName = await this.getLocationName(fire.latitude, fire.longitude, fire);
            const updatedInfo = this.generateBasicFireInfo(fire, locationName);
            content.innerHTML = updatedInfo;
        } catch (error) {
            console.warn('Failed to get location name:', error);
        }

        // Load weather data asynchronously
        try {
            const weatherData = await window.weatherService.getWeatherForFire(
                fire.latitude, 
                fire.longitude
            );
            
            if (weatherData) {
                const locationName = await this.getLocationName(fire.latitude, fire.longitude, fire);
                const updatedInfo = this.generateBasicFireInfo(fire, locationName);
                const weatherHTML = window.weatherService.generateWeatherHTML(
                    weatherData, 
                    fire.latitude, 
                    fire.longitude
                );
                content.innerHTML = updatedInfo + weatherHTML;
            }
        } catch (error) {
            console.warn('Failed to load weather data:', error);
        }
    }

    generateBasicFireInfo(fire, locationName = null) {
        const confidenceClass = this.getConfidenceClass(fire.confidence);
        const detectionTime = this.formatFireTime(fire.acq_date, fire.acq_time);
        const coordinates = `${fire.latitude.toFixed(4)}°N, ${fire.longitude.toFixed(4)}°E`;
        
        // Format location to show both place name and coordinates
        let location;
        if (locationName && locationName !== coordinates) {
            location = `${locationName}<br><small style="color: #8b98a5;">${coordinates}</small>`;
        } else {
            location = coordinates;
        }
        
        return `
            <div class="fire-details">
                <div class="fire-detail">
                    <label>Location:</label>
                    <span>${location}</span>
                </div>
                
                <div class="fire-detail">
                    <label>Detection Time:</label>
                    <span>${detectionTime}</span>
                </div>
                
                <div class="fire-detail">
                    <label>Confidence Level:</label>
                    <span class="confidence-badge confidence-${confidenceClass}">${fire.confidence}%</span>
                </div>
                
                <div class="fire-detail">
                    <label>Brightness Temperature:</label>
                    <span>${fire.brightness.toFixed(1)}K</span>
                </div>
                
                <div class="fire-detail">
                    <label>Fire Radiative Power:</label>
                    <span>${fire.frp.toFixed(1)} MW</span>
                </div>
                
                <div class="fire-detail">
                    <label>Data Source:</label>
                    <span>${fire.data_source || fire.satellite || 'Unknown'}</span>
                </div>
                
                <div class="fire-detail">
                    <label>Satellite:</label>
                    <span>${fire.satellite} (${fire.instrument})</span>
                </div>
                
                <div class="fire-detail">
                    <label>Data Version:</label>
                    <span>${fire.version}</span>
                </div>

                <div class="accuracy-alert">
                    <h5>Accuracy Information</h5>
                    <p>${this.getAccuracyAlert(fire)}</p>
                </div>
            </div>
        `;
    }

    getConfidenceClass(confidence) {
        if (confidence >= 80) return 'high';
        if (confidence >= 50) return 'medium';
        return 'low';
    }

    formatFireTime(date, time) {
        const timeStr = time.toString().padStart(4, '0');
        const hours = timeStr.substring(0, 2);
        const minutes = timeStr.substring(2, 4);
        
        // Create UTC date object
        const utcDateTime = new Date(`${date}T${hours}:${minutes}:00Z`);
        
        // Convert to Greece time (Europe/Athens) 
        const options = {
            timeZone: 'Europe/Athens',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        
        const greeceDateTime = utcDateTime.toLocaleString('en-GB', options);
        
        // Format as: DD/MM/YYYY, HH:MM:SS (Greece Time)
        return `${greeceDateTime} (Greece Time)`;
    }

    getAccuracyAlert(fire) {
        const confidence = fire.confidence;
        const frp = fire.frp;
        
        if (confidence >= 80 && frp > 10) {
            return "⭐ High confidence detection with strong fire signal. This is likely an active fire.";
        } else if (confidence >= 50) {
            return "⚠️ Medium confidence detection. May be an active fire or hot surface. Ground verification recommended.";
        } else {
            return "❓ Low confidence detection. Could be a fire, but may also be hot industrial activity, gas flares, or sensor noise.";
        }
    }

    hideFireInfoPanel() {
        document.getElementById('fire-info-panel').classList.remove('active');
    }

    closeBetaDisclaimer() {
        const betaDisclaimer = document.querySelector('.beta-disclaimer');
        if (betaDisclaimer) {
            betaDisclaimer.classList.add('hidden');
            // Remember user's choice to hide beta disclaimer
            localStorage.setItem('beta_disclaimer_dismissed', 'true');
        }
    }

    checkBetaDisclaimer() {
        // Check if user has previously dismissed the beta disclaimer
        const dismissed = localStorage.getItem('beta_disclaimer_dismissed');
        if (dismissed === 'true') {
            const betaDisclaimer = document.querySelector('.beta-disclaimer');
            if (betaDisclaimer) {
                betaDisclaimer.classList.add('hidden');
            }
        }
    }

    updateStats(dataTimestamp = null) {
        const activeFiresCount = this.activeFires.length;
        
        // Use the actual data fetch timestamp, not current time
        let lastUpdateText = '--:--';
        if (dataTimestamp) {
            const dataTime = new Date(dataTimestamp);
            
            // Format in Greek timezone with proper DST handling
            const greekTime = dataTime.toLocaleTimeString('el-GR', { 
                hour12: false, 
                timeZone: 'Europe/Athens',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Determine if it's daylight saving time
            const isDST = this.isDaylightSavingTime(dataTime);
            const timezoneLabel = isDST ? 'EEST' : 'EET';
            
            lastUpdateText = `${greekTime} ${timezoneLabel}`;
        }
        
        document.getElementById('active-fires').textContent = activeFiresCount;
        document.getElementById('last-update').textContent = lastUpdateText;
    }

    // Helper function to determine if a date is in daylight saving time for Greece
    isDaylightSavingTime(date) {
        // Greece observes DST from last Sunday in March to last Sunday in October
        const year = date.getFullYear();
        
        // Get last Sunday in March
        const marchLastSunday = new Date(year, 2, 31); // March 31
        marchLastSunday.setDate(31 - marchLastSunday.getDay());
        
        // Get last Sunday in October  
        const octoberLastSunday = new Date(year, 9, 31); // October 31
        octoberLastSunday.setDate(31 - octoberLastSunday.getDay());
        
        // Check if date is within DST period
        return date >= marchLastSunday && date < octoberLastSunday;
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.currentTab = tabName;

        // Load tab-specific data
        if (tabName === 'historical') {
            this.loadHistoricalData();
        }
    }

    async loadHistoricalData() {
        try {
            // Show loading state
            this.showLoading();
            
            // Get 7 days of historical data from API (both MODIS and VIIRS)
            const data = await this.apiService.getFireData(['MODIS_NRT', 'VIIRS_SNPP_NRT'], 7, 'all');
            
            if (data.fires) {
                // Add location names for historical fires
                const firesWithLocations = await this.addLocationNamesToFires(data.fires);
                this.displayHistoricalFires(firesWithLocations);
                this.updateHistoricalStats(firesWithLocations);
            } else {
                throw new Error('No fire data received');
            }
            
            this.hideLoading();
        } catch (error) {
            console.error('Failed to load historical data:', error);
            this.showError('Failed to load historical fire data. Please try again.');
            this.hideLoading();
        }
    }

    async addLocationNamesToFires(fires) {
        // Process fires in smaller batches to avoid overwhelming the API
        const batchSize = 10;
        const result = [];
        
        for (let i = 0; i < fires.length; i += batchSize) {
            const batch = fires.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (fire) => {
                const locationName = await this.getLocationName(fire.latitude, fire.longitude);
                return { ...fire, locationName };
            });
            
            const batchResults = await Promise.all(batchPromises);
            result.push(...batchResults);
            
            // Small delay between batches to be nice to the API
            if (i + batchSize < fires.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return result;
    }

    displayHistoricalFires(fires) {
        const tbody = document.getElementById('historical-tbody');
        tbody.innerHTML = '';

        // Sort fires by date (newest first)
        const sortedFires = fires.sort((a, b) => new Date(b.acq_date) - new Date(a.acq_date));

        sortedFires.forEach(fire => {
            const row = document.createElement('tr');
            const coordinates = `${fire.latitude.toFixed(4)}°N, ${fire.longitude.toFixed(4)}°E`;
            
            // Format location to show both place name and coordinates
            let location;
            if (fire.locationName && fire.locationName !== coordinates) {
                location = `${fire.locationName}<br><small style="color: #8b98a5; font-size: 0.8em;">${coordinates}</small>`;
            } else {
                location = coordinates;
            }
            
            const detectionTime = this.formatFireTime(fire.acq_date, fire.acq_time);
            
            row.innerHTML = `
                <td>${detectionTime}</td>
                <td>${location}</td>
                <td><span class="confidence-badge confidence-${this.getConfidenceClass(fire.confidence)}">${fire.confidence}%</span></td>
                <td>${fire.brightness.toFixed(1)}K</td>
                <td>${fire.frp.toFixed(1)} MW</td>
                <td>${fire.satellite}</td>
            `;
            tbody.appendChild(row);
        });
    }

    updateHistoricalStats(fires) {
        const total = fires.length;
        const avgDaily = total > 0 ? (total / 7).toFixed(1) : 0; // Average per day over 7 days
        const avgIntensity = total > 0 ? (fires.reduce((sum, fire) => sum + fire.frp, 0) / total).toFixed(1) : 0;

        document.getElementById('total-historical').textContent = total;
        document.getElementById('avg-daily').textContent = avgDaily;
        document.getElementById('avg-intensity').textContent = avgIntensity + ' MW';
    }

    async filterHistoricalData() {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;

        if (!startDate || !endDate) {
            this.showNotification('Please select both start and end dates', 'warning');
            return;
        }

        // Check if date range is within last 7 days
        const today = new Date();
        const sevenDaysAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
        const selectedStart = new Date(startDate);
        const selectedEnd = new Date(endDate);

        if (selectedStart < sevenDaysAgo) {
            this.showNotification('Historical data is only available for the last 7 days', 'warning');
            return;
        }

        try {
            // Show loading state
            this.showLoading();
            
            // Get data and filter by date range (both MODIS and VIIRS)
            const data = await this.apiService.getFireData(['MODIS_NRT', 'VIIRS_SNPP_NRT'], 7, 'all');
            
            if (data.fires) {
                // Filter fires by date range
                const filteredFires = data.fires.filter(fire => {
                    const fireDate = new Date(fire.acq_date);
                    return fireDate >= selectedStart && fireDate <= selectedEnd;
                });
                
                // Add location names
                const firesWithLocations = await this.addLocationNamesToFires(filteredFires);
                this.displayHistoricalFires(firesWithLocations);
                this.updateHistoricalStats(firesWithLocations);
            }
            
            this.hideLoading();
        } catch (error) {
            console.error('Failed to filter historical data:', error);
            this.showError('Failed to filter historical data. Please try again.');
            this.hideLoading();
        }
    }



    setupUpdateScheduleDisplay() {
        // Display information about GitHub Action update schedule
        const updateElement = document.getElementById('next-update');
        if (updateElement) {
            // Get the last update time from the data
            this.apiService.loadStaticData('recent').then(data => {
                if (data && data.last_updated) {
                    const lastUpdate = new Date(data.last_updated);
                    const nextUpdate = new Date(lastUpdate.getTime() + 30 * 60 * 1000); // Add 30 minutes
                    const now = new Date();
                    
                    if (nextUpdate > now) {
                        const minutesUntilUpdate = Math.ceil((nextUpdate - now) / (1000 * 60));
                        updateElement.textContent = `Next update in ~${minutesUntilUpdate} minutes`;
                    } else {
                        updateElement.textContent = `Data updates every 30 minutes`;
                    }
                } else {
                    updateElement.textContent = `Data updates every 30 minutes`;
                }
            }).catch(() => {
                updateElement.textContent = `Data updates every 30 minutes`;
            });
        }
        
        console.log('GitHub Action updates fire data every 30 minutes automatically');
    }

    async refreshFireData() {
        await this.loadFireData();
        this.showNotification('Fire data refreshed successfully!');
    }



    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const text = overlay.querySelector('p');
        text.textContent = message;
        overlay.classList.add('active');
    }

    hideLoading() {
        document.getElementById('loading-overlay').classList.remove('active');
    }

    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ff6b6b' : type === 'warning' ? '#ffa500' : '#4ecdc4'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            z-index: 10001;
            display: flex;
            align-items: center;
            gap: 1rem;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    setupCookieConsent() {
        const banner = document.getElementById('cookie-consent-banner');
        const acceptBtn = document.getElementById('accept-cookies');
        const rejectBtn = document.getElementById('reject-cookies');
        
        // Check if user has already made a choice
        const consent = localStorage.getItem('analytics_consent');
        
        if (!consent) {
            // Show banner after a short delay
            setTimeout(() => {
                banner.classList.add('show');
            }, 2000);
        }
        
        // Accept cookies
        acceptBtn.addEventListener('click', () => {
            localStorage.setItem('analytics_consent', 'accepted');
            banner.classList.remove('show');
            
            // Enable Google Analytics
            if (window.enableAnalytics) {
                window.enableAnalytics();
            }
            
            this.showNotification('Analytics cookies accepted. This helps us improve the website.', 'success');
        });
        
        // Reject cookies
        rejectBtn.addEventListener('click', () => {
            localStorage.setItem('analytics_consent', 'rejected');
            banner.classList.remove('show');
            
            // Disable Google Analytics
            if (window.disableAnalytics) {
                window.disableAnalytics();
            }
            
            this.showNotification('Analytics cookies rejected. No tracking data will be collected.', 'success');
        });
    }

    async getLocationName(lat, lon, fire = null) {
        // If fire object has location_name, use it
        if (fire && fire.location_name) {
            return fire.location_name;
        }
        
        // Create cache key
        const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
        
        // Check cache first
        if (this.geocodeCache.has(cacheKey)) {
            return this.geocodeCache.get(cacheKey);
        }
        
        // Fallback to coordinates
        const fallback = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        this.geocodeCache.set(cacheKey, fallback);
        return fallback;
    }

    isFireOlderThanOneHour(fire) {
        try {
            // Parse the fire detection time
            const fireDate = fire.acq_date; // YYYY-MM-DD
            const fireTime = fire.acq_time.toString().padStart(4, '0'); // HHMM
            const hours = fireTime.substring(0, 2);
            const minutes = fireTime.substring(2, 4);
            
            // Create UTC date object for fire detection
            const fireDateTime = new Date(`${fireDate}T${hours}:${minutes}:00Z`);
            
            // Current time
            const now = new Date();
            
            // Calculate time difference in milliseconds
            const timeDiff = now - fireDateTime;
            
            // Convert to hours (1 hour = 3600000 milliseconds)
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            return hoursDiff > 1;
        } catch (error) {
            console.warn('Error calculating fire age:', error);
            return false; // Default to treating as live fire
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new GreeceFierAlert();
});

// Add some CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .notification button {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s;
    }

    .notification button:hover {
        background-color: rgba(255, 255, 255, 0.2);
    }

    .weather-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
        margin: 1rem 0;
    }

    .weather-item {
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
    }

    .weather-label {
        color: #666;
        font-weight: 500;
    }

    .weather-value {
        font-weight: 600;
        color: #333;
    }

    .fire-risk {
        background: rgba(255, 107, 107, 0.1);
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
    }

    .fire-risk h5 {
        margin: 0 0 0.5rem 0;
        font-size: 0.875rem;
    }

    .fire-risk p {
        margin: 0;
        font-size: 0.75rem;
        color: #666;
    }

    .accuracy-alert {
        background: rgba(29, 155, 240, 0.1);
        padding: 1rem;
        border-radius: 8px;
        margin-top: 1rem;
        border-left: 4px solid #1d9bf0;
    }

    .accuracy-alert h5 {
        margin: 0 0 0.5rem 0;
        color: #1d9bf0;
        font-size: 0.875rem;
    }

    .accuracy-alert p {
        margin: 0;
        font-size: 0.875rem;
        color: #e7e9ea;
        line-height: 1.4;
    }
`;
document.head.appendChild(style);
