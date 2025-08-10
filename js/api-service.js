// Frontend API Service for GitHub Pages
// Uses static JSON files updated by GitHub Actions

class APIService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
        console.log('🔥 API Service initialized for GitHub Pages (static data)');
    }
    
    // Load static JSON data with caching
    async loadStaticData(datasetName) {
        const cacheKey = `static_${datasetName}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }
        
        try {
            const response = await fetch(`./data/${datasetName}_fires.json`);
            if (!response.ok) {
                throw new Error(`Failed to load ${datasetName} data: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            
            console.log(`📊 Loaded ${data.count} fires from ${datasetName} dataset`);
            return data;
            
        } catch (error) {
            console.error(`Failed to load ${datasetName} data:`, error);
            throw error;
        }
    }
    
    // Check data freshness
    async getDataStatus() {
        try {
            const response = await fetch('./data/status.json');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn('Could not load data status');
        }
        return null;
    }
    
    // Get fire data from static JSON files
    async getFireData(sources = ['MODIS_NRT', 'VIIRS_SNPP_NRT'], days = 1, confidence = 'all') {
        try {
            // Determine which dataset to use based on time period
            let datasetName;
            if (days <= 0.1) {
                datasetName = 'live'; // Last hour
            } else if (days <= 1) {
                datasetName = 'recent'; // Last 24 hours
            } else {
                datasetName = 'historical'; // Longer periods
            }
            
            const data = await this.loadStaticData(datasetName);
            let fires = data.fires || [];
            
            // Normalize confidence values first
            fires = fires.map(fire => {
                const normalizedFire = { ...fire };
                
                // Handle VIIRS confidence letters
                if (typeof fire.confidence === 'string') {
                    const confStr = fire.confidence.toLowerCase();
                    if (confStr === 'n') {
                        normalizedFire.confidence = 80; // Nominal - high confidence
                    } else if (confStr === 'l') {
                        normalizedFire.confidence = 30; // Low confidence
                    } else if (confStr === 'h') {
                        normalizedFire.confidence = 100; // High confidence
                    } else {
                        // Try to parse as number if it's a string number
                        const numValue = parseFloat(fire.confidence);
                        normalizedFire.confidence = isNaN(numValue) ? 50 : numValue;
                    }
                }
                
                return normalizedFire;
            });
            
            // Apply confidence filter
            if (confidence !== 'all') {
                if (confidence === 'high') {
                    fires = fires.filter(f => (f.confidence || 0) >= 50);
                } else if (confidence === 'low') {
                    fires = fires.filter(f => (f.confidence || 0) < 50);
                }
            }
            
            // Apply source filter if specific sources requested
            if (sources.length < 2) {
                fires = fires.filter(f => sources.includes(f.data_source));
            }
            
            console.log(`📊 API Service: Loaded ${fires.length} fires from ${datasetName} dataset`);
            
            return {
                fires: fires,
                count: fires.length,
                sources: sources,
                days: days,
                confidence_filter: confidence,
                timestamp: data.last_updated || new Date().toISOString(),
                data_source: 'static_files',
                dataset_used: datasetName
            };
            
        } catch (error) {
            console.error('Failed to load fire data:', error);
            // Return empty dataset on error
            return {
                fires: [],
                count: 0,
                sources: sources,
                days: days,
                confidence_filter: confidence,
                timestamp: new Date().toISOString(),
                error: error.message,
                dataset_used: 'error'
            };
        }
    }
    
    // Get location name from fire data (already included by GitHub Actions)
    async getLocationName(lat, lon) {
        // Return coordinates as fallback since location names are pre-fetched
        return {
            location: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
            coordinates: { lat, lon },
            timestamp: new Date().toISOString()
        };
    }
    
    // Placeholder for weather data (can be extended later)
    async getWeatherData(lat, lon) {
        return {
            current: { main: { temp: 'N/A' }, weather: [{ description: 'Weather data not available' }] },
            forecast: { list: [] },
            coordinates: { lat, lon },
            timestamp: new Date().toISOString()
        };
    }
    
    // Initialize the service
    init() {
        console.log('🔥 API Service initialized for GitHub Pages (static data)');
    }
}

// Export for use in main application
window.APIService = APIService;
