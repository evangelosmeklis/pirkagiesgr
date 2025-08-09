#!/usr/bin/env python3
"""
Greece Fire Alert Backend Server
Handles NASA FIRMS API calls securely with API keys stored in environment variables
"""

import os
import sys
import pandas as pd
import requests
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv('config.env')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Configuration
NASA_FIRMS_MAP_KEY = os.getenv('NASA_FIRMS_MAP_KEY')
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY')
FLASK_PORT = int(os.getenv('FLASK_PORT', 5000))

# Greece country code for NASA FIRMS API
GREECE_COUNTRY_CODE = 'GRC'

# Available data sources
DATA_SOURCES = [
    'MODIS_NRT',
    'VIIRS_SNPP_NRT', 
    'VIIRS_NOAA20_NRT',
    'VIIRS_NOAA21_NRT'
]

class FireDataService:
    """Service for handling NASA FIRMS fire data"""
    
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = 'https://firms.modaps.eosdis.nasa.gov/api'
        
    def check_api_status(self):
        """Check API key status and transaction limits"""
        try:
            url = f'{self.base_url}/mapserver/mapkey_status/?MAP_KEY={self.api_key}'
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to check API status: {e}")
            return None
            
    def get_data_availability(self):
        """Get available date ranges for different datasets"""
        try:
            url = f'{self.base_url}/data_availability/csv/{self.api_key}/all'
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            # Parse CSV data
            df = pd.read_csv(url)
            return df.to_dict('records')
        except Exception as e:
            logger.error(f"Failed to get data availability: {e}")
            return None
            
    def get_country_fires(self, source='MODIS_NRT', days=1):
        """Get fire data for Greece"""
        try:
            url = f'{self.base_url}/country/csv/{self.api_key}/{source}/{GREECE_COUNTRY_CODE}/{days}'
            
            logger.info(f"Fetching fire data from: {url}")
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            # Parse CSV data
            csv_text = response.text
            if not csv_text.strip():
                return []
                
            # Read CSV using pandas
            from io import StringIO
            df = pd.read_csv(StringIO(csv_text))
            
            # Convert to list of dictionaries
            fires = df.to_dict('records')
            
            # Add unique identifier for each fire
            for i, fire in enumerate(fires):
                fire['id'] = f"{fire.get('latitude', 0)}_{fire.get('longitude', 0)}_{fire.get('acq_date', '')}_{fire.get('acq_time', '')}"
                fire['detection_timestamp'] = datetime.now().isoformat()
                
            logger.info(f"Retrieved {len(fires)} fire records")
            return fires
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch fire data: {e}")
            return []
        except Exception as e:
            logger.error(f"Error processing fire data: {e}")
            return []

class WeatherService:
    """Service for handling OpenWeatherMap API calls"""
    
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = 'https://api.openweathermap.org/data/2.5'
        
    def get_current_weather(self, lat, lon):
        """Get current weather for given coordinates"""
        if not self.api_key:
            return None
            
        try:
            url = f'{self.base_url}/weather'
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get weather data: {e}")
            return None
            
    def get_forecast(self, lat, lon):
        """Get weather forecast for given coordinates"""
        if not self.api_key:
            return None
            
        try:
            url = f'{self.base_url}/forecast'
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric',
                'cnt': 8  # 24 hours (8 * 3-hour intervals)
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get forecast data: {e}")
            return None

# Initialize services
fire_service = FireDataService(NASA_FIRMS_MAP_KEY) if NASA_FIRMS_MAP_KEY else None
weather_service = WeatherService(OPENWEATHER_API_KEY) if OPENWEATHER_API_KEY else None

# API Routes

@app.route('/')
def index():
    """Serve the main page"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files (CSS, JS, etc.)"""
    return send_from_directory('.', filename)

@app.route('/api/status')
def api_status():
    """Check API configuration and status"""
    status = {
        'nasa_firms_configured': bool(NASA_FIRMS_MAP_KEY),
        'openweather_configured': bool(OPENWEATHER_API_KEY),
        'server_time': datetime.now().isoformat(),
        'available_sources': DATA_SOURCES
    }
    
    if fire_service:
        api_status = fire_service.check_api_status()
        if api_status:
            status['nasa_api_status'] = api_status
    
    return jsonify(status)

@app.route('/api/data-availability')
def data_availability():
    """Get available date ranges for fire datasets"""
    if not fire_service:
        return jsonify({'error': 'NASA FIRMS API key not configured'}), 400
        
    availability = fire_service.get_data_availability()
    if availability is None:
        return jsonify({'error': 'Failed to retrieve data availability'}), 500
        
    return jsonify(availability)

