# 🔥 PirkagiesGr

Real-time wildfire monitoring for Greece using NASA satellite data.

![PirkagiesGr](https://img.shields.io/badge/Status-Active-brightgreen) ![Version](https://img.shields.io/badge/Version-2.0.0-blue)

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure API Keys
Edit `config.env` and add your API keys:
```bash
NASA_FIRMS_MAP_KEY=your_nasa_api_key_here
OPENWEATHER_API_KEY=your_weather_api_key_here
```

**Get API Keys:**
- NASA FIRMS: [https://firms.modaps.eosdis.nasa.gov/api/map_key](https://firms.modaps.eosdis.nasa.gov/api/map_key) (Free)
- OpenWeather: [https://openweathermap.org/api](https://openweathermap.org/api) (Free)

### 3. Run the Application
```bash
python backend.py
```

Visit: **http://localhost:5000**

## ✨ Features

- 🛰️ **Real-time satellite fire detection** from NASA FIRMS
- 🗺️ **Interactive satellite map** with fire emoji markers
- 🌤️ **Weather data** and fire risk assessment
- 📊 **Historical fire analytics** with local database
- 📱 **Twitter-inspired UI** - dark theme, responsive design
- ⚠️ **Emergency information** and safety disclaimers

## 🛰️ Data Sources

- **NASA FIRMS**: Satellite fire detection (MODIS, VIIRS)
- **OpenWeatherMap**: Weather conditions and forecasts
- **Esri**: Satellite base map imagery

## 🔥 Fire Detection

- 🔥 **High Confidence (80-100%)**: Confirmed active fires
- 🟠 **Medium Confidence (50-79%)**: Likely fires
- 🟡 **Low Confidence (0-49%)**: Possible fires

## ⚠️ Important Disclaimer

**This application is for informational purposes only.**

🚨 **Emergency Numbers:**
- **Greece Fire Service**: 199
- **European Emergency**: 112

Always follow official evacuation orders and safety guidelines.

## 📁 Project Structure

```
grfirealert/
├── backend.py          # Flask server with NASA FIRMS integration
├── config.env          # API key configuration
├── requirements.txt    # Python dependencies
├── index.html          # Frontend application
├── styles.css          # Twitter-inspired dark theme
├── app.js             # Application logic
├── database.js        # Historical data storage
├── weather.js         # Weather integration
├── README.md          # This file
└── INFORMATION.md     # Detailed technical information
```

## 🔧 Technical Details

- **Backend**: Python Flask with pandas for NASA FIRMS data processing
- **Frontend**: Vanilla JavaScript with Leaflet.js mapping
- **Database**: Browser IndexedDB for historical fire storage
- **Security**: Server-side API key management

## 📚 More Information

For detailed technical information, fire detection methodology, and scientific background, see [INFORMATION.md](INFORMATION.md).

## 🙏 Attribution

Fire data courtesy of **NASA FIRMS**. Weather data courtesy of **OpenWeatherMap**. Satellite imagery courtesy of **Esri**.

---

**For informational purposes only. Always follow official emergency guidance.**