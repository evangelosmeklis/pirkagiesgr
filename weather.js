// Weather API integration for fire locations
class WeatherService {
    constructor() {
        this.apiKey = localStorage.getItem('weather_api_key') || '';
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
        this.cache = new Map();
        this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
    }

    setApiKey(apiKey) {
        this.apiKey = apiKey;
        localStorage.setItem('weather_api_key', apiKey);
    }

    getApiKey() {
        return this.apiKey;
    }

    async getCurrentWeather(lat, lon) {
        const cacheKey = `current_${lat}_${lon}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }

        try {
            // Use the global API service for weather data
            const data = await window.app.apiService.getWeatherData(lat, lon);
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: data.current,
                timestamp: Date.now()
            });
            
            return data.current;
        } catch (error) {
            console.error('Failed to fetch current weather:', error);
            throw error;
        }
    }

    async getForecast(lat, lon) {
        const cacheKey = `forecast_${lat}_${lon}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }

        try {
            // Use the global API service for weather data
            const data = await window.app.apiService.getWeatherData(lat, lon);
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: data.forecast,
                timestamp: Date.now()
            });
            
            return data.forecast;
        } catch (error) {
            console.error('Failed to fetch weather forecast:', error);
            throw error;
        }
    }

    formatCurrentWeather(weatherData) {
        if (!weatherData) return null;

        return {
            temperature: Math.round(weatherData.main.temp),
            feelsLike: Math.round(weatherData.main.feels_like),
            humidity: weatherData.main.humidity,
            pressure: weatherData.main.pressure,
            windSpeed: weatherData.wind?.speed || 0,
            windDirection: weatherData.wind?.deg || 0,
            windGust: weatherData.wind?.gust || 0,
            visibility: weatherData.visibility ? (weatherData.visibility / 1000).toFixed(1) : 'N/A',
            cloudiness: weatherData.clouds.all,
            description: weatherData.weather[0].description,
            icon: weatherData.weather[0].icon,
            sunrise: new Date(weatherData.sys.sunrise * 1000),
            sunset: new Date(weatherData.sys.sunset * 1000)
        };
    }

    formatForecast(forecastData) {
        if (!forecastData || !forecastData.list) return [];

        return forecastData.list.map(item => ({
            datetime: new Date(item.dt * 1000),
            temperature: Math.round(item.main.temp),
            humidity: item.main.humidity,
            windSpeed: item.wind?.speed || 0,
            windDirection: item.wind?.deg || 0,
            description: item.weather[0].description,
            icon: item.weather[0].icon,
            rainProbability: item.pop * 100,
            rain: item.rain?.['3h'] || 0
        }));
    }

    getWeatherIcon(iconCode) {
        const iconMap = {
            '01d': '☀️', '01n': '🌙',
            '02d': '⛅', '02n': '☁️',
            '03d': '☁️', '03n': '☁️',
            '04d': '☁️', '04n': '☁️',
            '09d': '🌧️', '09n': '🌧️',
            '10d': '🌦️', '10n': '🌧️',
            '11d': '⛈️', '11n': '⛈️',
            '13d': '❄️', '13n': '❄️',
            '50d': '🌫️', '50n': '🌫️'
        };
        
        return iconMap[iconCode] || '🌤️';
    }

    getFireRiskLevel(weather) {
        if (!weather) return 'unknown';

        let riskScore = 0;

        // Temperature factor (higher = more risk)
        if (weather.temperature > 35) riskScore += 3;
        else if (weather.temperature > 30) riskScore += 2;
        else if (weather.temperature > 25) riskScore += 1;

        // Humidity factor (lower = more risk)
        if (weather.humidity < 20) riskScore += 3;
        else if (weather.humidity < 40) riskScore += 2;
        else if (weather.humidity < 60) riskScore += 1;

        // Wind factor (higher = more risk)
        if (weather.windSpeed > 15) riskScore += 3;
        else if (weather.windSpeed > 10) riskScore += 2;
        else if (weather.windSpeed > 5) riskScore += 1;

        // Cloud cover factor (less clouds = more risk)
        if (weather.cloudiness < 20) riskScore += 1;

        if (riskScore >= 7) return 'extreme';
        if (riskScore >= 5) return 'high';
        if (riskScore >= 3) return 'moderate';
        return 'low';
    }

    getFireRiskColor(riskLevel) {
        const colors = {
            'extreme': '#ff1744',
            'high': '#ff6b6b',
            'moderate': '#ffa500',
            'low': '#4ecdc4',
            'unknown': '#999'
        };
        return colors[riskLevel] || colors.unknown;
    }

    getWindDirection(degrees) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    }

    async getWeatherForFire(lat, lon) {
        try {
            const [currentWeather, forecast] = await Promise.all([
                this.getCurrentWeather(lat, lon),
                this.getForecast(lat, lon)
            ]);

            const formattedCurrent = this.formatCurrentWeather(currentWeather);
            const formattedForecast = this.formatForecast(forecast);
            const riskLevel = this.getFireRiskLevel(formattedCurrent);

            return {
                current: formattedCurrent,
                forecast: formattedForecast.slice(0, 8), // Next 24 hours (8 * 3-hour intervals)
                riskLevel: riskLevel,
                riskColor: this.getFireRiskColor(riskLevel)
            };
        } catch (error) {
            console.error('Failed to get weather for fire:', error);
            return null;
        }
    }

    clearCache() {
        this.cache.clear();
    }

    generateWeatherHTML(weatherData, lat, lon) {
        if (!weatherData) {
            return `
                <div class="weather-section">
                    <h4>Weather Data</h4>
                    <p class="weather-error">Weather data unavailable</p>
                    <small>Configure your OpenWeather API key in settings</small>
                </div>
            `;
        }

        const { current, forecast, riskLevel } = weatherData;
        
        const forecastHTML = forecast.slice(0, 4).map(item => {
            const time = item.datetime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
            return `
                <div class="forecast-item">
                    <span>${time}</span>
                    <span>${this.getWeatherIcon(item.icon)} ${item.temperature}°C</span>
                    <span>💨 ${item.windSpeed.toFixed(1)} m/s</span>
                </div>
            `;
        }).join('');

        return `
            <div class="weather-section">
                <h4>Current Weather</h4>
                <div class="weather-current">
                    <div class="weather-icon">${this.getWeatherIcon(current.icon)}</div>
                    <div class="weather-info">
                        <h4>${current.temperature}°C (feels like ${current.feelsLike}°C)</h4>
                        <p>${current.description}</p>
                    </div>
                </div>
                
                <div class="weather-details">
                    <div class="weather-grid">
                        <div class="weather-item">
                            <span class="weather-label">Humidity:</span>
                            <span class="weather-value">${current.humidity}%</span>
                        </div>
                        <div class="weather-item">
                            <span class="weather-label">Wind:</span>
                            <span class="weather-value">${current.windSpeed.toFixed(1)} m/s ${this.getWindDirection(current.windDirection)}</span>
                        </div>
                        <div class="weather-item">
                            <span class="weather-label">Pressure:</span>
                            <span class="weather-value">${current.pressure} hPa</span>
                        </div>
                        <div class="weather-item">
                            <span class="weather-label">Visibility:</span>
                            <span class="weather-value">${current.visibility} km</span>
                        </div>
                    </div>
                </div>

                <div class="fire-risk" style="border-left: 4px solid ${this.getFireRiskColor(riskLevel)}">
                    <h5>Fire Risk Level: <span style="color: ${this.getFireRiskColor(riskLevel)}">${riskLevel.toUpperCase()}</span></h5>
                    <p>Based on temperature, humidity, and wind conditions</p>
                </div>

                <div class="weather-forecast">
                    <h5>Next 12 Hours</h5>
                    ${forecastHTML}
                </div>
            </div>
        `;
    }
}

// Create global weather service instance
window.weatherService = new WeatherService();
