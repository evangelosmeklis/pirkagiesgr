# 📚 PirkagiesGr - Detailed Information

## 📖 Table of Contents

- [Project Overview](#project-overview)
- [Technical Architecture](#technical-architecture)
- [Setup Instructions](#setup-instructions)
- [Fire Detection Methodology](#fire-detection-methodology)
- [Data Sources](#data-sources)
- [Automatic Updates](#automatic-updates)
- [Project Structure](#project-structure)
- [API Configuration](#api-configuration)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Legal and Disclaimers](#legal-and-disclaimers)

---

## 🌟 Project Overview

PirkagiesGr is a web-based wildfire monitoring application for Greece that combines NASA satellite fire detection data with an interactive map interface. The project demonstrates modern web development practices, API integration, and automated data processing using GitHub Actions.

### Key Objectives

1. **Educational**: Demonstrate web development and API integration
2. **Technical**: Show automated data processing with GitHub Actions
3. **Informational**: Provide accessible fire data visualization
4. **Open Source**: Share knowledge and code with the community

---

## 🏗️ Technical Architecture

### Frontend Stack
- **HTML5**: Semantic structure and accessibility
- **CSS3**: Dark theme with glassmorphism effects
- **JavaScript (ES6+)**: Modern async/await patterns
- **Leaflet.js**: Interactive mapping library
- **Font Awesome**: Icons and visual elements

### Backend Architecture
- **Static Site**: Hosted on GitHub Pages
- **GitHub Actions**: Automated data fetching every 30 minutes
- **JSON Files**: Static data storage updated automatically
- **No Server**: Serverless architecture for cost-effectiveness

### Data Flow
```
NASA FIRMS API → GitHub Action → JSON Files → GitHub Pages → User Browser
     ↓              ↓             ↓             ↓              ↓
  Raw CSV     Process & Filter  Static Files   Auto Deploy   Live Data
```

---

## 🚀 Setup Instructions

### For Developers

#### 1. Fork and Clone
```bash
git clone https://github.com/your-username/pirkagiesgr.git
cd pirkagiesgr
```

#### 2. Get API Keys
- **NASA FIRMS**: [Register here](https://firms.modaps.eosdis.nasa.gov/api/map_key) (Free)
- **OpenWeatherMap**: [Register here](https://openweathermap.org/api) (Free tier available)

#### 3. Configure GitHub Secrets
In your GitHub repository settings:
- `NASA_FIRMS_MAP_KEY`: Your NASA API key
- `OPENWEATHER_API_KEY`: Your weather API key (optional)

#### 4. Enable GitHub Pages
1. Go to repository Settings → Pages
2. Source: Deploy from a branch
3. Branch: main / (root)

#### 5. Local Development
```bash
# Start local server
python -m http.server 8000

# Visit http://localhost:8000
```

---

## 🛰️ Fire Detection Methodology

### NASA FIRMS Data Sources

#### MODIS (Terra & Aqua Satellites)
- **Resolution**: 1km at nadir
- **Overpass**: 2-4 times daily
- **Spectral Bands**: 4μm and 11μm thermal channels
- **Confidence Levels**: Statistical probability of fire presence

#### VIIRS (Suomi NPP & NOAA-20)
- **Resolution**: 375m at nadir
- **Overpass**: 2 times daily
- **Enhanced**: Better spatial resolution than MODIS
- **Nighttime**: Better low-light fire detection

### Fire Confidence Interpretation

| Confidence | Description | Recommended Action |
|-----------|-------------|-------------------|
| 🔥 80-100% | Confirmed active fire | Monitor closely, prepare for evacuation if nearby |
| 🟠 50-79% | Likely fire detection | Verify with local sources |
| ⚠️ 0-49% | Possible fire/heat source | Could be industrial activity, gas flares |

### Limitations
- **Small fires** may not be detected
- **Cloud cover** can obscure detection
- **Time delay** of 3-6 hours from satellite overpass
- **False positives** from industrial heat sources
- **Spatial accuracy** ±1km depending on viewing angle

---

## 📊 Data Sources

### Primary Data
- **NASA FIRMS**: Real-time fire detection
  - MODIS Collection 6.1 NRT
  - VIIRS 375m NRT
  - Updated every 3-6 hours

### Secondary Data
- **OpenWeatherMap**: Weather conditions (optional)
- **OpenStreetMap**: Base map tiles
- **Esri**: Satellite imagery tiles

### Data Processing
1. **Fetch**: GitHub Action runs every 30 minutes
2. **Filter**: Geographic bounds for Greece
3. **Process**: Convert to standardized JSON format
4. **Store**: Save as static files in repository
5. **Deploy**: GitHub Pages auto-deploys updates

---

## 🔄 Automatic Updates

### GitHub Actions Workflow

The application updates automatically using GitHub Actions:

```yaml
Schedule: "*/30 * * * *"  # Every 30 minutes
```

#### Update Process
1. **Trigger**: Cron schedule or manual trigger
2. **Fetch**: Download latest MODIS and VIIRS data
3. **Process**: Filter for Greece, add metadata
4. **Save**: Generate JSON files (live, recent, historical)
5. **Commit**: Push updated files to repository
6. **Deploy**: GitHub Pages auto-deploys changes

#### Data Retention
- **Live**: Last 1 hour of detections
- **Recent**: Last 24 hours of detections  
- **Historical**: Last 7 days of detections

---

## 📁 Project Structure

```
pirkagiesgr/
├── .github/workflows/
│   └── update-fire-data.yml    # GitHub Actions workflow
├── data/                       # Auto-generated data files
│   ├── live_fires.json        # Last hour
│   ├── recent_fires.json      # Last 24 hours
│   ├── historical_fires.json  # Last 7 days
│   └── status.json            # Update status
├── js/                        # JavaScript modules
│   ├── app.js                 # Main application logic
│   └── api-service.js         # Data fetching service
├── scripts/                   # Python automation
│   └── fetch_fire_data.py     # Data fetching script
├── index.html                 # Main application
├── styles.css                 # Styling and themes
├── README.md                  # Quick start guide
├── INFORMATION.md             # This file
└── TODO.md                    # Development tasks
```

---

## 🔑 API Configuration

### NASA FIRMS API
```
Endpoint: https://firms.modaps.eosdis.nasa.gov/api/country/csv/{MAP_KEY}/{SOURCE}/GRC/{DAYS}
Sources: MODIS_NRT, VIIRS_SNPP_NRT
Country: GRC (Greece)
Rate Limit: 1000 requests/hour
```

### OpenWeatherMap API (Optional)
```
Endpoint: https://api.openweathermap.org/data/2.5/weather
Endpoint: https://api.openweathermap.org/geo/1.0/reverse
Rate Limit: 1000 requests/day (free tier)
```

---

## 🚀 Deployment

### GitHub Pages Deployment
1. **Automatic**: Triggered by commits to main branch
2. **Source**: Repository root directory
3. **Custom Domain**: Configure CNAME if needed
4. **HTTPS**: Automatically enabled
5. **CDN**: Global content delivery network

### Alternative Deployments
- **Netlify**: Connect GitHub repository for auto-deploy
- **Vercel**: Zero-config deployment for static sites
- **Firebase Hosting**: Google's hosting platform
- **Local Server**: Python HTTP server for development

---

## 🔧 Troubleshooting

### Common Issues

#### GitHub Action Fails
- Check API keys in repository secrets
- Verify NASA FIRMS API key validity
- Review workflow logs for specific errors

#### No Fire Data Displayed
- Check browser console for JavaScript errors
- Verify JSON files exist in `/data/` directory
- Confirm GitHub Pages is enabled and deployed

#### Map Not Loading
- Check internet connection
- Verify Leaflet.js CDN availability
- Check browser developer tools for errors

#### API Rate Limits
- NASA FIRMS: 1000 requests/hour limit
- Reduce fetch frequency if needed
- Monitor GitHub Action logs for 429 errors

### Debug Mode
Enable browser developer tools to see:
- Network requests to data files
- JavaScript console logs
- API response data
- Error messages

---

## ⚖️ Legal and Disclaimers

### Educational Purpose
This project is created **for educational and informational purposes only**. It serves as a demonstration of:
- Web development techniques
- API integration methods
- Automated data processing
- Geographic data visualization
- Modern JavaScript practices

### Liability Disclaimer
**The developer(s) carry no liability** for:
- How this application is used
- Decisions made based on the data provided
- Accuracy or completeness of fire detection data
- Any consequences resulting from use of this application

### Data Accuracy Warnings
- **Satellite data delays**: 3-6 hours typical
- **False positives**: Industrial heat sources may trigger alerts
- **False negatives**: Small fires may not be detected
- **Weather interference**: Clouds can obscure detection
- **Spatial accuracy**: ±1km depending on satellite angle

### Emergency Use Warning
**DO NOT** rely solely on this application for:
- Emergency evacuation decisions
- Fire suppression planning
- Safety-critical applications
- Official emergency response

Always verify information with:
- Official fire services
- Local emergency authorities  
- Government emergency systems
- Professional meteorological services

### Data Attribution
- **Fire Data**: NASA FIRMS (Public Domain)
- **Weather Data**: OpenWeatherMap (API License)
- **Map Data**: OpenStreetMap Contributors (ODbL)
- **Satellite Imagery**: Esri (Usage Rights)

### Open Source License
This project is released under the MIT License. See LICENSE file for details.

### Contact and Support
For questions about this educational project:
- Open a GitHub issue for bugs or features
- Fork the repository for your own modifications
- Star the repository if you found it helpful

---

**Remember: This is an educational project. Always follow official emergency guidance and verify information with authorities.**
