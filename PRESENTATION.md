# AirGuard AI
### ET AI Hackathon 2026 · Problem Statement 5 · Urban Air Quality Intelligence

---

## Slide 1: Why We Built This

Eight months ago, a colleague's father was hospitalised in Delhi with a sudden asthma attack. The AQI that day was 287. He had no warning — just a number on his phone that meant nothing to him until he was in the emergency room.

That story isn't unusual. **1.67 million Indians die prematurely every year from air pollution.** That's more than four thousand people every single day. And what makes this so frustrating is that it doesn't have to be this way.

India already has over 900 air quality monitoring stations running under the National Clean Air Programme. The data is being collected. Satellites are imaging our cities daily. Weather forecasts exist. Emission source records exist.

But a 2024 CAG audit found that only 31% of cities with monitoring data have any real response protocol linked to those readings. City administrators look at dashboards showing red numbers and have no way to answer the only questions that actually matter:

- *Which source is causing this, right now, in this neighbourhood?*
- *How bad will it be tomorrow morning?*
- *Which factory or construction site do I send inspectors to first?*
- *What should I tell my residents to do?*

The gap isn't in the data. It's in the intelligence layer between the data and the decision.

That's what we set out to build.

---

## Slide 2: What AirGuard AI Does

AirGuard AI is a real-time urban air quality intelligence platform that takes data from six different sources — sensor networks, satellite imagery, traffic feeds, weather forecasts, land-use maps, and emission source records — and turns all of it into answers that city administrators, enforcement officers, and ordinary citizens can actually act on.

We didn't want to build another dashboard. Dashboards tell you the problem is bad. We wanted to build something that tells you *why* it's bad, *where* it's going, and *what to do about it* — before the damage is done.

The platform runs four AI agents, each solving a different piece of the problem:

**The Forecasting Agent** looks 72 hours ahead, predicting AQI at 1km grid resolution by combining atmospheric dispersion patterns with traffic flow, seasonal emission calendars, and meteorological data. Instead of reactive advisories after the air is already bad, cities can schedule street-watering, odd-even restrictions, or school closures *before* the worst hours hit.

**The Source Attribution Engine** answers the hardest question in air quality management: not what the AQI is, but *who caused it*. Using spatial-temporal pattern analysis and satellite thermal anomaly detection, it breaks down current pollution into six source categories — vehicular, industrial stacks, biomass burning, construction dust, domestic sources, and secondary aerosols — at ward level, with confidence scores. For the first time, enforcement decisions can be evidence-based rather than instinct-based.

**The Enforcement Intelligence Agent** ranks every emission source in the city by a priority score that combines current AQI impact, source risk level, and how long since the last inspection. It packages geospatial evidence — satellite flags, CCTV availability, GPS coordinates — into something an officer can carry into the field and a prosecutor can carry into court.

**The AI Citizen Advisory** is built for the person who just wants to know if it's safe to let their kid play outside today. It's a conversational health assistant, context-aware by location and vulnerability group, that gives specific answers — not just AQI numbers. It covers asthma management, outdoor exercise windows, mask guidance, and what to do indoors when levels spike.

---

## Slide 3: A Walk Through the Platform

When you open AirGuard AI, the first thing you see is a live map of all 17 monitoring stations across Delhi, Mumbai, Bengaluru, Kolkata, and Chennai — each one a coloured circle whose size and hue tells you immediately how bad it is. You can click any station and see every pollutant reading in real time.

Flip to the Forecast tab and select Anand Vihar in Delhi — one of the most polluted monitoring points in the country. You'll see a 72-hour AQI curve with shaded confidence bands showing uncertainty as you go further out. There's a clear peak visible tomorrow evening at rush hour. That's something a city administrator can act on tonight.

The Attribution tab shows you the breakdown for the same station: 35% industrial stack emissions, 22% vehicular, 15% secondary aerosol formation, 12% biomass burning. Click through to see the five nearby emission sources ranked by how much they're contributing — including one that hasn't been inspected in over 200 days.

That same source shows up as the top priority in the Enforcement tab, ranked first out of ten with a priority score based on risk level, AQI contribution, and inspection history. The card shows the detected violations, the geospatial evidence available, the recommended legal actions, and which authority should act — all within hours of the data coming in, not weeks later.

And if you're a resident in Chennai asking "should my children go to school today?", the AI Advisory tab gives you a real answer, not a number.

---

## Slide 4: How It's Built

The backend is a Python FastAPI application with three intelligence agents and one advisory agent, each implemented as its own module so they can be developed, tested, and scaled independently.

The Forecasting Agent uses an atmospheric dispersion model combined with seasonal correction factors, hourly traffic patterns, and wind speed simulation. It generates forecasts with confidence intervals that narrow toward the present and widen as uncertainty grows over 72 hours — which is the honest way to represent what a model actually knows.

The Source Attribution Engine applies receptor-source spatial modelling. Each station has a source profile that reflects its zone type — industrial, commercial, residential, mixed — and the model adjusts for seasonal factors like the biomass burning spike in November and December across North India. It weights nearby emission sources by distance and calculates their contribution influence before generating the final breakdown.

