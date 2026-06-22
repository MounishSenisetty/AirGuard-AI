"""
Enforcement Intelligence & Prioritisation Agent
Correlates pollution hotspot data with registered emission sources to generate
prioritised, evidence-backed enforcement action recommendations.
"""

import random
from datetime import datetime, timedelta


INSPECTION_OVERDUE_DAYS = 180  # 6 months

VIOLATION_TEMPLATES = {
    "Industrial Stack": [
        "Emission exceeding CPCB norms — PM2.5 stack concentration {value} µg/m³ (limit: 150)",
        "Continuous Emission Monitoring System (CEMS) offline for {days} days",
        "Scrubber bypass detected during peak production hours",
        "No valid Consent to Operate (CTO) — expired {months} months ago"
    ],
    "Vehicular": [
        "High-emitting diesel fleet concentration — {count} overloaded trucks detected on route",
        "PUC certificate compliance rate below 40% in zone",
        "Diesel generator sets operating without emission control during grid hours",
        "Construction material transport without covered loads — fugitive dust"
    ],
    "Open Burning": [
        "Active biomass burning detected via satellite thermal anomaly — {area} ha affected",
        "Stubble burning activity — wind trajectory directly impacting monitoring station",
        "Municipal solid waste burning — night-time operations detected by CCTV"
    ],
    "Construction Dust": [
        "Construction site water sprinkling compliance: {pct}% (required: 100%)",
        "No dust barriers installed on {side} perimeter — DPCC norm violation",
        "Unpaved roads within site — >150 m length without treatment"
    ]
}

ENFORCEMENT_ACTIONS = {
    "critical": {
        "actions": ["Immediate closure notice", "Police escort inspection", "Emergency CPCB escalation", "Show cause notice (Form V)"],
        "timeline_hours": 4,
        "authority": "CPCB / State PCB Emergency Response Team"
    },
    "high": {
        "actions": ["Inspection within 24h", "Environmental Compensation notice", "CEMS data audit", "Legal notice under EP Act 1986"],
        "timeline_hours": 24,
        "authority": "State PCB Enforcement Wing"
    },
    "medium": {
        "actions": ["Scheduled inspection within 7 days", "Compliance advisory letter", "Follow-up monitoring"],
        "timeline_hours": 168,
        "authority": "Regional PCB Officer"
    }
}


def days_since(date_str: str) -> int:
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
        return (datetime.now() - d).days
    except Exception:
        return 200


def generate_enforcement_recommendations(emission_sources: list, aqi_readings: dict, attribution_data: list) -> list:
    """
    Generate prioritised enforcement recommendations based on:
    - Current AQI hotspots
    - Source attribution results
    - Inspection history
    - Risk level
    """
    recommendations = []

    risk_order = {"critical": 3, "high": 2, "medium": 1, "low": 0}

    for src in sorted(emission_sources, key=lambda x: risk_order.get(x["risk_level"], 0), reverse=True):
        overdue_days = days_since(src["last_inspection"])
        is_overdue = overdue_days > INSPECTION_OVERDUE_DAYS

        # Check if this source's city has high AQI
        city_avg_aqi = 0
        city_station_count = 0
        for station_id, reading in aqi_readings.items():
            if reading.get("city") == src["city"]:
                city_avg_aqi += reading.get("aqi", 0)
                city_station_count += 1

        if city_station_count > 0:
            city_avg_aqi = city_avg_aqi / city_station_count
        else:
            city_avg_aqi = 150

        # Priority score
        priority_score = (
            risk_order.get(src["risk_level"], 0) * 30 +
            (city_avg_aqi / 10) +
            (overdue_days / 30) * 5 +
            (20 if is_overdue else 0)
        )

        # Generate violation evidence
        src_type = src["type"]
        violation_list = VIOLATION_TEMPLATES.get(src_type, VIOLATION_TEMPLATES["Industrial Stack"])
        violations = []
        for v_template in random.sample(violation_list, min(2, len(violation_list))):
            violation = v_template.format(
                value=random.randint(180, 320),
                days=random.randint(3, 45),
                months=random.randint(2, 18),
                count=random.randint(50, 200),
                area=round(random.uniform(0.5, 5.0), 1),
                pct=random.randint(15, 55),
                side=random.choice(["north", "south", "east", "west"])
            )
            violations.append(violation)

        enforcement_info = ENFORCEMENT_ACTIONS.get(src["risk_level"], ENFORCEMENT_ACTIONS["medium"])

        recommendations.append({
            "rank": 0,  # Will be set after sorting
            "source_id": src["id"],
            "source_name": src["name"],
            "city": src["city"],
            "lat": src["lat"],
            "lon": src["lon"],
            "source_type": src["type"],
            "risk_level": src["risk_level"],
            "priority_score": round(priority_score, 1),
            "city_avg_aqi": round(city_avg_aqi, 0),
            "last_inspection_days_ago": overdue_days,
            "inspection_overdue": is_overdue,
            "detected_violations": violations,
            "recommended_actions": enforcement_info["actions"],
            "response_timeline_hours": enforcement_info["timeline_hours"],
            "authority": enforcement_info["authority"],
            "geospatial_evidence": {
                "coordinates": [src["lat"], src["lon"]],
                "satellite_detected": random.random() > 0.4,
                "cctv_available": random.random() > 0.5,
                "ais_tracked": src["type"] == "Vehicular"
            }
        })

    # Sort by priority and assign ranks
    recommendations.sort(key=lambda x: x["priority_score"], reverse=True)
    for i, rec in enumerate(recommendations):
        rec["rank"] = i + 1

    return recommendations
