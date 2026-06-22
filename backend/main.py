"""
AirGuard AI - Urban Air Quality Intelligence Platform
ET AI Hackathon 2026 | Problem Statement 5
"""

import json
import math
import os
import random
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

import sys
from pathlib import Path as _Path
sys.path.insert(0, str(_Path(__file__).parent))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from agents.forecasting import forecast_station, get_aqi_category, get_aqi_color
from agents.attribution import attribute_sources, generate_city_attribution_summary
from agents.enforcement import generate_enforcement_recommendations

try:
    import anthropic
    CLAUDE_AVAILABLE = True
except ImportError:
    CLAUDE_AVAILABLE = False

DATA_DIR = Path(__file__).parent / "data"

with open(DATA_DIR / "stations.json") as f:
    STATIONS = json.load(f)

with open(DATA_DIR / "emission_sources.json") as f:
    EMISSION_SOURCES = json.load(f)

STATIONS_MAP = {s["id"]: s for s in STATIONS}

app = FastAPI(
    title="AirGuard AI",
    description="AI-Powered Urban Air Quality Intelligence Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
frontend_path = Path(__file__).parent.parent / "frontend"
app.mount("/static", StaticFiles(directory=str(frontend_path)), name="static")


# ─── Simulated live sensor readings (refreshed per request with realistic variation) ───

_aqi_cache: dict = {}
_cache_timestamp: float = 0
CACHE_TTL = 30  # seconds


def _generate_live_readings() -> dict:
    """Generate realistic AQI readings for all stations."""
    global _aqi_cache, _cache_timestamp

    now = time.time()
    if now - _cache_timestamp < CACHE_TTL and _aqi_cache:
        return _aqi_cache

    from agents.forecasting import (
        CITY_BASE_AQI, SEASON_MULTIPLIERS, ZONE_MULTIPLIERS, HOUR_PATTERN, get_wind_dispersion
    )

    month = datetime.now().month
    hour = datetime.now().hour
    season_factor = SEASON_MULTIPLIERS.get(month, 1.0)
    hour_factor = HOUR_PATTERN[hour]

    readings = {}
    for station in STATIONS:
        city_base = CITY_BASE_AQI.get(station["city"], 120)
        zone_factor = ZONE_MULTIPLIERS.get(station.get("zone", "Mixed"), 1.0)
        wind_speed = 8 + 10 * math.sin(math.pi * hour / 12)
        dispersion = get_wind_dispersion(hour, wind_speed)
        noise = random.gauss(0, 0.10)

        aqi = city_base * season_factor * zone_factor * hour_factor * (1.0 / (dispersion + 0.1)) * (1 + noise)
        aqi = max(20, min(500, int(aqi)))

        readings[station["id"]] = {
            "aqi": aqi,
            "city": station["city"],
            "pm25": round(aqi * 0.42 + random.gauss(0, 4), 1),
            "pm10": round(aqi * 0.65 + random.gauss(0, 7), 1),
            "no2": round(aqi * 0.18 + random.gauss(0, 3), 1),
            "so2": round(random.uniform(5, 45), 1),
            "co": round(random.uniform(0.5, 4.5), 2),
            "o3": round(max(10, 40 + hour * 2 - abs(hour - 14) * 3 + random.gauss(0, 5)), 1),
            "category": get_aqi_category(aqi),
            "color": get_aqi_color(aqi),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    _aqi_cache = readings
    _cache_timestamp = now
    return readings


# ─── API Routes ────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def root():
    html_file = frontend_path / "index.html"
    if html_file.exists():
        return HTMLResponse(content=html_file.read_text(encoding="utf-8"))
    return HTMLResponse("<h1>AirGuard AI - Frontend not found</h1>")


@app.get("/api/stations")
async def get_stations():
    """Get all monitoring stations with current AQI readings."""
    readings = _generate_live_readings()

    result = []
    for station in STATIONS:
        reading = readings.get(station["id"], {})
        result.append({
            **station,
            **reading,
        })

    return {"stations": result, "timestamp": datetime.now().isoformat(), "total": len(result)}


@app.get("/api/stations/{station_id}/forecast")
async def get_forecast(station_id: str, hours: int = Query(72, ge=24, le=168)):
    """Get AQI forecast for a specific station."""
    if station_id not in STATIONS_MAP:
        raise HTTPException(status_code=404, detail="Station not found")

    station = STATIONS_MAP[station_id]
    forecast = forecast_station(station, hours_ahead=hours)

    return {
        "station_id": station_id,
        "station_name": station["name"],
        "city": station["city"],
        "forecast": forecast,
        "generated_at": datetime.now().isoformat()
    }


@app.get("/api/stations/{station_id}/attribution")
async def get_attribution(station_id: str):
    """Get pollution source attribution for a station."""
    if station_id not in STATIONS_MAP:
        raise HTTPException(status_code=404, detail="Station not found")

    station = STATIONS_MAP[station_id]
    readings = _generate_live_readings()
    current_aqi = readings.get(station_id, {}).get("aqi", 150)

    result = attribute_sources(station, EMISSION_SOURCES, current_aqi, month=datetime.now().month)
    return result


@app.get("/api/cities/{city}/summary")
async def get_city_summary(city: str):
    """Get city-wide AQI summary and source attribution."""
    valid_cities = list({s["city"] for s in STATIONS})
    if city not in valid_cities:
        raise HTTPException(status_code=404, detail=f"City not found. Valid: {valid_cities}")

    readings = _generate_live_readings()
    city_stations = [s for s in STATIONS if s["city"] == city]

    aqi_values = [readings[s["id"]]["aqi"] for s in city_stations if s["id"] in readings]
    avg_aqi = int(sum(aqi_values) / len(aqi_values)) if aqi_values else 0
    max_aqi = max(aqi_values) if aqi_values else 0
    min_aqi = min(aqi_values) if aqi_values else 0

    attribution_summary = generate_city_attribution_summary(city, STATIONS, EMISSION_SOURCES, readings)

    return {
        "city": city,
        "avg_aqi": avg_aqi,
        "max_aqi": max_aqi,
        "min_aqi": min_aqi,
        "category": get_aqi_category(avg_aqi),
        "station_count": len(city_stations),
        "source_attribution": attribution_summary["city_wide_attribution"],
        "worst_station": max(city_stations, key=lambda s: readings.get(s["id"], {}).get("aqi", 0))["name"],
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/enforcement")
async def get_enforcement_recommendations(city: Optional[str] = None, limit: int = Query(10, le=20)):
    """Get prioritised enforcement action recommendations."""
    readings = _generate_live_readings()

    sources = EMISSION_SOURCES
    if city:
        sources = [s for s in EMISSION_SOURCES if s["city"] == city]

    recs = generate_enforcement_recommendations(sources, readings, [])
    return {
        "recommendations": recs[:limit],
        "total": len(recs),
        "generated_at": datetime.now().isoformat()
    }


@app.get("/api/cities")
async def get_cities():
    """Get list of all monitored cities with summary stats."""
    readings = _generate_live_readings()
    cities = list({s["city"] for s in STATIONS})

    city_data = []
    for city in cities:
        city_stations = [s for s in STATIONS if s["city"] == city]
        aqis = [readings.get(s["id"], {}).get("aqi", 150) for s in city_stations]
        avg = int(sum(aqis) / len(aqis)) if aqis else 0

        # City center (approximate)
        lat = sum(s["lat"] for s in city_stations) / len(city_stations)
        lon = sum(s["lon"] for s in city_stations) / len(city_stations)

        city_data.append({
            "city": city,
            "avg_aqi": avg,
            "category": get_aqi_category(avg),
            "color": get_aqi_color(avg),
            "station_count": len(city_stations),
            "lat": round(lat, 4),
            "lon": round(lon, 4),
            "population_millions": {"Delhi": 32.9, "Mumbai": 20.7, "Bengaluru": 13.2, "Kolkata": 14.9, "Chennai": 10.5}.get(city, 10)
        })

    city_data.sort(key=lambda x: x["avg_aqi"], reverse=True)
    return {"cities": city_data, "timestamp": datetime.now().isoformat()}


class AdvisoryRequest(BaseModel):
    query: str
    city: Optional[str] = None
    station_id: Optional[str] = None


@app.post("/api/advisory")
async def get_citizen_advisory(req: AdvisoryRequest):
    """
    AI-powered citizen health advisory using Claude.
    Generates personalised health guidance based on current AQI conditions.
    """
    readings = _generate_live_readings()

    # Build context
    if req.station_id and req.station_id in readings:
        reading = readings[req.station_id]
        station = STATIONS_MAP.get(req.station_id, {})
        context_aqi = reading["aqi"]
        context_loc = f"{station.get('name', '')}, {station.get('city', '')}"
    elif req.city:
        city_stations = [s for s in STATIONS if s["city"] == req.city]
        aqis = [readings.get(s["id"], {}).get("aqi", 150) for s in city_stations]
        context_aqi = int(sum(aqis) / len(aqis)) if aqis else 150
        context_loc = req.city
    else:
        context_aqi = 165
        context_loc = "your city"

    category = get_aqi_category(context_aqi)
    pm25_approx = round(context_aqi * 0.42, 1)

    if CLAUDE_AVAILABLE and os.environ.get("ANTHROPIC_API_KEY"):
        client = anthropic.Anthropic()
        system_prompt = """You are AirGuard AI, an expert public health advisory system for urban air quality in India.
        You provide concise, actionable health guidance based on real-time AQI data.
        Always respond in 3-4 sentences max. Be specific, practical and empathetic.
        Include specific protective actions. When relevant, mention vulnerable groups (elderly, children, asthma patients).
        Do NOT use markdown headers — plain conversational text only."""

        user_message = f"""Current air quality at {context_loc}: AQI {context_aqi} ({category}), PM2.5 ≈ {pm25_approx} µg/m³.

User question: {req.query}

Provide a health advisory response."""

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[{"role": "user", "content": user_message}],
            system=system_prompt
        )
        advisory_text = message.content[0].text
    else:
        # Fallback rule-based advisory
        advisory_text = _rule_based_advisory(req.query, context_aqi, category, context_loc)

    return {
        "advisory": advisory_text,
        "location": context_loc,
        "current_aqi": context_aqi,
        "category": category,
        "color": get_aqi_color(context_aqi),
        "ai_powered": CLAUDE_AVAILABLE and bool(os.environ.get("ANTHROPIC_API_KEY")),
        "timestamp": datetime.now().isoformat()
    }


def _rule_based_advisory(query: str, aqi: int, category: str, location: str) -> str:
    query_lower = query.lower()

    if aqi > 400:
        base = f"Air quality in {location} is Severe (AQI {aqi}) — a public health emergency level. Do not go outdoors under any circumstances. Keep all windows and doors tightly shut, use an air purifier indoors if available, and seek medical attention immediately if you experience breathing difficulty, chest pain, or severe coughing."
    elif aqi > 300:
        base = f"Air quality in {location} is Very Poor (AQI {aqi}). Avoid all outdoor activities. If you must go out, wear an N95/FFP2 mask — surgical masks are not adequate at this level. People with heart disease, asthma, or COPD should stay strictly indoors and keep medicines accessible."
    elif aqi > 200:
        base = f"Air quality in {location} is Poor (AQI {aqi}). Limit outdoor time, especially between 8–10 AM and 6–9 PM when traffic peaks. Wear N95 masks outdoors. Elderly residents, young children, pregnant women, and those with respiratory or heart conditions should stay indoors."
    elif aqi > 100:
        base = f"Air quality in {location} is Moderate (AQI {aqi}). Healthy adults can go about normal activities, but sensitive groups — children, elderly, asthma patients — should reduce prolonged outdoor exertion. Early morning (5–7 AM) generally has better air quality than the rest of the day."
    elif aqi > 50:
        base = f"Air quality in {location} is Satisfactory (AQI {aqi}). Outdoor conditions are generally fine. People with severe respiratory conditions may want to avoid extended outdoor exertion during peak traffic hours."
    else:
        base = f"Air quality in {location} is Good (AQI {aqi}) — one of the better air quality days. Enjoy outdoor activities freely. This is an excellent day for morning exercise, cycling, or time in parks."

    if "exercise" in query_lower or "run" in query_lower or "jog" in query_lower or "walk" in query_lower or "gym" in query_lower:
        if aqi > 300:
            return base + " All outdoor exercise is strongly inadvisable today — work out indoors only."
        elif aqi > 200:
            return base + " Outdoor exercise is not recommended. Consider an indoor gym or yoga session instead. If you must exercise outside, keep it under 20 minutes and wear an N95 mask."
        elif aqi > 100:
            return base + " For outdoor exercise, aim for 5–7 AM when pollution is lower. Keep the session under 45 minutes and avoid main roads. Bring water and stop if you feel any throat irritation."
        else:
            return base + " Great day for outdoor exercise — early morning is ideal. Stay hydrated, especially if running near traffic corridors."

    if "child" in query_lower or "kid" in query_lower or "school" in query_lower or "baby" in query_lower:
        if aqi > 300:
            return base + " Children are especially vulnerable at this pollution level. Schools should cancel all outdoor activities and PT classes. Keep children indoors with windows closed."
        elif aqi > 200:
            return base + " Schools should avoid outdoor sports and recess today. Children with asthma must carry their reliever inhalers. If your child develops a cough, wheezing, or eye irritation, consult a doctor."
        elif aqi > 100:
            return base + " Children with asthma or allergies should take their preventive medication as prescribed. Limit outdoor play to under 30 minutes and avoid peak traffic hours."
        else:
            return base + " Children can play outdoors normally. Keep asthma inhalers accessible as a precaution."

    if "mask" in query_lower:
        if aqi > 300:
            return base + " An N95 or FFP2 respirator is mandatory for any outdoor exposure — surgical or cloth masks provide no meaningful PM2.5 protection at this level."
        elif aqi > 200:
            return base + " N95 masks (not surgical masks) are strongly recommended. Ensure you get a tight seal. Replace after 8 hours of use."
        elif aqi > 100:
            return base + " N95 masks are advisable for prolonged outdoor exposure, especially near busy roads or construction sites."
        return base + " Masks are not necessary for healthy adults in current conditions."

    if "asthma" in query_lower or "lung" in query_lower or "breath" in query_lower or "respiratory" in query_lower or "copd" in query_lower:
        if aqi > 200:
            return base + " People with asthma or COPD should stay indoors, take preventive inhalers as prescribed, and have reliever inhalers within reach. If you experience increased wheezing or shortness of breath, seek medical attention promptly."
        elif aqi > 100:
            return base + " Asthma patients should take their preventive medications as prescribed and avoid outdoor exertion. Keep your reliever inhaler accessible. Watch for worsening symptoms — especially increased night coughing."
        return base + " Air quality is manageable for most asthma patients today. Continue regular medications and avoid triggers like dust and vehicle exhaust."

    if "elderly" in query_lower or "old" in query_lower or "senior" in query_lower or "heart" in query_lower:
        if aqi > 200:
            return base + " Elderly residents and those with heart disease should remain indoors. Pollution at this level stresses the cardiovascular system and can trigger cardiac events in vulnerable individuals."
        elif aqi > 100:
            return base + " Elderly residents should limit outdoor activities to brief, necessary outings. Avoid peak traffic hours (8–10 AM and 6–9 PM). Stay well-hydrated indoors."
        return base + " Conditions are manageable for elderly residents today. Brief outdoor walks are fine — avoid prolonged exposure near busy roads."

    if "window" in query_lower or "indoor" in query_lower or "home" in query_lower or "ventilat" in query_lower:
        if aqi > 200:
            return base + " Keep all windows and doors closed. Use wet cloth at door gaps if possible. An air purifier with HEPA filter significantly improves indoor air quality in these conditions."
        elif aqi > 100:
            return base + " Ventilate your home in the early morning (5–7 AM) when outdoor AQI is typically lower, then close windows as the day progresses and traffic peaks."
        return base + " Natural ventilation is fine today. Open windows during the day for fresh air — it will help more than it harms."

    if "when" in query_lower or "time" in query_lower or "best" in query_lower or "improve" in query_lower:
        return base + " The best outdoor window is typically 5–7 AM, before traffic builds and before the temperature inversion traps pollutants near ground level. AQI usually worsens from 7–10 AM and again from 5–9 PM during evening commute."

    if "outdoor worker" in query_lower or "construction" in query_lower or "labour" in query_lower or "farmer" in query_lower:
        if aqi > 200:
            return base + " Outdoor workers at this pollution level should take mandatory rest breaks every 45 minutes in a sheltered area, wear N95 masks throughout the shift, and report any dizziness, headache, or chest tightness to a supervisor immediately."
        elif aqi > 100:
            return base + " Outdoor workers should wear N95 masks and take regular breaks in shaded, less-exposed areas. Drink water every 30 minutes. Employers must provide masks under Delhi HC and CPCB worker health directives."
        return base + " Outdoor workers can operate normally. Masks are recommended near high-traffic zones or construction dust as good practice."

    return base


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "AirGuard AI", "timestamp": datetime.now().isoformat()}
