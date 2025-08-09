// Main application logic for Greece Fire Alert
class GreeceFierAlert {
    constructor() {
        this.map = null;
        this.fireMarkers = [];
        this.activeFires = [];
        this.refreshInterval = null;
        this.currentTab = 'live';
        
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
            this.setupEventListeners();
            this.initializeMap();
            await this.loadSettings();
            await this.loadFireData();
            this.setupAutoRefresh();
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



        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshFireData();
        });

        // Fire info panel
        document.getElementById('close-panel').addEventListener('click', () => {
            this.hideFireInfoPanel();
        });

        // Map controls
        document.getElementById('confidence-filter').addEventListener('change', () => {
            this.filterFireMarkers();
        });

        document.getElementById('time-filter').addEventListener('change', () => {
            this.refreshFireData();
        });

        document.getElementById('source-filter').addEventListener('change', () => {
            this.refreshFireData();
        });

        // Historical data controls
        document.getElementById('filter-historical').addEventListener('click', () => {
            this.filterHistoricalData();
        });

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

        // Add beautiful tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add satellite imagery option
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles © Esri'
        });

        // Layer control
        const baseMaps = {
            "Street Map": this.map._layers[Object.keys(this.map._layers)[0]],
            "Satellite": satelliteLayer
        };

        L.control.layers(baseMaps).addTo(this.map);

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
            const source = document.getElementById('source-filter').value;
            const days = document.getElementById('time-filter').value;
            const confidence = document.getElementById('confidence-filter').value;
            
            // Call our backend API instead of NASA directly
            const url = `/api/fires?source=${source}&days=${days}&confidence=${confidence}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `API Error: ${response.status}`);
            }

            const data = await response.json();
            this.activeFires = data.fires || [];

            // Store fires in database
            await window.fireDB.bulkAddFires(this.activeFires);

            this.displayFireMarkers();
            this.updateStats();
            
            console.log(`Loaded ${this.activeFires.length} fires from ${data.source}`);
            this.showNotification(`Loaded ${this.activeFires.length} fires from ${data.source}`);
        } catch (error) {
            console.error('Failed to load fire data:', error);
            if (error.message.includes('NASA FIRMS API key not configured')) {
                this.showError('NASA FIRMS API key not configured on server. Please check config.env file.');
            } else {
                this.showError('Failed to load fire data: ' + error.message);
            }
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
        let confidenceClass = 'low-confidence';
        
        if (confidence >= 80) {
            confidenceClass = 'high-confidence';
        } else if (confidence >= 50) {
            confidenceClass = 'medium-confidence';
        }

        // Custom HTML marker
        const size = Math.max(8, Math.min(20, fire.frp / 5)); // Size based on Fire Radiative Power
        
        const markerIcon = L.divIcon({
            className: `fire-marker ${confidenceClass}`,
            html: '',
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
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
            this.getElement().style.transform = 'scale(1.3)';
        });

        marker.on('mouseout', function() {
            this.getElement().style.transform = 'scale(1)';
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

            // Apply confidence filter
            if (confidenceFilter !== 'all') {
                if (confidenceFilter === 'high' && fire.confidence < 80) show = false;
                else if (confidenceFilter === 'medium' && (fire.confidence < 50 || fire.confidence >= 80)) show = false;
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
        
        // Show basic fire information immediately
        const basicInfo = this.generateBasicFireInfo(fire);
        content.innerHTML = basicInfo;

        // Load weather data asynchronously
        try {
            const weatherData = await window.weatherService.getWeatherForFire(
                fire.latitude, 
                fire.longitude
            );
            
            if (weatherData) {
                const weatherHTML = window.weatherService.generateWeatherHTML(
                    weatherData, 
                    fire.latitude, 
                    fire.longitude
                );
                content.innerHTML = basicInfo + weatherHTML;
            }
        } catch (error) {
            console.warn('Failed to load weather data:', error);
        }
    }

    generateBasicFireInfo(fire) {
        const confidenceClass = this.getConfidenceClass(fire.confidence);
        const detectionTime = this.formatFireTime(fire.acq_date, fire.acq_time);
        
        return `
            <div class="fire-details">
                <div class="fire-detail">
                    <label>Location:</label>
                    <span>${fire.latitude.toFixed(4)}°N, ${fire.longitude.toFixed(4)}°E</span>
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
        return `${date} ${hours}:${minutes} UTC`;
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

    updateStats() {
        const activeFiresCount = this.activeFires.length;
        const lastUpdate = new Date().toLocaleTimeString();
        
        document.getElementById('active-fires').textContent = activeFiresCount;
        document.getElementById('last-update').textContent = lastUpdate;
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
        } else if (tabName === 'analytics') {
            this.loadAnalytics();
        }
    }

    async loadHistoricalData() {
        try {
            const fires = await window.fireDB.getAllFires();
            this.displayHistoricalFires(fires);
            this.updateHistoricalStats(fires);
        } catch (error) {
            console.error('Failed to load historical data:', error);
        }
    }

    displayHistoricalFires(fires) {
        const tbody = document.getElementById('historical-tbody');
        tbody.innerHTML = '';

        // Sort fires by date (newest first)
        const sortedFires = fires.sort((a, b) => new Date(b.acq_date) - new Date(a.acq_date));

        sortedFires.forEach(fire => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${fire.acq_date}</td>
                <td>${fire.latitude.toFixed(4)}°N, ${fire.longitude.toFixed(4)}°E</td>
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
        const avgDaily = total > 0 ? (total / 30).toFixed(1) : 0; // Rough estimate
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

        try {
            const fires = await window.fireDB.getFiresByDateRange(startDate, endDate);
            this.displayHistoricalFires(fires);
            this.updateHistoricalStats(fires);
        } catch (error) {
            console.error('Failed to filter historical data:', error);
        }
    }

    async loadAnalytics() {
        try {
            const stats = await window.fireDB.getFireStats();
            this.createCharts(stats);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    }

    createCharts(stats) {
        // Monthly fires chart
        this.createMonthlyChart(stats.byMonth);
        
        // Confidence distribution chart
        this.createConfidenceChart({
            high: stats.highConfidence,
            medium: stats.mediumConfidence,
            low: stats.lowConfidence
        });
    }

    createMonthlyChart(monthlyData) {
        const canvas = document.getElementById('monthly-chart');
        if (canvas.chart) {
            canvas.chart.destroy();
        }

        const ctx = canvas.getContext('2d');
        
        const labels = Object.keys(monthlyData).sort();
        const data = labels.map(month => monthlyData[month]);

        canvas.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Fires per Month',
                    data: data,
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Fire Activity by Month'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createConfidenceChart(confidenceData) {
        const canvas = document.getElementById('confidence-chart');
        if (canvas.chart) {
            canvas.chart.destroy();
        }

        const ctx = canvas.getContext('2d');

        canvas.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['High (80-100%)', 'Medium (50-79%)', 'Low (0-49%)'],
                datasets: [{
                    data: [confidenceData.high, confidenceData.medium, confidenceData.low],
                    backgroundColor: ['#ff6b6b', '#ffa500', '#4ecdc4']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Fire Detection Confidence Distribution'
                    }
                }
            }
        });
    }

    setupAutoRefresh() {
        // Clear existing interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        const intervalMinutes = parseInt(localStorage.getItem('refresh_interval') || '10');
        const intervalMs = intervalMinutes * 60 * 1000;

        this.refreshInterval = setInterval(() => {
            if (this.currentTab === 'live') {
                this.refreshFireData();
            }
        }, intervalMs);

        console.log(`Auto-refresh set to ${intervalMinutes} minutes`);
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
        background: rgba(102, 126, 234, 0.1);
        padding: 1rem;
        border-radius: 8px;
        margin-top: 1rem;
        border-left: 4px solid #667eea;
    }

    .accuracy-alert h5 {
        margin: 0 0 0.5rem 0;
        color: #667eea;
        font-size: 0.875rem;
    }

    .accuracy-alert p {
        margin: 0;
        font-size: 0.875rem;
        color: #333;
        line-height: 1.4;
    }
`;
document.head.appendChild(style);