@app.route('/api/fires')
def get_fires():
    """Get fire data for Greece"""
    if not fire_service:
        return jsonify({'error': 'NASA FIRMS API key not configured'}), 400
    
    # Get parameters from request
    source = request.args.get('source', 'MODIS_NRT')
    days = int(request.args.get('days', 1))
    confidence_filter = request.args.get('confidence', 'all')
    
    # Validate parameters
    if source not in DATA_SOURCES:
        return jsonify({'error': f'Invalid data source. Available: {DATA_SOURCES}'}), 400
        
    if days < 1 or days > 10:
        return jsonify({'error': 'Days parameter must be between 1 and 10'}), 400
    
    # Get fire data
    fires = fire_service.get_country_fires(source, days)
    
    # Apply confidence filter
    if confidence_filter != 'all':
        if confidence_filter == 'high':
            fires = [f for f in fires if f.get('confidence', 0) >= 80]
        elif confidence_filter == 'medium':
            fires = [f for f in fires if 50 <= f.get('confidence', 0) < 80]
        elif confidence_filter == 'low':
            fires = [f for f in fires if f.get('confidence', 0) < 50]
    
    # Filter to ensure fires are within Greece bounds
    greece_bounds = {
        'north': 41.75,
        'south': 34.5,
        'east': 29.65,
        'west': 19.5
    }
    
    filtered_fires = []
    for fire in fires:
        lat = float(fire.get('latitude', 0))
        lon = float(fire.get('longitude', 0))
        
        if (greece_bounds['south'] <= lat <= greece_bounds['north'] and 
            greece_bounds['west'] <= lon <= greece_bounds['east']):
            filtered_fires.append(fire)
    
    return jsonify({
        'fires': filtered_fires,
        'count': len(filtered_fires),
        'source': source,
        'days': days,
        'confidence_filter': confidence_filter,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/weather')
def get_weather():
    """Get weather data for specific coordinates"""
    if not weather_service:
        return jsonify({'error': 'OpenWeather API key not configured'}), 400
    
    try:
        lat = float(request.args.get('lat'))
        lon = float(request.args.get('lon'))
    except (TypeError, ValueError):
        return jsonify({'error': 'Invalid latitude/longitude parameters'}), 400
    
    # Get current weather and forecast
    current = weather_service.get_current_weather(lat, lon)
    forecast = weather_service.get_forecast(lat, lon)
    
    if not current:
        return jsonify({'error': 'Failed to retrieve weather data'}), 500
    
    return jsonify({
        'current': current,
        'forecast': forecast,
        'coordinates': {'lat': lat, 'lon': lon},
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/fire/<fire_id>/weather')
def get_fire_weather(fire_id):
    """Get weather data for a specific fire"""
    # Extract coordinates from fire_id (format: lat_lon_date_time)
    try:
        parts = fire_id.split('_')
        lat = float(parts[0])
        lon = float(parts[1])
        
        return get_weather()  # Reuse the weather endpoint logic
    except (IndexError, ValueError):
        return jsonify({'error': 'Invalid fire ID format'}), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

def check_configuration():
    """Check if required API keys are configured"""
    issues = []
    
    if not NASA_FIRMS_MAP_KEY or NASA_FIRMS_MAP_KEY == 'your_nasa_firms_api_key_here':
        issues.append("NASA FIRMS API key not configured in config.env")
    
    if not OPENWEATHER_API_KEY or OPENWEATHER_API_KEY == 'your_openweather_api_key_here':
        issues.append("OpenWeather API key not configured in config.env (optional)")
    
    return issues

if __name__ == '__main__':
    print("🔥 Starting Greece Fire Alert Backend Server...")
    
    # Check configuration
    config_issues = check_configuration()
    if config_issues:
        print("\n⚠️  Configuration Issues:")
        for issue in config_issues:
            print(f"   - {issue}")
        print("\nPlease update config.env with your API keys.")
        print("Get NASA FIRMS API key from: https://firms.modaps.eosdis.nasa.gov/api/map_key")
        print("Get OpenWeather API key from: https://openweathermap.org/api")
        
        if not NASA_FIRMS_MAP_KEY or NASA_FIRMS_MAP_KEY == 'your_nasa_firms_api_key_here':
            print("\n⚠️  Starting in DEMO MODE - configure API keys for live data.")
            print("The UI will be functional but fire data will show placeholder messages.")
    
    print(f"\n✅ Server starting on http://localhost:{FLASK_PORT}")
    print("📊 API endpoints available:")
    print(f"   - http://localhost:{FLASK_PORT}/api/status")
    print(f"   - http://localhost:{FLASK_PORT}/api/fires")
    print(f"   - http://localhost:{FLASK_PORT}/api/weather")
    print(f"🌐 Frontend available at: http://localhost:{FLASK_PORT}")
    
    app.run(host='0.0.0.0', port=FLASK_PORT, debug=True)
