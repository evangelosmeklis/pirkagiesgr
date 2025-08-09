#!/usr/bin/env python3
"""
Fire Data Fetcher for GitHub Actions
Fetches fire data from NASA FIRMS and weather data, saves as static JSON files
"""

import os
import json
import requests
import pandas as pd
from datetime import datetime, timedelta
import time

class FireDataFetcher:
    def __init__(self):
        self.nasa_api_key = os.environ.get('NASA_FIRMS_MAP_KEY')
        self.weather_api_key = os.environ.get('OPENWEATHER_API_KEY')
        
        if not self.nasa_api_key:
            raise ValueError("NASA_FIRMS_MAP_KEY environment variable not set")
        
        # Greece bounds
        self.greece_bounds = {
            'north': 41.75,
            'south': 34.5,
            'east': 29.65,
            'west': 19.5
        }
        
        # Ensure data directory exists
        os.makedirs('data', exist_ok=True)
        
        print(f"🔥 Fire Data Fetcher initialized")
        print(f"🗝️ NASA API Key: {'✅ Set' if self.nasa_api_key else '❌ Missing'}")
        print(f"🌤️ Weather API Key: {'✅ Set' if self.weather_api_key else '❌ Missing'}")
    
    def fetch_fires_from_source(self, source, days=1):
        """Fetch fire data from a specific NASA FIRMS source"""
        try:
            url = f'https://firms.modaps.eosdis.nasa.gov/api/country/csv/{self.nasa_api_key}/{source}/GRC/{days}'
            print(f"📡 Fetching {source} data for last {days} days...")
            
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            # Parse CSV
            from io import StringIO
            df = pd.read_csv(StringIO(response.text))
            
            if df.empty:
                print(f"ℹ️ No {source} data found")
                return []
            
            # Convert to list of dictionaries
            fires = df.to_dict('records')
            
            # Add metadata
            for fire in fires:
                fire['data_source'] = source
                fire['id'] = f"{fire.get('latitude', 0)}_{fire.get('longitude', 0)}_{fire.get('acq_date', '')}_{fire.get('acq_time', '')}"
                fire['fetch_timestamp'] = datetime.now().isoformat()
            
            print(f"✅ Fetched {len(fires)} fires from {source}")
            return fires
            
        except Exception as e:
            print(f"❌ Failed to fetch {source}: {e}")
            return []
    
    def filter_fires_geographically(self, fires):
        """Filter fires to Greece bounds"""
        filtered = []
        
        for fire in fires:
            lat = float(fire.get('latitude', 0))
            lon = float(fire.get('longitude', 0))
            
            if (self.greece_bounds['south'] <= lat <= self.greece_bounds['north'] and 
                self.greece_bounds['west'] <= lon <= self.greece_bounds['east']):
                filtered.append(fire)
        
        return filtered
    
    def filter_fires_by_time(self, fires, hours):
        """Filter fires by time period"""
        if hours >= 24:
            return fires  # No time filtering for >= 24 hours
        
        cutoff_time = datetime.now() - timedelta(hours=hours)
        filtered = []
        
        for fire in fires:
            try:
                fire_date = datetime.strptime(fire.get('acq_date', ''), '%Y-%m-%d')
                if fire_date >= cutoff_time.replace(hour=0, minute=0, second=0, microsecond=0):
                    filtered.append(fire)
            except (ValueError, TypeError):
                # If we can't parse date, include the fire
                filtered.append(fire)
        
        return filtered
    
    def fetch_all_fire_data(self):
        """Fetch fire data from all sources"""
        sources = ['MODIS_NRT', 'VIIRS_SNPP_NRT']
        all_fires = []
        
        for source in sources:
            fires = self.fetch_fires_from_source(source, days=1)  # Get last 24 hours
            all_fires.extend(fires)
        
        # Filter geographically
        all_fires = self.filter_fires_geographically(all_fires)
        
        print(f"🔥 Total fires after geographic filtering: {len(all_fires)}")
        
        # Create different time period datasets
        datasets = {
            'live': self.filter_fires_by_time(all_fires, 1),  # Last hour
            'recent': self.filter_fires_by_time(all_fires, 24),  # Last 24 hours
            'historical': all_fires  # All available
        }
        
        return datasets
    
    def fetch_location_names(self, fires, max_requests=50):
        """Fetch location names for fires (limited to prevent API abuse)"""
        if not self.weather_api_key:
            print("⚠️ No weather API key, skipping location names")
            return fires
        
        print(f"📍 Fetching location names for up to {max_requests} fires...")
        
        # Get unique coordinates to minimize API calls
        unique_coords = {}
        for fire in fires:
            coord_key = f"{fire['latitude']:.3f},{fire['longitude']:.3f}"
            if coord_key not in unique_coords:
                unique_coords[coord_key] = {
                    'lat': fire['latitude'], 
                    'lon': fire['longitude']
                }
        
        # Limit requests
        coords_to_process = list(unique_coords.items())[:max_requests]
        location_cache = {}
        
        for i, (coord_key, coords) in enumerate(coords_to_process):
            try:
                url = f"http://api.openweathermap.org/geo/1.0/reverse"
                params = {
                    'lat': coords['lat'],
                    'lon': coords['lon'],
                    'limit': 1,
                    'appid': self.weather_api_key
                }
                
                response = requests.get(url, params=params, timeout=10)
                response.raise_for_status()
                data = response.json()
                
                if data and len(data) > 0:
                    location = data[0]
                    parts = []
                    
                    if location.get('name'):
                        parts.append(location['name'])
                    if location.get('state') and location.get('state') != location.get('name'):
                        parts.append(location['state'])
                    if location.get('country'):
                        parts.append(location['country'])
                    
                    location_name = ', '.join(parts) if parts else 'Unknown Location'
                    location_cache[coord_key] = location_name
                else:
                    location_cache[coord_key] = 'Unknown Location'
                
                # Rate limiting
                if i < len(coords_to_process) - 1:
                    time.sleep(0.1)  # 100ms delay between requests
                    
            except Exception as e:
                print(f"⚠️ Geocoding failed for {coord_key}: {e}")
                location_cache[coord_key] = 'Unknown Location'
        
        # Apply location names to fires
        for fire in fires:
            coord_key = f"{fire['latitude']:.3f},{fire['longitude']:.3f}"
            if coord_key in location_cache:
                fire['location_name'] = location_cache[coord_key]
        
        print(f"✅ Added location names for {len(location_cache)} coordinates")
        return fires
    
    def save_data(self, datasets):
        """Save datasets as JSON files"""
        timestamp = datetime.now().isoformat()
        
        for dataset_name, fires in datasets.items():
            # Add location names for recent data only (to limit API calls)
            if dataset_name == 'recent' and len(fires) <= 100:
                fires = self.fetch_location_names(fires)
            
            data = {
                'fires': fires,
                'count': len(fires),
                'dataset': dataset_name,
                'last_updated': timestamp,
                'sources': ['MODIS_NRT', 'VIIRS_SNPP_NRT'],
                'geographic_bounds': self.greece_bounds
            }
            
            filename = f'data/{dataset_name}_fires.json'
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            print(f"💾 Saved {len(fires)} fires to {filename}")
        
        # Create a status file
        status = {
            'last_update': timestamp,
            'datasets': {name: len(fires) for name, fires in datasets.items()},
            'status': 'success'
        }
        
        with open('data/status.json', 'w') as f:
            json.dump(status, f, indent=2)
        
        print(f"✅ Update complete at {timestamp}")

def main():
    try:
        fetcher = FireDataFetcher()
        datasets = fetcher.fetch_all_fire_data()
        fetcher.save_data(datasets)
        
        print("\n🎉 Fire data update completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error updating fire data: {e}")
        
        # Create error status file
        error_status = {
            'last_update': datetime.now().isoformat(),
            'status': 'error',
            'error': str(e)
        }
        
        os.makedirs('data', exist_ok=True)
        with open('data/status.json', 'w') as f:
            json.dump(error_status, f, indent=2)
        
        raise

if __name__ == "__main__":
    main()
