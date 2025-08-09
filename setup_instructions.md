# Setup Instructions for Greece Fire Alert

## 🔑 API Key Configuration

Before running the application, you need to configure your API keys in the `config.env` file:

### 1. Edit config.env file
Open `config.env` and replace the placeholder values:

```bash
# NASA FIRMS API Configuration
NASA_FIRMS_MAP_KEY=your_actual_nasa_api_key_here

# OpenWeather API Configuration  
OPENWEATHER_API_KEY=your_actual_openweather_api_key_here

# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=True
FLASK_PORT=5000
```

### 2. Get your NASA FIRMS API Key (Required)
1. Visit: https://firms.modaps.eosdis.nasa.gov/api/map_key
2. Fill out the registration form (free)
3. Check your email for the API key
4. Copy the key to the `NASA_FIRMS_MAP_KEY` field in config.env

### 3. Get your OpenWeather API Key (Optional, for weather data)
1. Visit: https://openweathermap.org/api
2. Sign up for a free account
3. Generate an API key from your dashboard
4. Copy the key to the `OPENWEATHER_API_KEY` field in config.env

## 🚀 Running the Application

### Option 1: Python Backend (Recommended)
```bash
# Install dependencies (already done)
pip install -r requirements.txt

# Start the backend server
python backend.py
```

The application will be available at: http://localhost:5000

### Option 2: Simple Static Server (Limited functionality)
```bash
# Start simple HTTP server
python -m http.server 8000
```

The application will be available at: http://localhost:8000
**Note:** This option won't have secure API key handling or backend features.

## 📊 Using the NASA FIRMS API Example

The backend uses the NASA FIRMS API exactly as shown in your example:

```python
MAP_KEY = 'your_actual_api_key_here'

import pandas as pd
import requests

# Check API status
url = 'https://firms.modaps.eosdis.nasa.gov/mapserver/mapkey_status/?MAP_KEY=' + MAP_KEY
try:
    response = requests.get(url)
    data = response.json()
    df = pd.Series(data)
    print(df)
except:
    print("There is an issue with the query.")
```

## 🔥 Features Available

- ✅ Real-time fire data from NASA FIRMS
- ✅ Interactive map of Greece
- ✅ Weather integration (if API key provided)
- ✅ Historical fire database
- ✅ Beautiful, responsive UI
- ✅ Secure API key handling

## 🛠️ Troubleshooting

If you see "NASA FIRMS API key not configured" error:
1. Double-check your API key in config.env
2. Make sure there are no extra quotes or spaces
3. Restart the backend server after making changes

If weather data doesn't load:
1. OpenWeather API key is optional
2. Fire data will still work without it
3. Add the key to config.env for full functionality
