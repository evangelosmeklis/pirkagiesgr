# PirkagiesGr - GitHub Pages Setup Guide

This guide explains how to deploy PirkagiesGr to GitHub Pages with automatic data updates via GitHub Actions.

## 🎯 How It Works

**GitHub Actions** automatically fetch fire data every 30 minutes and save it as static JSON files. This approach:
- ✅ **Keeps API keys secure** (not exposed to users)
- ✅ **Provides fast loading** (pre-fetched data)
- ✅ **Prevents API abuse** (controlled by GitHub Actions)
- ✅ **Works perfectly on GitHub Pages** (no backend needed)

## 🚀 Quick Deploy to GitHub Pages

### 1. Fork/Clone the Repository
```bash
git clone https://github.com/your-username/grfirealert.git
cd grfirealert
```

### 2. Configure API Keys as GitHub Secrets

#### Get Your Free API Keys:
- **NASA FIRMS API Key**: Visit https://firms.modaps.eosdis.nasa.gov/api/map_key
- **OpenWeatherMap API Key**: Visit https://openweathermap.org/api

#### Add Secrets to Your Repository:
1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:
   - Name: `NASA_FIRMS_MAP_KEY`, Value: `your_nasa_api_key_here`
   - Name: `OPENWEATHER_API_KEY`, Value: `your_openweather_api_key_here`

### 3. Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **Deploy from a branch**
4. Choose **main** branch and **/ (root)** folder
5. Click **Save**

### 4. Access Your Site
Your site will be available at: `https://your-username.github.io/grfirealert`

## 🛡️ Built-in Abuse Prevention

The application includes several measures to prevent API abuse:

### ⏰ Time-Based Limits
- **Minimum 30 minutes** between requests
- **Maximum 2 requests per hour**
- **Persistent tracking** using localStorage

### 🚫 Request Blocking
- Shows clear error messages when limits are exceeded
- Tells users exactly how long to wait
- Prevents rapid-fire requests

### 📊 Automatic Refresh
- **Auto-refresh every 30 minutes** when on live tab
- **Visual countdown timer** shows time remaining
- **No manual refresh button** to prevent abuse

## 🔧 How It Works

### Frontend-Only Architecture
- **No backend server** required
- **Direct API calls** to NASA FIRMS and OpenWeatherMap
- **Client-side data processing** and filtering
- **Browser storage** for caching and limits

### API Integration
- **NASA FIRMS**: Fire detection data for Greece
- **OpenWeatherMap**: Weather data and reverse geocoding
- **CORS-enabled**: Works directly from browser
- **Error handling**: Graceful fallbacks when APIs are unavailable

## 📱 Features

### 🔥 Fire Detection
- **MODIS**: 🔥 Fire emoji for ≥50% confidence
- **VIIRS**: 🟠 Orange emoji for ≥50% confidence  
- **Low Confidence**: ⚠️ Warning emoji for <50%

### 🗺️ Interactive Map
- **Satellite imagery** base layer
- **Fire markers** with confidence indicators
- **Click for details** including location names
- **Weather information** for each fire location

### 📊 Data Management
- **7-day historical data** (maximum)
- **Geographic filtering** for Greece only
- **Local storage** for offline viewing
- **Export capabilities** for data analysis

## ⚙️ Configuration Options

### Auto-Refresh Settings
```javascript
// In api-service.js, you can modify:
minRequestInterval: 30 * 60 * 1000, // 30 minutes (minimum recommended)
maxRequestsPerHour: 2, // Maximum requests per hour
```

### Geographic Bounds
```javascript
// Greece bounds (in api-service.js):
const greeceBounds = {
    north: 41.75,
    south: 34.5,
    east: 29.65,
    west: 19.5
};
```

## 🚨 Important Notes

### API Key Security
- API keys are stored in `api-config.json`
- **Public repository**: Anyone can see your API keys
- **Use free tier keys**: Don't use production/paid API keys
- **Monitor usage**: Check your API usage regularly

### Rate Limits
- **NASA FIRMS**: 1000 requests/day for free accounts
- **OpenWeatherMap**: 1000 requests/day for free accounts
- **Built-in limits**: App prevents exceeding these limits

### Browser Compatibility
- **Modern browsers**: Chrome, Firefox, Safari, Edge
- **JavaScript required**: App won't work with JS disabled
- **Local storage**: Required for caching and limits

## 🔍 Troubleshooting

### "API key not configured" Error
1. Check `api-config.json` has correct keys
2. Ensure file is in the root directory
3. Verify API keys are valid and active

### "Too many requests" Error
1. Wait for the cooldown period
2. Check if auto-refresh is working correctly
3. Don't manually refresh frequently

### No Fire Data Showing
1. Verify API keys are working
2. Check browser console for errors
3. Ensure you're viewing Greece region

### Weather Data Not Loading
1. Check OpenWeatherMap API key
2. Verify geocoding is working
3. Check browser network tab for errors

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify API keys are correct
3. Ensure you're within rate limits
4. Check GitHub Issues for similar problems

## 🎯 Performance Tips

- **Use sparingly**: Don't refresh constantly
- **Cache works**: Repeated visits use cached data
- **Auto-refresh**: Let the app handle updates automatically
- **Mobile friendly**: Works well on mobile devices

Happy fire monitoring! 🔥🛰️
