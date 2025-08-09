# 📋 PirkagiesGr - Detailed Information

## 🔥 About This Application

PirkagiesGr is a real-time wildfire monitoring system that provides satellite-based fire detection data for Greece using NASA's Fire Information for Resource Management System (FIRMS). The application combines cutting-edge satellite technology with modern web interfaces to deliver timely fire information to users.

## 🛰️ Data Sources and Technology

### NASA FIRMS (Fire Information for Resource Management System)
- **Provider**: NASA Goddard Space Flight Center
- **Website**: https://firms.modaps.eosdis.nasa.gov/
- **Data Update Frequency**: Every 3-6 hours depending on satellite overpass
- **Global Coverage**: Worldwide fire detection and monitoring

### Satellite Instruments Used

#### MODIS (Moderate Resolution Imaging Spectroradiometer)
- **Satellites**: Terra and Aqua
- **Resolution**: 1 km at nadir
- **Temporal Resolution**: 1-2 times daily
- **Spectral Bands**: 36 bands (visible to thermal infrared)
- **Fire Detection**: Uses thermal anomaly detection algorithms

#### VIIRS (Visible Infrared Imaging Radiometer Suite)
- **Satellites**: Suomi-NPP, NOAA-20, NOAA-21
- **Resolution**: 375m at nadir (I-bands), 750m (M-bands)
- **Temporal Resolution**: 1-2 times daily
- **Enhanced Features**: Improved spatial resolution over MODIS

### Fire Detection Methodology

#### Thermal Anomaly Detection
Fire detection relies on identifying thermal anomalies - areas significantly warmer than their surroundings. The algorithms compare:
- Brightness temperature at fire-sensitive wavelengths (3.9 μm, 11 μm)
- Background temperature of surrounding pixels
- Expected temperature based on time of day and season

#### Confidence Levels
Each fire detection includes a confidence percentage:
- **High (80-100%)**: Strong thermal signature, very likely an active fire
- **Medium (50-79%)**: Moderate thermal signature, likely fire but may need verification
- **Low (0-49%)**: Weak thermal signature, could be fire or other heat source

#### Factors Affecting Detection
- **Cloud Cover**: Clouds block thermal radiation, preventing detection
- **Fire Size**: Fires smaller than ~1000m² may not be detected
- **Fire Temperature**: Smoldering fires may be missed
- **Terrain**: Steep terrain can affect pixel size and detection accuracy
- **Sun Angle**: Detection algorithms adjust for solar heating effects

## 🌍 Geographic Coverage

### Greece (Hellenic Republic)
- **Country Code**: GRC (ISO 3166-1 alpha-3)
- **Bounding Box**: 
  - North: 41.75°N
  - South: 34.5°N
  - East: 29.65°E
  - West: 19.5°E
- **Includes**: Mainland Greece, all Greek islands including Crete, Rhodes, Corfu, etc.

## 🌤️ Weather Integration

### OpenWeatherMap API
- **Current Weather**: Temperature, humidity, wind speed/direction, pressure
- **Forecasts**: 24-hour weather outlook for fire locations
- **Fire Risk Assessment**: Automated calculation based on weather conditions

### Fire Weather Factors
- **Temperature**: Higher temperatures increase fire risk
- **Relative Humidity**: Lower humidity increases fire risk
- **Wind Speed**: Higher winds increase fire spread rate
- **Wind Direction**: Critical for predicting fire spread direction
- **Precipitation**: Recent rainfall reduces fire risk

## 📊 Technical Implementation

### Backend Architecture
- **Framework**: Python Flask
- **Data Processing**: Pandas for CSV parsing and analysis
- **HTTP Requests**: Requests library for API calls
- **Environment**: Python-dotenv for secure configuration
- **CORS**: Flask-CORS for cross-origin requests

### Frontend Architecture
- **Core**: Vanilla JavaScript (ES6+)
- **Mapping**: Leaflet.js with Esri satellite imagery
- **Charts**: Chart.js for analytics visualization
- **Storage**: IndexedDB for historical data persistence
- **Styling**: CSS3 with Twitter-inspired design

### Database Design
- **Type**: Browser-based IndexedDB
- **Schema**: Fire records with indexes on date, location, confidence
- **Capacity**: Limited by browser storage quotas (typically 50MB+)
- **Persistence**: Data survives browser restarts and updates

## 🔐 Security and Privacy

