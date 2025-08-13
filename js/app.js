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
        this.currentTimeRange = null; // Track current time range for banner
        
        // Greece and Cyprus bounds
        this.greeceBounds = {
            north: 41.75,
            south: 34.5,
            east: 34.8, // Extended to include Cyprus (was 29.65)
            west: 19.5
        };

        // Initialize the application
        this.init();
    }

    async init() {
        try {
            this.apiService.init(); // Initialize API service
            
            // Initialize language management if available
            if (typeof LanguageManager !== 'undefined') {
                this.languageManager = new LanguageManager();
            } else {
                console.warn('LanguageManager not available, continuing without language support');
                this.languageManager = null;
            }
            
            this.setupEventListeners();
            this.initializeMap();
            this.setupMobileLayout(); // Setup mobile-specific UI
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
                // Use currentTarget to always get the button element, not the clicked child element
                const tabName = e.currentTarget.dataset.tab;
                if (tabName) {
                    this.switchTab(tabName);
                }
            });
        });

        // Beta disclaimer close button
        const betaClose = document.getElementById('beta-close');
        if (betaClose) {
            betaClose.addEventListener('click', () => {
                this.closeBetaDisclaimer();
            });
        }

        // Map controls toggle button (mobile)
        const controlsToggle = document.getElementById('controls-toggle');
        if (controlsToggle) {
            controlsToggle.addEventListener('click', () => {
                this.toggleMapControls();
            });
        }

        // Update schedule display is handled in setupUpdateScheduleDisplay method

        // Fire info panel
        document.getElementById('close-panel').addEventListener('click', () => {
            this.hideFireInfoPanel();
        });

        // Legend close button
        const legendClose = document.getElementById('legend-close');
        if (legendClose) {
            legendClose.addEventListener('click', () => {
                this.hideLegend();
            });
        }

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
        
        // Listen for language changes
        document.addEventListener('languageChanged', (e) => {
            this.onLanguageChanged(e.detail.language);
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
        // No backend API to check anymore - using static files and GitHub Actions
        console.log('Application initialized with static data files');
    }

    async loadFireData() {
        this.showLoading('Loading fire data...');

        try {
            // Check data status first
            const status = await this.apiService.getDataStatus();
            
            const sources = ['MODIS_NRT', 'VIIRS_SNPP_NRT']; // Use both MODIS and VIIRS data
            let days = parseFloat(document.getElementById('time-filter').value);
            const confidence = document.getElementById('confidence-filter').value;
            
            // Implement cascading time range logic
            const { adjustedDays, actualRange } = await this.cascadeTimeRange(sources, days, confidence);
            
            // Use frontend API service for direct calls to NASA FIRMS
            const data = await this.apiService.getFireData(sources, adjustedDays, confidence);
            this.activeFires = data.fires || [];
            
            // Check if we're using fallback data and show warning
            if (status && (status.using_fallback_data || status.status === 'fallback')) {
                this.showNASAApiWarning(status.message || 'NASA FIRMS API temporarily unavailable - displaying last known fire data');
            } else if (status && status.status === 'error') {
                this.showNASAApiWarning(status.message || 'Fire data system error - existing data preserved if available');
            } else {
                this.hideNASAApiWarning();
            }
            
            // Update the time range banner
            this.updateTimeRangeBanner(actualRange);

            // Store fires in database if available
            if (window.fireDB) {
                await window.fireDB.bulkAddFires(this.activeFires);
            }

            this.displayFireMarkers();
            this.updateStats(data.timestamp);
            
            console.log(`Loaded ${this.activeFires.length} fires from ${data.sources.join(', ')} (${actualRange})`);
            this.showNotification(`Loaded ${this.activeFires.length} fires from ${data.sources.join(', ')} (${actualRange})`);
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
                    if (['latitude', 'longitude', 'brightness', 'scan', 'track', 'frp'].includes(header)) {
                        const numValue = parseFloat(value);
                        fire[header] = isNaN(numValue) ? null : numValue;
                    } else if (header === 'confidence') {
                        // Handle both numeric and letter confidence values
                        if (value === 'n' || value === 'N') {
                            fire[header] = 80; // Nominal - high confidence
                        } else if (value === 'l' || value === 'L') {
                            fire[header] = 30; // Low confidence
                        } else if (value === 'h' || value === 'H') {
                            fire[header] = 100; // High confidence
                        } else {
                            const numValue = parseFloat(value);
                            fire[header] = isNaN(numValue) ? null : numValue;
                        }
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
        
        // Different icons based on data source and confidence
        const isViirs = dataSource.includes('VIIRS');
        let iconUrl, iconClass;
        
        // Icon system:
        // 1. Red fire PNG for MODIS fires (≥50% confidence)
        // 2. Warning emoji for low confidence fires from both sources (<50%)
        // 3. Yellow fire PNG for VIIRS (≥50% confidence)
        
        if (isViirs) {
            // VIIRS data
            if (confidence >= 50) {
                iconUrl = './media/fire_yellow.png'; // Yellow fire for VIIRS
                iconClass = 'fire-viirs-icon';
                size = confidence >= 80 ? 32 : 28;
            } else {
                // Use emoji for low confidence
                emoji = '⚠️';
                iconClass = 'fire-low-confidence';
                size = 20;
            }
        } else {
            // MODIS data
            if (confidence >= 50) {
                iconUrl = './media/fire_red.png'; // Red fire for MODIS
                iconClass = 'fire-modis-icon';
                size = confidence >= 80 ? 32 : 28;
            } else {
                // Use emoji for low confidence
                emoji = '⚠️';
                iconClass = 'fire-low-confidence';
                size = 20;
            }
        }

        let markerIcon;
        
        if (iconUrl) {
            // Use PNG icon for high confidence fires
            markerIcon = L.icon({
                iconUrl: iconUrl,
                iconSize: [size, size],
                iconAnchor: [size/2, size/2],
                popupAnchor: [0, -size/2],
                className: iconClass
            });
        } else {
            // Use emoji for low confidence fires
            markerIcon = L.divIcon({
                className: 'fire-emoji-marker',
                html: `<span style="font-size: ${size}px; cursor: pointer; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); display: block; background: transparent;">${emoji}</span>`,
                iconSize: [size, size],
                iconAnchor: [size/2, size/2],
                popupAnchor: [0, -size/2]
            });
        }

        const marker = L.marker([fire.latitude, fire.longitude], {
            icon: markerIcon
        });

        // Add click/touch events for mobile compatibility
        marker.on('click', (e) => {
            e.originalEvent.preventDefault();
            this.showFireInfo(fire);
        });
        
        // Add touchend event for better mobile support
        marker.on('touchend', (e) => {
            e.originalEvent.preventDefault();
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
        const confidenceClass = this.getConfidenceClass(fire.confidence || 0);
        const detectionTime = this.formatFireTime(fire.acq_date, fire.acq_time);
        const coordinates = `${(fire.latitude || 0).toFixed(4)}°N, ${(fire.longitude || 0).toFixed(4)}°E`;
        
        // Format location to show both place name and coordinates
        let location;
        if (locationName && locationName !== coordinates) {
            location = `${locationName}<br><small style="color: #8b98a5;">${coordinates}</small>`;
        } else {
            location = coordinates;
        }
        
        const t = this.languageManager ? this.languageManager.t.bind(this.languageManager) : (key) => key;
        
        return `
            <div class="fire-details">
                <div class="fire-detail">
                    <label>${t('location')}</label>
                    <span>${location}</span>
                </div>
                
                <div class="fire-detail">
                    <label>${t('detection-time')}</label>
                    <span>${detectionTime}</span>
                </div>
                
                <div class="fire-detail">
                    <label>${t('confidence-level')}</label>
                    <span class="confidence-badge confidence-${confidenceClass}">${fire.confidence !== null && fire.confidence !== undefined ? Math.round(fire.confidence) : 'Unknown'}%</span>
                </div>
                
                <div class="fire-detail">
                    <label>${t('brightness-temperature')}</label>
                    <span>${(fire.brightness || 0).toFixed(1)}K</span>
                </div>
                
                <div class="fire-detail">
                    <label>${t('fire-radiative-power')}</label>
                    <span>${(fire.frp || 0).toFixed(1)} MW</span>
                </div>
                
                <div class="fire-detail">
                    <label>${t('data-source')}</label>
                    <span>${fire.data_source || fire.satellite || 'Unknown'}</span>
                </div>
                
                <div class="fire-detail">
                    <label>${t('satellite')}</label>
                    <span>${fire.satellite} (${fire.instrument})</span>
                </div>
                
                <div class="fire-detail">
                    <label>${t('data-version')}</label>
                    <span>${fire.version}</span>
                </div>

                <div class="accuracy-alert">
                    <h5>${t('accuracy-information')}</h5>
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
        
        const locale = this.languageManager && this.languageManager.currentLanguage === 'el' ? 'el-GR' : 'en-GB';
        const greeceDateTime = utcDateTime.toLocaleString(locale, options);
        const timeLabel = this.languageManager ? this.languageManager.t('greece-time') : 'Greece Time';
        
        // Format as: DD/MM/YYYY, HH:MM:SS (Greece Time)
        return `${greeceDateTime} (${timeLabel})`;
    }

    getAccuracyAlert(fire) {
        const confidence = fire.confidence;
        const frp = fire.frp;
        const t = this.languageManager ? this.languageManager.t.bind(this.languageManager) : (key) => key;
        
        if (confidence >= 80 && frp > 10) {
            return this.languageManager && this.languageManager.currentLanguage === 'el' 
                ? "⭐ Ανίχνευση υψηλής βεβαιότητας με ισχυρό σήμα φωτιάς. Αυτή είναι πιθανώς μια ενεργή πυρκαγιά."
                : "⭐ High confidence detection with strong fire signal. This is likely an active fire.";
        } else if (confidence >= 50) {
            return this.languageManager && this.languageManager.currentLanguage === 'el'
                ? "⚠️ Ανίχνευση μεσαίας βεβαιότητας. Μπορεί να είναι ενεργή πυρκαγιά ή καυτή επιφάνεια. Συνιστάται επαλήθευση από το έδαφος."
                : "⚠️ Medium confidence detection. May be an active fire or hot surface. Ground verification recommended.";
        } else {
            return this.languageManager && this.languageManager.currentLanguage === 'el'
                ? "❓ Ανίχνευση χαμηλής βεβαιότητας. Θα μπορούσε να είναι φωτιά, αλλά μπορεί επίσης να είναι καυτή βιομηχανική δραστηριότητα, φλόγες αερίου ή θόρυβος αισθητήρα."
                : "❓ Low confidence detection. Could be a fire, but may also be hot industrial activity, gas flares, or sensor noise.";
        }
    }

    hideFireInfoPanel() {
        document.getElementById('fire-info-panel').classList.remove('active');
    }

    hideLegend() {
        const legend = document.querySelector('.map-legend');
        if (legend) {
            legend.classList.add('hidden');
        }
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

    setupMobileLayout() {
        // Check if we're on a mobile device
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            console.log('🔧 Setting up mobile layout - hiding UI elements');
            
            // FORCE HIDE ALL UI elements on mobile
            const elementsToHide = [
                '.beta-disclaimer',
                '.disclaimer-banner', 
                '.map-controls',
                '.map-legend',
                '.fire-info-panel',
                '.time-range-banner',
                '#time-range-banner',
                '.notification',
                '.banner',
                '.cookie-consent-banner',
                '.loading-overlay'
            ];
            
            elementsToHide.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    element.style.display = 'none';
                    element.style.visibility = 'hidden';
                    element.style.opacity = '0';
                    element.style.position = 'absolute';
                    element.style.top = '-10000px';
                    element.style.left = '-10000px';
                    element.style.zIndex = '-999999';
                });
            });
            
            // Also hide any elements with these classes that get created later
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            elementsToHide.forEach(selector => {
                                if (node.matches && node.matches(selector)) {
                                    this.hideMobileElement(node);
                                }
                                // Also check children
                                const children = node.querySelectorAll ? node.querySelectorAll(selector) : [];
                                children.forEach(child => this.hideMobileElement(child));
                            });
                        }
                    });
                });
            });
            
            observer.observe(document.body, { childList: true, subtree: true });
        }
        
        // Listen for orientation changes and resize events
        window.addEventListener('resize', () => {
            this.handleResponsiveChanges();
        });
        
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleResponsiveChanges();
            }, 100);
        });
    }
    
    hideMobileElement(element) {
        // Helper method to completely hide elements on mobile
        if (window.innerWidth <= 768) {
            element.style.display = 'none';
            element.style.visibility = 'hidden';
            element.style.opacity = '0';
            element.style.position = 'absolute';
            element.style.top = '-10000px';
            element.style.left = '-10000px';
            element.style.zIndex = '-999999';
        }
    }
    
    handleResponsiveChanges() {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Re-apply mobile layout on orientation change
            this.setupMobileLayout();
        }
        
        const mapControls = document.querySelector('.map-controls');
        
        if (isMobile && mapControls && !mapControls.classList.contains('collapsed')) {
            // Auto-collapse controls when switching to mobile view
            mapControls.classList.add('collapsed');
            const toggleIcon = document.querySelector('#controls-toggle i');
            if (toggleIcon) {
                toggleIcon.className = 'fas fa-chevron-up';
            }
        }
    }
    
    onLanguageChanged(language) {
        // Update any dynamic content that might not be caught by data-i18n
        console.log(`🔄 Updating dynamic content for language: ${language}`);
        
        // Update fire info panel placeholder text
        const panelContent = document.getElementById('panel-content');
        if (panelContent && panelContent.children.length === 1 && panelContent.textContent.includes('Click on a fire')) {
            const t = this.languageManager.t.bind(this.languageManager);
            panelContent.innerHTML = `<p>${t('click-fire-marker')}</p>`;
        }
        
        // Update time range banner text with debouncing to prevent rapid updates
        if (this.currentTimeRange) {
            clearTimeout(this.bannerUpdateTimeout);
            this.bannerUpdateTimeout = setTimeout(() => {
                this.updateTimeRangeBanner(this.currentTimeRange);
            }, 100); // Small delay to prevent rapid updates
        }
        
        // Update update schedule display
        this.updateScheduleText();
        
        // If historical tab is active, refresh the table headers and stats
        if (this.currentTab === 'historical') {
            this.refreshHistoricalLabels();
        }
    }
    
    updateScheduleText() {
        const updateElement = document.getElementById('next-update');
        if (updateElement && this.languageManager) {
            const t = this.languageManager.t.bind(this.languageManager);
            updateElement.textContent = t('next-update');
        }
    }
    
    refreshHistoricalLabels() {
        // Refresh stats labels
        const t = this.languageManager.t.bind(this.languageManager);
        
        // Update stat cards that might not be properly translated
        const totalLabel = document.querySelector('#total-historical').nextElementSibling;
        const avgDailyLabel = document.querySelector('#avg-daily').nextElementSibling;
        const avgIntensityLabel = document.querySelector('#avg-intensity').nextElementSibling;
        
        if (totalLabel && totalLabel.dataset.i18n === 'total-fires') {
            totalLabel.textContent = t('total-fires');
        }
        if (avgDailyLabel && avgDailyLabel.dataset.i18n === 'avg-daily') {
            avgDailyLabel.textContent = t('avg-daily');
        }
        if (avgIntensityLabel && avgIntensityLabel.dataset.i18n === 'avg-intensity') {
            avgIntensityLabel.textContent = t('avg-intensity');
        }
    }

    toggleMapControls() {
        const mapControls = document.querySelector('.map-controls');
        const toggleIcon = document.querySelector('#controls-toggle i');
        
        if (mapControls && toggleIcon) {
            const isCurrentlyCollapsed = mapControls.classList.contains('collapsed');
            
            if (isCurrentlyCollapsed) {
                // Expanding controls
                mapControls.classList.remove('collapsed');
                mapControls.classList.add('user-expanded');
                toggleIcon.className = 'fas fa-chevron-down';
            } else {
                // Collapsing controls
                mapControls.classList.add('collapsed');
                mapControls.classList.remove('user-expanded');
                toggleIcon.className = 'fas fa-chevron-up';
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
        const message = this.languageManager ? this.languageManager.t('fire-data-refreshed') : 'Fire data refreshed successfully!';
        this.showNotification(message);
    }



    showLoading(message = null) {
        const overlay = document.getElementById('loading-overlay');
        const text = overlay.querySelector('p');
        const defaultMessage = this.languageManager ? this.languageManager.t('loading') : 'Loading...';
        text.textContent = message || defaultMessage;
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
        const cacheKey = `${(lat || 0).toFixed(4)},${(lon || 0).toFixed(4)}`;
        
        // Check cache first
        if (this.geocodeCache.has(cacheKey)) {
            return this.geocodeCache.get(cacheKey);
        }
        
        // Fallback coordinates
        const fallback = `${(lat || 0).toFixed(4)}, ${(lon || 0).toFixed(4)}`;
        
        try {
            // Try to get location name using OpenStreetMap Nominatim API
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1&accept-language=en`,
                {
                    headers: {
                        'User-Agent': 'PirkagiesGr-Fire-Monitor/1.0'
                    }
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                
                if (data && data.address) {
                    const address = data.address;
                    let locationName = '';
                    
                    // Build location name from available components
                    if (address.village || address.town || address.city) {
                        locationName = address.village || address.town || address.city;
                    } else if (address.municipality) {
                        locationName = address.municipality;
                    } else if (address.county) {
                        locationName = address.county;
                    } else if (address.state) {
                        locationName = address.state;
                    }
                    
                    // Add region if available and different
                    if (address.state && locationName !== address.state) {
                        locationName += `, ${address.state}`;
                    }
                    
                    // If we got a location name, cache and return it
                    if (locationName) {
                        this.geocodeCache.set(cacheKey, locationName);
                        return locationName;
                    }
                }
            }
        } catch (error) {
            console.warn('Geocoding failed:', error);
        }
        
        // Cache and return fallback
        this.geocodeCache.set(cacheKey, fallback);
        return fallback;
    }

    async cascadeTimeRange(sources, originalDays, confidence) {
        // Try the original time range first
        let data = await this.apiService.getFireData(sources, originalDays, confidence);
        
        if (data.fires && data.fires.length > 0) {
            return {
                adjustedDays: originalDays,
                actualRange: this.getTimeRangeLabel(originalDays)
            };
        }
        
        // Define cascade sequence: 1h -> 24h -> 3d -> 7d
        const cascadeSequence = [
            { days: 0.04, label: 'Last Hour' },
            { days: 1, label: 'Last 24 Hours' },
            { days: 3, label: 'Last 3 Days' },
            { days: 7, label: 'Last 7 Days' }
        ];
        
        // Start from the next range after the original
        let startIndex = cascadeSequence.findIndex(r => r.days === originalDays);
        if (startIndex === -1) startIndex = 0;
        
        for (let i = startIndex + 1; i < cascadeSequence.length; i++) {
            const range = cascadeSequence[i];
            data = await this.apiService.getFireData(sources, range.days, confidence);
            
            if (data.fires && data.fires.length > 0) {
                // Update the time filter dropdown to reflect the actual range used
                document.getElementById('time-filter').value = range.days.toString();
                
                return {
                    adjustedDays: range.days,
                    actualRange: range.label
                };
            }
        }
        
        // If no fires found in any range, return the last attempted range
        const lastRange = cascadeSequence[cascadeSequence.length - 1];
        document.getElementById('time-filter').value = lastRange.days.toString();
        
        return {
            adjustedDays: lastRange.days,
            actualRange: lastRange.label
        };
    }

    getTimeRangeLabel(days) {
        const t = this.languageManager ? this.languageManager.t.bind(this.languageManager) : (key) => {
            // Fallback translations if LanguageManager is not available
            const fallbacks = {
                'last-hour': 'Last Hour',
                'last-24-hours': 'Last 24 Hours', 
                'last-3-days': 'Last 3 Days',
                'last-week': 'Last 7 Days'
            };
            return fallbacks[key] || key;
        };
        
        if (days <= 0.04) return t('last-hour');
        if (days <= 1) return t('last-24-hours');
        if (days <= 3) return t('last-3-days');
        return t('last-week');
    }

    updateTimeRangeBanner(timeRange) {
        this.currentTimeRange = timeRange;
        
        // Find or create the banner
        let banner = document.getElementById('time-range-banner');
        if (!banner) {
            banner = this.createTimeRangeBanner();
        }
        
        // Update banner content with translation - avoid layout shifts
        const bannerText = banner.querySelector('.time-range-text');
        if (bannerText) {
            const t = this.languageManager ? this.languageManager.t.bind(this.languageManager) : (key) => key;
            const showingText = this.languageManager ? t('showing-data-for') : 'Showing fire data for:';
            
            // Use a smooth transition by temporarily disabling transitions during text update
            banner.style.transition = 'none';
            bannerText.textContent = `${showingText} ${timeRange}`;
            
            // Force a reflow and re-enable transitions
            banner.offsetHeight; // Trigger reflow
            banner.style.transition = '';
        }
        
        // Show the banner with proper transition
        requestAnimationFrame(() => {
            banner.classList.add('show');
        });
    }

    createTimeRangeBanner() {
        // Check if banner already exists to prevent duplication
        let existingBanner = document.getElementById('time-range-banner');
        if (existingBanner) {
            return existingBanner;
        }
        
        const banner = document.createElement('div');
        banner.id = 'time-range-banner';
        banner.className = 'time-range-banner';
        
        // Create the content with proper structure
        const content = document.createElement('div');
        content.className = 'time-range-content';
        
        const icon = document.createElement('i');
        icon.className = 'fas fa-clock';
        
        const text = document.createElement('span');
        text.className = 'time-range-text';
        text.textContent = 'Loading...'; // Placeholder text
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'time-range-close';
        closeBtn.title = 'Dismiss';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.onclick = () => banner.classList.remove('show');
        
        content.appendChild(icon);
        content.appendChild(text);
        content.appendChild(closeBtn);
        banner.appendChild(content);
        
        // Insert after the disclaimer banner (the new location in the updated HTML)
        const disclaimerBanner = document.querySelector('.disclaimer-banner');
        if (disclaimerBanner) {
            disclaimerBanner.parentNode.insertBefore(banner, disclaimerBanner.nextSibling);
        } else {
            // Fallback: insert after beta disclaimer
            const betaDisclaimer = document.querySelector('.beta-disclaimer');
            if (betaDisclaimer) {
                betaDisclaimer.parentNode.insertBefore(banner, betaDisclaimer.nextSibling);
            } else {
                // Last fallback: insert at the beginning of main content
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    mainContent.insertBefore(banner, mainContent.firstChild);
                }
            }
        }
        
        return banner;
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

    showNASAApiWarning(message) {
        // Remove existing warning if present
        this.hideNASAApiWarning();
        
        // Create warning banner
        const warningBanner = document.createElement('div');
        warningBanner.id = 'nasa-api-warning';
        warningBanner.className = 'nasa-api-warning';
        warningBanner.innerHTML = `
            <div class="nasa-warning-content">
                <i class="fas fa-exclamation-triangle"></i>
                <span class="warning-text">${message}</span>
                <button class="warning-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Add styles
        if (!document.getElementById('nasa-warning-styles')) {
            const style = document.createElement('style');
            style.id = 'nasa-warning-styles';
            style.textContent = `
                .nasa-api-warning {
                    background: linear-gradient(90deg, #ff6b35, #f39c12);
                    color: white;
                    padding: 0;
                    position: relative;
                    z-index: 1000;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                    animation: slideDown 0.3s ease-out;
                }
                .nasa-warning-content {
                    display: flex;
                    align-items: center;
                    padding: 12px 20px;
                    max-width: 1200px;
                    margin: 0 auto;
                    gap: 12px;
                }
                .nasa-api-warning i.fas {
                    font-size: 18px;
                    color: #fff;
                    flex-shrink: 0;
                }
                .warning-text {
                    flex: 1;
                    font-weight: 500;
                    font-size: 14px;
                    line-height: 1.4;
                }
                .warning-close {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 4px;
                    font-size: 16px;
                    opacity: 0.8;
                    transition: opacity 0.2s;
                    flex-shrink: 0;
                }
                .warning-close:hover {
                    opacity: 1;
                }
                @keyframes slideDown {
                    from { transform: translateY(-100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @media (max-width: 768px) {
                    .nasa-warning-content {
                        padding: 10px 15px;
                        gap: 10px;
                    }
                    .warning-text {
                        font-size: 13px;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Insert after header
        const header = document.querySelector('.header');
        if (header && header.nextSibling) {
            header.parentNode.insertBefore(warningBanner, header.nextSibling);
        } else {
            document.body.insertBefore(warningBanner, document.body.firstChild);
        }
    }
    
    hideNASAApiWarning() {
        const existingWarning = document.getElementById('nasa-api-warning');
        if (existingWarning) {
            existingWarning.remove();
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

    /* Time Range Banner Styles */
    .time-range-banner {
        background: linear-gradient(135deg, #4ecdc4, #44a08d);
        color: white;
        padding: 0;
        margin: 0;
        opacity: 0;
        transform: translateY(-20px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        border-left: 4px solid #2ecc71;
        box-shadow: 0 2px 10px rgba(78, 205, 196, 0.2);
        position: relative;
        overflow: hidden;
        min-height: 52px; /* Prevent collapse */
        display: flex;
        align-items: center;
    }

    .time-range-banner.show {
        opacity: 1;
        transform: translateY(0);
    }

    .time-range-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
        position: relative;
        width: 100%;
        min-height: 36px; /* Ensure consistent height */
    }

    .time-range-content i.fas.fa-clock {
        font-size: 1.1rem;
        color: rgba(255, 255, 255, 0.9);
        animation: pulse 2s ease-in-out infinite;
    }

    .time-range-text {
        font-weight: 500;
        font-size: 0.95rem;
        flex-grow: 1;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0; /* Allow flexbox to shrink */
    }

    .time-range-close {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.8);
        font-size: 1.1rem;
        cursor: pointer;
        padding: 0.25rem;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
    }

    .time-range-close:hover {
        background-color: rgba(255, 255, 255, 0.15);
        color: white;
        transform: scale(1.1);
    }

    @keyframes pulse {
        0%, 100% {
            opacity: 0.8;
        }
        50% {
            opacity: 1;
            transform: scale(1.05);
        }
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .time-range-banner {
            margin: 0;
            position: relative;
            z-index: 1000;
        }
        
        .time-range-content {
            padding: 0.75rem 0.875rem;
            gap: 0.5rem;
            flex-wrap: nowrap;
        }
        
        .time-range-text {
            font-size: 0.875rem;
            line-height: 1.4;
            word-break: break-word;
            white-space: normal; /* Allow wrapping on mobile */
            overflow: visible;
            text-overflow: unset;
        }
        
        .time-range-close {
            flex-shrink: 0;
            width: 24px;
            height: 24px;
        }
    }
    
    /* Tablet adjustments */
    @media (max-width: 1024px) and (min-width: 769px) {
        .time-range-banner {
            position: relative;
            z-index: 999;
        }
        
        .time-range-content {
            padding: 0.8rem 1rem;
        }
        
        .time-range-text {
            font-size: 0.9rem;
        }
    }
    
    /* Ensure banner is always visible above other content */
    .time-range-banner {
        position: relative;
        z-index: 998;
        width: 100%;
        box-sizing: border-box;
    }
`;
document.head.appendChild(style);
