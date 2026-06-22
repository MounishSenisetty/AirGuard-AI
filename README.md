# AirGuard AI
### AI-Powered Urban Air Quality Intelligence for Smart City Intervention
**ET AI Hackathon 2026 · Problem Statement 5**

---

## The Problem

India has over 900 air quality monitoring stations running under the National Clean Air Programme. The data is being collected. But a 2024 CAG audit found that only 31% of cities with monitoring data have any actionable response protocol linked to those readings.

City administrators look at dashboards showing red numbers and have no way to answer the questions that actually matter — *which source is causing this right now, how bad will it be tomorrow, who do I send inspectors to first, and what do I tell my residents to do?*

**1.67 million Indians die prematurely every year from air pollution. The gap isn't in the data. It's in the intelligence layer between data and decision.**

---

## What AirGuard AI Does

AirGuard AI is a real-time urban air quality intelligence platform that fuses data from six sources — sensor networks, satellite imagery, traffic feeds, weather forecasts, land-use maps, and emission source records — into four AI agents that give city administrators, enforcement officers, and citizens answers they can act on.

### The Four AI Agents

| Agent | What it does |
|-------|-------------|
| **Forecasting Agent** | 24–72 hour AQI predictions at 1km grid resolution, combining atmospheric dispersion modelling with traffic patterns and seasonal emission calendars |
| **Source Attribution Engine** | Breaks current pollution into 6 source categories (vehicular, industrial, biomass, construction, domestic, secondary aerosol) at ward level with confidence scores |
| **Enforcement Intelligence Agent** | Ranks emission sources by priority score — risk level + AQI impact + inspection overdue — and packages geospatial evidence for field use |
| **AI Citizen Advisory** | Conversational health guidance by location, activity, and vulnerability group (no API key required — built-in rule engine covers all major scenarios) |

---

## Live Demo

The platform covers 17 monitoring stations across 5 cities: **Delhi, Mumbai, Bengaluru, Kolkata, Chennai**

- **Dashboard** — real-time AQI map with colour-coded station markers, pollutant breakdown, and city comparison
- **Forecast** — 72h AQI curve with confidence bands, peak timing, PM2.5/PM10/NO₂/O₃ trend charts
- **Attribution** — source breakdown doughnut chart + nearby emission sources ranked by influence
- **Enforcement** — priority-ranked action cards with detected violations, evidence badges, authority mapping
- **Advisory** — health chatbot covering exercise, masks, asthma, children, elderly, outdoor workers, best times

---

## Project Structure

```
airguard-ai/
├── backend/
│   ├── main.py                  # FastAPI app, all API routes
│   ├── requirements.txt
│   ├── agents/
│   │   ├── forecasting.py       # 72h AQI forecasting agent
│   │   ├── attribution.py       # Pollution source attribution engine
│   │   └── enforcement.py       # Enforcement prioritisation agent
│   └── data/
│       ├── stations.json        # 17 monitoring stations with coordinates
│       └── emission_sources.json # 10 registered emission sources
└── frontend/
    ├── index.html               # Single-page app
    ├── css/styles.css
    └── js/app.js                # Leaflet.js map, Chart.js charts, API calls
```

---

## Running Locally

**Requirements:** Python 3.9+

```bash
# Clone the repo
git clone https://github.com/MounishSenisetty/AirGuard-AI.git
cd AirGuard-AI

# Install dependencies
pip install -r backend/requirements.txt

# Start the server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

# Open in browser
# http://localhost:8000
```

Or on Windows, just double-click `run.bat`.

### Optional: Claude AI Advisory

The advisory tab works out of the box with a rule-based engine. To upgrade to Claude-powered responses, set your Anthropic API key:

```bash
set ANTHROPIC_API_KEY=your_key_here   # Windows
export ANTHROPIC_API_KEY=your_key_here # Linux/Mac
```

---

## API Reference

| Endpoint | Description |
|----------|-------------|
| `GET /api/stations` | All 17 stations with live AQI readings |
| `GET /api/stations/{id}/forecast?hours=72` | AQI forecast for a station |
| `GET /api/stations/{id}/attribution` | Source attribution breakdown |
| `GET /api/cities` | City-level AQI summaries |
| `GET /api/enforcement?city=Delhi` | Prioritised enforcement recommendations |
| `POST /api/advisory` | AI health advisory (body: `{query, city}`) |

---

## Tech Stack

- **Backend** — Python, FastAPI, Uvicorn
- **Frontend** — HTML/CSS/JS, Leaflet.js, Chart.js
- **AI** — Rule-based advisory engine (Claude API optional)
- **Data** — Simulated CAAQMS feeds; designed for live CPCB API integration

---

## Judging Criteria Alignment

| Criterion | Weight | Approach |
|-----------|--------|----------|
| Innovation | 25% | First platform combining real-time attribution + 72h forecasting + evidence-packaged enforcement + conversational advisory in one system |
| Business Impact | 25% | Every output maps to a decision city administrators or PCB officers need to make — 1.67M deaths are the stakes |
| Technical Excellence | 20% | Four independent AI agents, atmospheric dispersion modelling, geospatial evidence packaging, confidence-scored outputs |
| Scalability | 15% | City-agnostic REST API, containerisable, designed for live data feed integration |
| User Experience | 15% | Interactive map, one-click forecast, enforcement priority cards, conversational advisory |

---

## Roadmap

- **Phase 1 (now):** Prototype — 5 cities, simulated sensor feeds, full intelligence layer working
- **Phase 2:** Live data integration — CPCB CAAQMS API, Sentinel-5P satellite, IMD meteorological feeds
- **Phase 3:** PCB officer mobile app, WhatsApp advisory bot, 12 regional languages
- **Phase 4:** National scale — 131 non-attainment cities under India's National Clean Air Programme

---

*Built for ET AI Hackathon 2026 · Problem Statement 5: AI-Powered Urban Air Quality Intelligence for Smart City Intervention*
