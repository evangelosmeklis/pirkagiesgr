# 🔥 Greece Fire Alert

A real-time fire monitoring system for Greece using NASA FIRMS satellite data with weather integration and historical tracking.

![Greece Fire Alert](https://img.shields.io/badge/Status-Active-brightgreen) ![Version](https://img.shields.io/badge/Version-1.0.0-blue)

## ✨ Features

### 🗺️ **Interactive Fire Map**
- Real-time fire detection data from NASA FIRMS
- Beautiful, responsive map interface with satellite imagery
- Color-coded fire markers based on confidence levels
- Hover and click interactions for detailed fire information
- Multiple data sources (MODIS, VIIRS satellites)

### 🌤️ **Weather Integration**
- Current weather conditions at fire locations
- 24-hour weather forecast
- Fire risk assessment based on weather conditions
- Wind speed and direction information crucial for fire spread

### 📊 **Historical Data & Analytics**
- Local database storage for historical fire data
- Interactive charts and analytics dashboard
- Date range filtering and search capabilities
- Monthly fire activity trends

### 🎨 **Modern UI/UX**
- Vibrant, gradient-based color scheme
- Glassmorphism design elements
- Responsive design for all devices
- Dark mode support
- Accessibility-compliant interface

## 🚀 Quick Start

### 1. **Get API Keys**

#### NASA FIRMS API Key (Required)
1. Visit [NASA FIRMS API Registration](https://firms.modaps.eosdis.nasa.gov/api/map_key)
2. Fill out the registration form (it's free!)
3. Check your email for the API key

#### OpenWeather API Key (Optional, for weather data)
1. Visit [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Generate an API key from your dashboard

### 2. **Setup the Application**

1. Clone or download this repository
2. Open `index.html` in your web browser
3. Click the settings button (⚙️) in the top right
4. Enter your API keys:
   - **NASA FIRMS API Key**: Required for fire data
   - **OpenWeather API Key**: Optional for weather information
5. Save settings and enjoy!

### 3. **Using the Application**

#### **Live Fire Map**
- View real-time fire detections across Greece
- Click on fire markers for detailed information
- Use filters to adjust confidence levels and time periods
- Toggle between street map and satellite imagery

#### **Historical Fires**
- Browse previously detected fires stored locally
- Filter by date ranges
- View statistics and trends
- Export data for analysis

#### **Analytics Dashboard**
- Monthly fire activity charts
- Confidence level distribution
- Fire intensity trends

## 🛠️ Technical Details

### **APIs Used**
- **NASA FIRMS**: Real-time fire detection data
  - Endpoint: `https://firms.modaps.eosdis.nasa.gov/api/country/csv/{MAP_KEY}/{source}/GRC/{days}`
  - Sources: MODIS_NRT, VIIRS_SNPP_NRT, VIIRS_NOAA20_NRT
  - Country Code: GRC (Greece)

- **OpenWeatherMap**: Weather data for fire locations
  - Current weather and 24-hour forecasts
  - Fire risk assessment based on conditions

### **Data Storage**
- **IndexedDB**: Local browser database for historical fires
- Automatic data persistence
- Efficient querying and filtering
- Data export capabilities

### **Technologies**
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapping**: Leaflet.js with OpenStreetMap tiles
- **Charts**: Chart.js for analytics
- **Icons**: Font Awesome
- **Fonts**: Inter (Google Fonts)

## 📊 Fire Detection Accuracy

### **Confidence Levels**
- 🔴 **High (80-100%)**: Confirmed active fires
- 🟠 **Medium (50-79%)**: Likely fires, may need verification
- 🔵 **Low (0-49%)**: Possible fires, could be other heat sources

### **Data Sources Comparison**
- **MODIS**: Terra and Aqua satellites, 1km resolution
- **VIIRS**: Suomi-NPP and NOAA-20, 375m resolution
- **Real-time**: Data available within 3 hours of satellite overpass

### **Limitations**
- Small fires (<1000m²) may not be detected
- Cloud cover can obstruct satellite detection
- Some industrial heat sources may cause false positives
- Smoke without active flames may not be detected

## 🔧 Configuration Options

### **Auto-refresh Settings**
- 5, 10, 15, or 30-minute intervals
- Automatic data updates when on live map tab
- Manual refresh option always available

### **Data Filters**
- **Time Period**: 1, 3, or 7 days of historical data
- **Confidence Level**: Filter by detection confidence
- **Data Source**: Choose specific satellite instruments

### **Map Controls**
- Zoom level restrictions to Greece area
- Layer switching (street/satellite)
- Scale indicator
- Responsive design for mobile devices

## 🎯 Fire Risk Assessment

The application calculates fire risk levels based on:
- **Temperature**: Higher temperatures increase risk
- **Humidity**: Lower humidity increases risk  
- **Wind Speed**: Higher wind speeds increase risk
- **Cloud Cover**: Clear skies can increase risk

**Risk Levels:**
- 🔴 **Extreme**: Very high fire danger
- 🟠 **High**: High fire danger
- 🟡 **Moderate**: Moderate fire danger
- 🟢 **Low**: Low fire danger

## 📱 Mobile Support

- Responsive design for all screen sizes
- Touch-friendly interface
- Optimized map controls for mobile
- Readable text and comfortable tap targets

## 🔒 Privacy & Data

- All data stored locally in your browser
- No personal information collected
- API keys stored securely in localStorage
- Historical data managed by browser IndexedDB

## 🚨 Emergency Information

**This application is for informational purposes only. In case of fire emergency:**

- **Greece Fire Service**: 199
- **European Emergency**: 112
- **Local Authorities**: Contact your municipality

Always follow official evacuation orders and safety guidelines.

## 🤝 Contributing

Feel free to contribute to this project:
1. Report bugs or suggest features
2. Improve the documentation
3. Submit pull requests
4. Share with fire monitoring organizations

## 📄 License

This project is open-source and available under the MIT License.

## 🙏 Acknowledgments

- **NASA FIRMS**: For providing free fire detection data
- **OpenWeatherMap**: For weather API services
- **OpenStreetMap**: For map tile services
- **Leaflet.js**: For excellent mapping library
- **Chart.js**: For beautiful chart components

---

**Built with ❤️ for fire safety and community awareness in Greece**
