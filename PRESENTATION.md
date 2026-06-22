# AirGuard AI — Presentation Deck
## ET AI Hackathon 2026 · Problem Statement 5

---

## Slide 1: THE PROBLEM

> **1.67 million Indians die prematurely every year from air pollution.**
> The data exists. The intelligence layer does not.

- India has **900+ CAAQMS monitoring stations** under the National Clean Air Programme
- Yet a 2024 CAG audit found only **31% of cities** have any actionable response protocols
- City administrators see dashboards — but **cannot attribute sources**, **cannot forecast**, **cannot act before the damage is done**
- The gap is not sensors. It is **intelligence**.

---

## Slide 2: OUR SOLUTION — AirGuard AI

**An AI-powered Urban Air Quality Intelligence platform** that fuses:
- IoT sensor data (CAAQMS) + Satellite imagery (Sentinel/MODIS)
- Mobility feeds + Meteorological forecasts
- Land use maps + Emission source databases

Into **4 AI agents** that transform monitoring into **intervention**.

---

## Slide 3: THE 4 AI AGENTS

### 🔮 Forecasting Agent
- 24–72 hour AQI predictions at 1km grid resolution
- Integrates meteorological dispersion modelling + traffic patterns + seasonal calendars
- Provides confidence intervals — enables **scheduling interventions in advance**

### 🔍 Source Attribution Engine
- Attributes current AQI to 6 source categories (vehicular, industrial, biomass, etc.)
- Uses receptor-source spatial modelling + satellite thermal anomaly detection
- Ward-level confidence scores — tells **who is responsible, not just what level**

### 🛡️ Enforcement Intelligence Agent
- Ranks emission sources by priority score (risk level + AQI impact + inspection overdue)
- Packages geospatial evidence (satellite + CCTV + coordinates)
- Generates court-admissible enforcement recommendations with legal authority mapping

### 🤖 AI Citizen Advisory (Claude-powered)
- Conversational health guidance via web, WhatsApp, IVR
- Personalised by location, activity, vulnerability group
- Supports **12 Indian regional languages**

---

## Slide 4: TECHNICAL ARCHITECTURE

```
DATA SOURCES
├── CAAQMS real-time feeds (900+ stations)
├── Sentinel/MODIS satellite thermal imagery  
├── Traffic density & mobility APIs
├── IMD meteorological forecasts
├── GIS land use & construction permit databases
└── Emission source inspection records

DATA PIPELINE
└── Real-time streaming → Normalisation → Spatial indexing → Feature engineering

AI AGENTS (FastAPI backend)
├── Forecasting Agent      — atmospheric dispersion + ML time series
├── Attribution Engine     — receptor modelling + satellite correlation
├── Enforcement Agent      — risk scoring + evidence packaging
└── Advisory Agent         — Claude Haiku (Anthropic) + RAG over CPCB docs

KNOWLEDGE LAYER
├── Vector store (regulatory documents, past advisories)
├── Knowledge graph (source → zone → station relationships)
└── CPCB/OISD regulatory RAG corpus

OUTPUTS
├── Live real-time map dashboard
├── 72-hour AQI forecast charts
├── Source attribution doughnut + evidence
├── Prioritised enforcement action list
└── Citizen health advisory chatbot
```

---

## Slide 5: DEMO WALKTHROUGH

1. **Live Dashboard** — 17 stations across 5 cities, real-time AQI map with colour-coded markers
2. **Forecast Tab** — Select Anand Vihar, Delhi → 72h AQI prediction with confidence bands, peak alert at 6 PM
3. **Attribution Tab** — 38% Industrial Stack, 22% Vehicular, 12% Biomass Burning with nearby sources
4. **Enforcement Tab** — #1 priority: Manali Petrochemical Complex (Chennai, critical, 239 inspection-days overdue)
5. **AI Advisory** — "Is it safe to run outdoors today?" → personalised, context-aware guidance

---

## Slide 6: BUSINESS IMPACT

| Metric | Current State | AirGuard AI |
|--------|--------------|-------------|
| Source attribution | Not available | Ward-level, 6 categories, confidence-scored |
| AQI forecast | 24h national-level only | 72h, 1km grid, with uncertainty bands |
| Enforcement | Complaint-driven, weeks delay | Priority-ranked within hours |
| Citizen advisory | Generic AQI numbers | Personalised, multi-language, conversational |
| Response time (signal → intervention) | Days to weeks | Hours |

**If deployed across India's 50 most polluted cities:**
- Estimated 15–25% reduction in enforcement response time
- Source attribution enables targeted intervention vs. blanket restrictions
- 1.67M premature deaths annually — even 1% reduction = 16,700 lives

---

## Slide 7: INNOVATION HIGHLIGHTS

- **Compound intelligence** — No single sensor sees the full picture. We fuse 6 data streams into one causal model
- **Agentic architecture** — Each agent is independently valuable AND orchestrated together
- **Evidence-first enforcement** — Geospatial + satellite + CCTV evidence packaged automatically for legal use
- **Conversational AI for public health** — Claude API + regional language support = accessible at population scale
- **Confidence-scored outputs** — Every prediction includes uncertainty quantification. No false certainty

---

## Slide 8: SCALABILITY & ROADMAP

**Phase 1 (Current Prototype):** 5 cities, 17 stations, simulated sensor feeds
**Phase 2:** Integration with live CPCB CAAQMS API, Sentinel-5P satellite data, IMD feeds
**Phase 3:** Multi-city deployment, WhatsApp bot launch, PCB officer mobile app
**Phase 4:** National scale — 131 non-attainment cities under NCAP

**Tech stack is cloud-native:** FastAPI → containerised → deploys on any cloud or on-premise government infrastructure

---

## Judging Criteria Alignment

| Criterion | Weight | Our Approach |
|-----------|--------|-------------|
| Innovation | 25% | Compound multi-source attribution; AI-driven enforcement prioritisation |
| Business Impact | 25% | Direct link to 1.67M deaths; actionable outputs for administrators + PCB |
| Technical Excellence | 20% | 4 AI agents, RAG, geospatial, dispersion modelling, Claude API |
| Scalability | 15% | REST API + city-agnostic data model + cloud-native architecture |
| User Experience | 15% | Real-time map, interactive forecast, enforcement cards, chat advisory |
