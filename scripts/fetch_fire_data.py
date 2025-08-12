#!/usr/bin/env python3
"""
Fire Data Fetcher for GitHub Actions
Fetches fire data from NASA FIRMS and saves as static JSON files
"""

import os
import json
import requests
import pandas as pd
from datetime import datetime, timedelta, timezone

class FireDataFetcher:
    def __init__(self):
        self.nasa_api_key = os.environ.get('NASA_FIRMS_MAP_KEY')
        if self.nasa_api_key:
            self.nasa_api_key = self.nasa_api_key.strip()  # Remove any whitespace/newlines
        
        if not self.nasa_api_key:
            raise ValueError("NASA_FIRMS_MAP_KEY environment variable not set")
        
        # Greece and Cyprus bounds
        self.greece_bounds = {
            'north': 41.75,
            'south': 34.5,
            'east': 34.8,  # Extended to include Cyprus
            'west': 19.5
        }
        
        # Ensure data directory exists
        os.makedirs('data', exist_ok=True)
        
        print(f"🔥 Fire Data Fetcher initialized")
        print(f"🗝️ NASA API Key: {'✅ Set' if self.nasa_api_key else '❌ Missing'}")
    
    def fetch_fires_from_source(self, source, days=1):
        """Fetch fire data from a specific NASA FIRMS source for both Greece and Cyprus"""
        all_fires = []
        countries = [('GRC', 'Greece'), ('CYP', 'Cyprus')]
        
        for country_code, country_name in countries:
            try:
                url = f'https://firms.modaps.eosdis.nasa.gov/api/country/csv/{self.nasa_api_key}/{source}/{country_code}/{days}'
                print(f"📡 Fetching {source} data for {country_name} (last {days} days)...")
                
                response = requests.get(url, timeout=30)
                response.raise_for_status()
                
                # Parse CSV
                from io import StringIO
                df = pd.read_csv(StringIO(response.text))
                
                if df.empty:
                    print(f"ℹ️ No {source} data found for {country_name}")
                    continue
                
                # Convert to list of dictionaries
                fires = df.to_dict('records')
                
                # Add metadata
                for fire in fires:
                    fire['data_source'] = source
                    fire['country'] = country_name
                    fire['id'] = f"{fire.get('latitude', 0)}_{fire.get('longitude', 0)}_{fire.get('acq_date', '')}_{fire.get('acq_time', '')}"
                    fire['fetch_timestamp'] = datetime.now(timezone.utc).isoformat()
                
                all_fires.extend(fires)
                print(f"✅ Fetched {len(fires)} fires from {source} in {country_name}")
                
            except Exception as e:
                print(f"❌ Failed to fetch {source} for {country_name}: {e}")
                continue
        
        print(f"🔥 Total {len(all_fires)} fires from {source} (Greece + Cyprus)")
        return all_fires
    
    def filter_fires_geographically(self, fires):
        """Filter fires to Greece and Cyprus bounds"""
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
    
    def load_existing_data(self):
        """Load existing fire data files if they exist"""
        existing_datasets = {}
        
        for dataset_name in ['live', 'recent', 'historical']:
            filename = f'data/{dataset_name}_fires.json'
            try:
                with open(filename, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    existing_datasets[dataset_name] = data.get('fires', [])
                    print(f"📄 Loaded existing {dataset_name} data: {len(existing_datasets[dataset_name])} fires")
            except FileNotFoundError:
                existing_datasets[dataset_name] = []
                print(f"📄 No existing {dataset_name} data found")
            except Exception as e:
                print(f"⚠️ Failed to load existing {dataset_name} data: {e}")
                existing_datasets[dataset_name] = []
        
        return existing_datasets
    
    def fetch_all_fire_data(self):
        """Fetch fire data from all sources"""
        sources = ['MODIS_NRT', 'VIIRS_SNPP_NRT']
        
        # Load existing data as fallback
        existing_datasets = self.load_existing_data()
        
        # Track if we successfully fetched any new data
        successful_fetches = 0
        total_expected_fetches = len(sources) * 2  # 2 time periods per source
        
        # Fetch different time periods for different datasets
        print("📡 Fetching recent data (last 24 hours)...")
        recent_fires = []
        for source in sources:
            fires = self.fetch_fires_from_source(source, days=1)  # Last 24 hours for live/recent
            if fires:  # Only count as successful if we got data
                successful_fetches += 1
            recent_fires.extend(fires)
        
        print("📡 Fetching historical data (last 7 days)...")
        historical_fires = []
        for source in sources:
            fires = self.fetch_fires_from_source(source, days=7)  # Last 7 days for historical
            if fires:  # Only count as successful if we got data
                successful_fetches += 1
            historical_fires.extend(fires)
        
        # Filter geographically
        recent_fires = self.filter_fires_geographically(recent_fires)
        historical_fires = self.filter_fires_geographically(historical_fires)
        
        print(f"🔥 Recent fires (24h) after geographic filtering: {len(recent_fires)}")
        print(f"🔥 Historical fires (7d) after geographic filtering: {len(historical_fires)}")
        
        # Check if we got any new data - if not, use existing data
        if successful_fetches == 0:
            print("⚠️ No new data fetched from NASA API - using existing data as fallback")
            datasets = {
                'live': existing_datasets.get('live', []),
                'recent': existing_datasets.get('recent', []),
                'historical': existing_datasets.get('historical', [])
            }
            # Mark this as using fallback data
            self.using_fallback_data = True
        else:
            # Create different time period datasets with new data
            datasets = {
                'live': self.filter_fires_by_time(recent_fires, 1),  # Last hour from recent data
                'recent': recent_fires,  # Last 24 hours
                'historical': historical_fires  # Last 7 days
            }
            self.using_fallback_data = False
        
        return datasets
    
    def save_data(self, datasets):
        """Save datasets as JSON files"""
        timestamp = datetime.now(timezone.utc).isoformat()
        
        for dataset_name, fires in datasets.items():
            data = {
                'fires': fires,
                'count': len(fires),
                'dataset': dataset_name,
                'last_updated': timestamp,
                'sources': ['MODIS_NRT', 'VIIRS_SNPP_NRT'],
                'geographic_bounds': self.greece_bounds,
                'using_fallback_data': getattr(self, 'using_fallback_data', False)
            }
            
            filename = f'data/{dataset_name}_fires.json'
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            print(f"💾 Saved {len(fires)} fires to {filename}")
        
        # Create a status file
        status_type = 'fallback' if getattr(self, 'using_fallback_data', False) else 'success'
        status = {
            'last_update': timestamp,
            'datasets': {name: len(fires) for name, fires in datasets.items()},
            'status': status_type,
            'using_fallback_data': getattr(self, 'using_fallback_data', False),
            'nasa_api_available': not getattr(self, 'using_fallback_data', False)
        }
        
        if getattr(self, 'using_fallback_data', False):
            status['message'] = 'NASA FIRMS API temporarily unavailable - displaying last known fire data'
        
        with open('data/status.json', 'w') as f:
            json.dump(status, f, indent=2)
        
        print(f"✅ Update complete at {timestamp}")

def main():
    try:
        fetcher = FireDataFetcher()
        datasets = fetcher.fetch_all_fire_data()
        fetcher.save_data(datasets)
        
        if getattr(fetcher, 'using_fallback_data', False):
            print("\n⚠️ Fire data update completed using fallback data due to NASA API issues!")
        else:
            print("\n🎉 Fire data update completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error updating fire data: {e}")
        
        # Try to load existing data as last resort
        try:
            print("🔄 Attempting to preserve existing data...")
            os.makedirs('data', exist_ok=True)
            
            # Create error status file
            error_status = {
                'last_update': datetime.now(timezone.utc).isoformat(),
                'status': 'error',
                'error': str(e),
                'using_fallback_data': True,
                'nasa_api_available': False,
                'message': 'Critical error occurred - existing data preserved if available'
            }
            
            with open('data/status.json', 'w') as f:
                json.dump(error_status, f, indent=2)
            
            print("⚠️ Error status saved - existing fire data files preserved")
            
        except Exception as preserve_error:
            print(f"❌ Failed to preserve data: {preserve_error}")
        
        raise

if __name__ == "__main__":
    main()