### API Key Management
- **Server-Side Storage**: API keys stored in environment variables
- **No Client Exposure**: Keys never transmitted to frontend
- **Configuration**: Managed through config.env file

### Data Privacy
- **No Personal Data**: Application doesn't collect user information
- **Local Storage**: All historical data stored in user's browser
- **No Tracking**: No analytics or user behavior tracking

## ⚠️ Limitations and Disclaimers

### Detection Limitations
- **Minimum Fire Size**: Fires smaller than sensor resolution may be missed
- **Weather Dependency**: Cloud cover prevents satellite detection
- **Time Delays**: 3-6 hour delay between fire occurrence and detection
- **False Positives**: Industrial heat sources, gas flares, volcanoes may trigger alerts
- **False Negatives**: Small, cool, or cloud-obscured fires may be missed

### Data Accuracy
- **Spatial Accuracy**: ±1km for MODIS, ±375m for VIIRS under ideal conditions
- **Temporal Accuracy**: Acquisition time accurate to within minutes
- **Confidence Levels**: Statistical probability, not absolute certainty

### Important Warnings
- **Not for Emergency Response**: This is an informational tool only
- **Always Follow Official Guidance**: Evacuation orders override any application data
- **No Substitute for Local Authorities**: Contact emergency services for immediate threats
- **Weather Data Limitations**: Forecasts become less reliable beyond 24 hours

## 📞 Emergency Information

### Greece Emergency Numbers
- **Fire Service**: 199
- **Police**: 100
- **Medical Emergency**: 166
- **European Emergency**: 112

### When to Call Emergency Services
- Immediate threat to life or property
- Visible flames or smoke in your area
- Evacuation orders from authorities
- Any fire-related emergency

## 🔬 Scientific Background

### Fire Detection Science
Fire detection from space relies on the Stefan-Boltzmann law and Planck's law of blackbody radiation. Fires emit intense thermal radiation at specific wavelengths that can be distinguished from normal background temperatures.

### Algorithm Development
NASA's fire detection algorithms have been refined over decades of satellite observations and ground truth validation. The algorithms account for:
- Diurnal temperature cycles
- Seasonal variations
- Land cover types
- Atmospheric conditions

### Validation Studies
Fire detection accuracy is continuously validated through:
- Ground-based observations
- Aircraft overflights
- Comparison with other satellite systems
- Statistical analysis of detection rates

## 📈 Future Developments

### Potential Enhancements
- Integration with additional satellite data sources
- Machine learning improvements for detection accuracy
- Real-time weather radar integration
- Mobile application development
- SMS/email alert systems

### Technology Evolution
- Next-generation satellite sensors with improved resolution
- Geostationary fire monitoring for continuous coverage
- Integration with IoT ground sensors
- AI-powered fire behavior prediction

## 📚 References and Further Reading

### NASA FIRMS Resources
- FIRMS User Guide: https://firms.modaps.eosdis.nasa.gov/userdocs/
- Fire Detection Methodology: https://modis.gsfc.nasa.gov/data/dataprod/mod14.php
- VIIRS Fire Products: https://www.earthdata.nasa.gov/learn/find-data/near-real-time/firms

### Scientific Publications
- Giglio, L., et al. (2016). The Collection 6 MODIS burned area mapping algorithm and product. Remote Sensing of Environment.
- Schroeder, W., et al. (2014). The New VIIRS 375m active fire detection data product. Remote Sensing of Environment.

### Fire Management Resources
- Global Fire Monitoring Center: http://www.fire.uni-freiburg.de/
- European Forest Fire Information System: https://effis.jrc.ec.europa.eu/
- Greece General Secretariat for Civil Protection: https://www.civilprotection.gr/

## 📄 Attribution and Licensing

### Data Attribution
- **NASA FIRMS**: Fire detection data courtesy of NASA FIRMS
- **Esri**: Satellite imagery courtesy of Esri and its data partners
- **OpenWeatherMap**: Weather data courtesy of OpenWeatherMap Ltd.
- **Font Awesome**: Icons courtesy of Font Awesome

### Software Licensing
This application uses open-source libraries under their respective licenses:
- Leaflet.js (BSD 2-Clause)
- Chart.js (MIT License)
- Flask (BSD 3-Clause)
- Pandas (BSD 3-Clause)

### Disclaimer
This software is provided "as is" without warranty of any kind, express or implied. The developers assume no responsibility for any consequences resulting from the use of this application. Users are advised to verify all information with official sources before making any decisions based on the data provided.