The Enforcement Agent maintains a priority scoring function that combines source risk classification, days since last inspection, and the city's current average AQI. It pulls violation templates by source type and packages them with the available evidence — whether satellite thermal anomaly detection flagged it, whether CCTV coverage exists, whether the source vehicles are AIS-trackable.

The Advisory Agent is a rule engine that maps queries against AQI level, returning specific, differentiated guidance for exercise, masks, children, asthma patients, elderly residents, ventilation, timing, and outdoor workers. It's built to be upgraded with a language model when an API key is available, but works completely standalone without one.

The frontend is plain HTML, CSS, and JavaScript — no framework — using Leaflet.js for the map and Chart.js for the forecast and attribution charts. It's intentionally lightweight so it can run in any government or municipal environment without complex infrastructure dependencies.

```
Data Sources → Ingestion Pipeline → AI Agents → FastAPI REST → Browser Dashboard
     ↑                                                              ↓
  CAAQMS / Satellite / Traffic / IMD / GIS / Emission Records   Citizens / Officers / Administrators
```

---

## Slide 5: The Gap This Closes

This is what exists today and what AirGuard AI adds:

| What administrators need | What exists today | What AirGuard AI provides |
|--------------------------|-------------------|---------------------------|
| Know which source to blame | Nothing | Ward-level attribution across 6 categories, confidence-scored |
| Plan ahead | 24h national-level forecast only | 72h hyperlocal prediction at 1km grid with uncertainty bands |
| Decide who to inspect first | Complaint-driven, weeks of delay | Priority-ranked enforcement list ready within hours of a spike |
| Communicate with residents | Generic AQI numbers pushed to apps | Specific, conversational guidance by activity, location, and vulnerability |
| Move from signal to action | Days to weeks | Hours |

If this platform were deployed across India's 50 most polluted cities, even a conservative 15% improvement in enforcement response time — getting inspectors to the right place faster — would mean fewer days of unnecessary exposure for millions of people living near industrial zones.

The 1.67 million deaths number is a national statistic. Behind it are individuals. A 1% reduction is 16,700 people who live.

---

## Slide 6: What Makes This Different

Most air quality tools are built to monitor. AirGuard AI is built to intervene.

The distinction matters. A dashboard that shows AQI is not actionable. An alert that says "AQI is 287 in Anand Vihar" without saying *why* or *what to do* puts the burden back on the administrator who already doesn't have time to dig through six disconnected systems.

We built around the question of what a city administrator actually needs to take action:

They need to know *which source* is responsible — not just the aggregate number. They need *prioritised next steps* — not a list of every registered emission source in the city. They need *evidence that holds up* — not anecdote or approximation. They need *lead time* — not a notification after the harm has already happened.

Every feature in AirGuard AI is built backwards from those needs. The source attribution exists not because it's technically interesting but because without it, enforcement is guesswork. The confidence intervals on the forecast exist not to show off statistical sophistication but because a city administrator deserves to know when the model is uncertain. The enforcement evidence packaging exists because "we saw a satellite thermal anomaly near this facility" means something in a legal proceeding in a way that "we think it might be this factory" does not.

---

## Slide 7: Where This Goes Next

We built this in a hackathon. The prototype runs on simulated sensor data and a local Python server. The intelligence layer is real. Scaling it up is a matter of integration, not reinvention.

**The near-term path** is connecting to live data feeds: the CPCB CAAQMS API, Sentinel-5P satellite data from ESA, and IMD meteorological feeds. The API structure is already designed to receive real data — simulated feeds are plugged in exactly where real feeds would go.

**The medium-term path** is deploying the enforcement tool as a mobile app for PCB officers — something they can carry into the field, pull up the priority list for their district, and log the outcome of each inspection back into the system to improve the model.

**The long-term path** is national scale. India has 131 cities designated as non-attainment cities under the National Clean Air Programme. Every one of them has monitoring data and enforcement obligations. None of them currently has an intelligence layer connecting the two. That's the gap AirGuard AI was built to fill.

The tech stack is cloud-native by design. The FastAPI backend containerises cleanly and deploys on any cloud or on-premise government infrastructure. The city-agnostic data model means adding a new city is a configuration change, not a rebuild.

---

## Judging Criteria

| Criterion | Weight | How we addressed it |
|-----------|--------|---------------------|
| Innovation | 25% | First platform to combine real-time attribution, 72h forecasting, evidence-packaged enforcement, and conversational health advisory in a single system |
| Business Impact | 25% | Every feature maps directly to a decision that city administrators, PCB officers, or residents need to make — with 1.67M deaths as the stakes |
| Technical Excellence | 20% | Four independent AI agents, atmospheric dispersion modelling, geospatial evidence packaging, confidence-scored outputs throughout |
| Scalability | 15% | REST API with city-agnostic data model, containerisable, designed for live data feed integration from day one |
| User Experience | 15% | Real-time interactive map, one-click forecast drill-down, prioritised enforcement cards, conversational advisory — built for people who are not data scientists |
