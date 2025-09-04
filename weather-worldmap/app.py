from flask import Flask, render_template, request, jsonify
import requests
from datetime import datetime
import math

app = Flask(__name__)

OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast"

def get_forecast_by_latlon(lat, lon):
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m,relativehumidity_2m,windspeed_10m,weathercode",
        "daily": "temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum",
        "timezone": "auto"
    }
    r = requests.get(OPEN_METEO_FORECAST, params=params, timeout=10)
    r.raise_for_status()
    return r.json()

@app.template_filter('weather_label')
def weather_label(code):
    return {
        0: "Clear sky",1: "Mainly clear",2: "Partly cloudy",3: "Overcast",
        45: "Fog",48: "Depositing rime fog",51: "Light drizzle",53: "Moderate drizzle",
        55: "Dense drizzle",61: "Slight rain",63: "Moderate rain",65: "Heavy rain",
        71: "Slight snow",73: "Moderate snow",75: "Heavy snow",95: "Thunderstorm",
        96: "Thunderstorm with hail"
    }.get(code, f"Code {code}")

def climate_summary_from_daily(daily):
    # Compute simple seasonal/climate hints from daily values (avg temps, precipitation)
    try:
        tmax = daily.get('temperature_2m_max', [])
        tmin = daily.get('temperature_2m_min', [])
        prec = daily.get('precipitation_sum', [])
        if not tmax or not tmin:
            return {}
        avg_max = sum(tmax)/len(tmax)
        avg_min = sum(tmin)/len(tmin)
        avg_prec = (sum(prec)/len(prec)) if prec else 0.0
        climate = "Temperate"
        if avg_max >= 30:
            climate = "Hot"
        elif avg_max <= 10:
            climate = "Cold"
        if avg_prec > 5:
            wet = "Wet"
        else:
            wet = "Dry"
        return {
            "avg_max": round(avg_max,1),
            "avg_min": round(avg_min,1),
            "avg_precip_mm": round(avg_prec,1),
            "label": f"{wet} {climate}"
        }
    except Exception:
        return {}

@app.route('/api/forecast')
def api_forecast():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    if not lat or not lon:
        return jsonify({"error":"missing lat/lon"}), 400
    try:
        latf = float(lat); lonf = float(lon)
    except:
        return jsonify({"error":"invalid lat/lon"}), 400
    # fetch forecast
    try:
        data = get_forecast_by_latlon(latf, lonf)
    except requests.HTTPError as he:
        return jsonify({"error":"weather API error", "detail": str(he)}), 502
    # compute simple climate summary from daily
    daily = data.get('daily', {})
    climate = climate_summary_from_daily(daily)
    # return a compact useful payload
    return jsonify({
        "location": {"latitude": latf, "longitude": lonf},
        "forecast": data,
        "climate_summary": climate,
        "generated": datetime.utcnow().isoformat() + 'Z'
    })

@app.route('/')
def index():
    return render_template('index.html', now=datetime.now().strftime('%Y-%m-%d %H:%M'))

if __name__ == '__main__':
    app.run(debug=True, port=5000)
