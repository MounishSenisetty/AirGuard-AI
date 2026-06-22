"""
Hyperlocal AQI Forecasting Agent
Combines meteorological patterns, traffic prediction, and seasonal emission calendars
to forecast 24-72 hour AQI at station level.
"""

import random
import math
from datetime import datetime, timedelta


SEASON_MULTIPLIERS = {
    11: 1.8, 12: 2.1, 1: 2.0, 2: 1.7,  # Winter: high pollution
    3: 1.3, 4: 1.1,                        # Spring: moderate
    5: 1.0, 6: 0.8, 7: 0.7, 8: 0.75,     # Monsoon: low (rain washes)
    9: 0.9, 10: 1.3                         # Post-monsoon: rising
}

CITY_BASE_AQI = {
    "Delhi": 185,
    "Mumbai": 115,
    "Kolkata": 145,
    "Bengaluru": 95,
    "Chennai": 105
}

ZONE_MULTIPLIERS = {
    "Industrial": 1.35,
    "Commercial": 1.15,
    "Residential": 1.0,
    "Mixed": 1.10
}

HOUR_PATTERN = [
    0.7, 0.65, 0.6, 0.6, 0.65, 0.75,  # 0-5 AM: low
    0.9, 1.1, 1.3, 1.2, 1.0, 0.95,    # 6-11 AM: morning rush peak
    0.9, 0.85, 0.85, 0.9, 1.0, 1.15,  # 12-17: afternoon
    1.25, 1.35, 1.2, 1.05, 0.9, 0.8   # 18-23: evening rush
]


def get_wind_dispersion(hour: int, wind_speed_kmh: float = 12.0) -> float:
    """Atmospheric dispersion factor based on hour and wind."""
    if 10 <= hour <= 16:
        mixing_height = 1.5  # Good mixing during day
    else:
        mixing_height = 0.6  # Poor mixing at night (temperature inversion)

    wind_factor = min(1.0, wind_speed_kmh / 20.0)
    return (mixing_height * 0.5 + wind_factor * 0.5)


def forecast_station(station: dict, hours_ahead: int = 72) -> list:
    """
    Generate AQI forecast for a station for the next N hours.
    Returns list of {timestamp, aqi, pm25, pm10, no2, o3, confidence}.
    """
    city = station["city"]
    zone = station.get("zone", "Mixed")

    month = datetime.now().month
    season_factor = SEASON_MULTIPLIERS.get(month, 1.0)
    city_base = CITY_BASE_AQI.get(city, 120)
    zone_factor = ZONE_MULTIPLIERS.get(zone, 1.0)

    base = city_base * season_factor * zone_factor

    forecast = []
    now = datetime.now()

    # Simulate a weather event (rain clearing) randomly
    rain_start = random.randint(24, 60) if random.random() > 0.6 else None

    for h in range(hours_ahead):
        ts = now + timedelta(hours=h)
        hour_of_day = ts.hour

        hour_factor = HOUR_PATTERN[hour_of_day]
        wind_speed = 8 + 10 * math.sin(math.pi * hour_of_day / 12)  # Wind varies
        dispersion = get_wind_dispersion(hour_of_day, wind_speed)

        # Apply rain clearing effect
        if rain_start and rain_start <= h <= rain_start + 6:
            rain_factor = 0.4
        elif rain_start and h > rain_start + 6:
            rain_factor = 0.7 + (h - rain_start - 6) * 0.03  # Gradual recovery
            rain_factor = min(1.0, rain_factor)
        else:
            rain_factor = 1.0

        # Add realistic noise
        noise = random.gauss(0, 0.08)

        aqi = base * hour_factor * (1.0 / (dispersion + 0.1)) * rain_factor * (1 + noise)
        aqi = max(20, min(500, int(aqi)))

        pm25 = aqi * 0.42 + random.gauss(0, 5)
        pm10 = aqi * 0.65 + random.gauss(0, 8)
        no2 = aqi * 0.18 + random.gauss(0, 3)
        o3 = max(10, 40 + hour_of_day * 2 - abs(hour_of_day - 14) * 3 + random.gauss(0, 5))

        # Confidence degrades over time
        confidence = max(0.55, 0.95 - h * 0.006)

        forecast.append({
            "hour": h,
            "timestamp": ts.strftime("%Y-%m-%d %H:%M"),
            "aqi": aqi,
            "pm25": round(max(0, pm25), 1),
            "pm10": round(max(0, pm10), 1),
            "no2": round(max(0, no2), 1),
            "o3": round(o3, 1),
            "wind_speed_kmh": round(wind_speed, 1),
            "confidence": round(confidence, 2),
            "category": get_aqi_category(aqi)
        })

    return forecast


def get_aqi_category(aqi: int) -> str:
    if aqi <= 50:   return "Good"
    if aqi <= 100:  return "Satisfactory"
    if aqi <= 200:  return "Moderate"
    if aqi <= 300:  return "Poor"
    if aqi <= 400:  return "Very Poor"
    return "Severe"


def get_aqi_color(aqi: int) -> str:
    if aqi <= 50:   return "#00e400"
    if aqi <= 100:  return "#ffff00"
    if aqi <= 200:  return "#ff7e00"
    if aqi <= 300:  return "#ff0000"
    if aqi <= 400:  return "#8f3f97"
    return "#7e0023"
