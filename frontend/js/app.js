/* ── AirGuard AI Frontend Application ── */

const API = '';  // Empty = same origin (relative URLs)

let map, stationMarkers = {}, pollutantChart, cityAqiChart, forecastChart, pollForecastChart, attributionChart;
let allStations = [], allCities = [];

// ── AQI colour helpers ──────────────────────────────────────────────────────
function aqiColor(aqi) {
  if (aqi <= 50)  return '#00e400';
  if (aqi <= 100) return '#d4d400';
  if (aqi <= 200) return '#ff7e00';
  if (aqi <= 300) return '#ff0000';
  if (aqi <= 400) return '#8f3f97';
  return '#7e0023';
}

function aqiCategory(aqi) {
  if (aqi <= 50)  return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

function aqiTextClass(aqi) {
  if (aqi <= 50)  return 'text-good';
  if (aqi <= 100) return 'text-accent';
  if (aqi <= 200) return 'text-moderate';
  if (aqi <= 300) return 'text-poor';
  return 'text-severe';
}

// ── Tab switching ───────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t => {
    if (t.getAttribute('onclick').includes(name)) t.classList.add('active');
  });

  if (name === 'forecast') initForecastTab();
  if (name === 'attribution') initAttributionTab();
  if (name === 'enforcement') loadEnforcement();
}

// ── Loading ─────────────────────────────────────────────────────────────────
function showLoading() { document.getElementById('loadingOverlay').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loadingOverlay').classList.add('hidden'); }

// ── API helper ───────────────────────────────────────────────────────────────
async function apiFetch(url) {
  const res = await fetch(API + url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── INIT MAP ─────────────────────────────────────────────────────────────────
function initMap() {
  map = L.map('map', { zoomControl: true }).setView([22.5, 80], 5);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd', maxZoom: 19
  }).addTo(map);
}

function updateMapMarkers(stations) {
  // Clear old markers
  Object.values(stationMarkers).forEach(m => m.remove());
  stationMarkers = {};

  stations.forEach(s => {
    const color = aqiColor(s.aqi);
    const size = Math.max(20, Math.min(40, s.aqi / 12));

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:${size}px;height:${size}px;
        background:${color};
        border-radius:50%;
        border:2px solid rgba(255,255,255,0.4);
        display:flex;align-items:center;justify-content:center;
        font-size:${size > 28 ? 11 : 9}px;font-weight:700;color:#000;
        box-shadow:0 0 12px ${color}80;
        cursor:pointer;
      ">${s.aqi}</div>`,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
    });

    const marker = L.marker([s.lat, s.lon], { icon })
      .addTo(map)
      .bindPopup(`
        <div style="background:#111827;color:#e2e8f0;padding:12px;border-radius:8px;min-width:200px;font-family:Segoe UI,sans-serif;">
          <div style="font-weight:700;font-size:14px;margin-bottom:8px;">${s.name}</div>
          <div style="font-size:12px;color:#8896aa;">${s.city} · ${s.zone}</div>
          <div style="font-size:28px;font-weight:800;color:${color};margin:8px 0;">${s.aqi}</div>
          <div style="font-size:12px;font-weight:600;color:${color};">${s.category}</div>
          <div style="font-size:11px;color:#8896aa;margin-top:8px;">
            PM2.5: ${s.pm25} · PM10: ${s.pm10}<br>
            NO₂: ${s.no2} · O₃: ${s.o3}
          </div>
          <button onclick="openStationModal('${s.id}')" style="
            margin-top:10px;background:rgba(0,196,255,0.15);border:1px solid rgba(0,196,255,0.3);
            color:#00c4ff;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;width:100%;
          ">View Details →</button>
        </div>
      `, { className: 'dark-popup' });

    stationMarkers[s.id] = marker;
  });
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  showLoading();
  try {
    const [stationsData, citiesData] = await Promise.all([
      apiFetch('/api/stations'),
      apiFetch('/api/cities')
    ]);

    allStations = stationsData.stations;
    allCities = citiesData.cities;

    renderCityCards(allCities);
    updateMapMarkers(allStations);
    renderStationTable(allStations);
    renderPollutantChart(allStations);
    renderCityAqiChart(allCities);

    document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
  } catch (e) {
    console.error(e);
  } finally {
    hideLoading();
  }
}

function renderCityCards(cities) {
  const container = document.getElementById('cityCards');
  container.innerHTML = cities.map(c => {
    const color = aqiColor(c.avg_aqi);
    return `
      <div class="city-card" style="--card-accent:${color}" onclick="map.setView([${c.lat},${c.lon}],11);switchTab('dashboard')">
        <div class="city-card-name"><i class="fas fa-city" style="color:${color};margin-right:6px;"></i>${c.city}</div>
        <div class="city-card-aqi" style="color:${color}">${c.avg_aqi}</div>
        <div class="city-card-cat" style="color:${color}">${c.category}</div>
        <div class="city-card-stations">${c.station_count} stations · ${c.population_millions}M pop.</div>
      </div>
    `;
  }).join('');
}

function renderStationTable(stations) {
  const sorted = [...stations].sort((a, b) => b.aqi - a.aqi);
  const tbody = document.getElementById('stationTableBody');
  tbody.innerHTML = sorted.map(s => {
    const color = aqiColor(s.aqi);
    return `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td>${s.city}</td>
        <td><span style="color:var(--text-muted)">${s.zone}</span></td>
        <td><span class="aqi-badge" style="background:${color}22;color:${color};border:1px solid ${color}44">
          ${s.aqi}
        </span></td>
        <td><span class="cat-badge" style="background:${color}22;color:${color}">${s.category}</span></td>
        <td>${s.pm25}</td>
        <td>${s.pm10}</td>
        <td>${s.no2}</td>
        <td>
          <button class="action-btn" onclick="openStationModal('${s.id}')"><i class="fas fa-chart-line"></i> Forecast</button>
          <button class="action-btn" onclick="switchTab('attribution');document.getElementById('attributionStation').value='${s.id}';loadAttribution()"><i class="fas fa-layer-group"></i> Attribution</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderPollutantChart(stations) {
  const ctx = document.getElementById('pollutantChart').getContext('2d');
  if (pollutantChart) pollutantChart.destroy();

  // Average pollutants across all stations
  const avg = (key) => Math.round(stations.reduce((s, st) => s + (st[key]||0), 0) / stations.length);

  pollutantChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['PM2.5', 'PM10', 'NO₂', 'SO₂', 'CO×10', 'O₃'],
      datasets: [{
        label: 'Avg (µg/m³)',
        data: [avg('pm25'), avg('pm10'), avg('no2'), avg('so2'), avg('co')*10, avg('o3')],
        backgroundColor: ['#ff7e00','#ff0000','#8f3f97','#7e0023','#00c4ff','#00e400'],
        borderRadius: 4
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8896aa' }, grid: { color: '#1e2d47' } },
        y: { ticks: { color: '#8896aa' }, grid: { color: '#1e2d47' } }
      }
    }
  });
}

function renderCityAqiChart(cities) {
  const ctx = document.getElementById('cityAqiChart').getContext('2d');
  if (cityAqiChart) cityAqiChart.destroy();

  cityAqiChart = new Chart(ctx, {
    type: 'horizontalBar',
    data: {
      labels: cities.map(c => c.city),
      datasets: [{
        label: 'Avg AQI',
        data: cities.map(c => c.avg_aqi),
        backgroundColor: cities.map(c => aqiColor(c.avg_aqi) + '99'),
        borderColor: cities.map(c => aqiColor(c.avg_aqi)),
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8896aa' }, grid: { color: '#1e2d47' } },
        y: { ticks: { color: '#8896aa' }, grid: { color: '#1e2d47' } }
      }
    }
  });
}

// ── FORECAST TAB ─────────────────────────────────────────────────────────────
function initForecastTab() {
  const select = document.getElementById('forecastStation');
  if (select.options.length === 0) {
    allStations.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.city})`;
      select.appendChild(opt);
    });
  }
  loadForecast();
}

async function loadForecast() {
  const stationId = document.getElementById('forecastStation').value;
  const hours = document.getElementById('forecastHours').value;
  if (!stationId) return;

  showLoading();
  try {
    const data = await apiFetch(`/api/stations/${stationId}/forecast?hours=${hours}`);
    renderForecastChart(data);
    renderForecastSummary(data);
    renderForecastTable(data);
  } finally {
    hideLoading();
  }
}

function renderForecastSummary(data) {
  const fc = data.forecast;
  const aqis = fc.map(f => f.aqi);
  const peak = Math.max(...aqis);
  const min = Math.min(...aqis);
  const peakTime = fc[aqis.indexOf(peak)].timestamp;
  const avgConf = Math.round(fc.reduce((s, f) => s + f.confidence, 0) / fc.length * 100);

  document.getElementById('forecastSummary').innerHTML = `
    <div class="forecast-stat">
      <div class="forecast-stat-val ${aqiTextClass(fc[0].aqi)}">${fc[0].aqi}</div>
      <div class="forecast-stat-label">Current AQI</div>
    </div>
    <div class="forecast-stat">
      <div class="forecast-stat-val ${aqiTextClass(peak)}">${peak}</div>
      <div class="forecast-stat-label">Peak in ${data.forecast.length}h</div>
    </div>
    <div class="forecast-stat">
      <div class="forecast-stat-val text-good">${min}</div>
      <div class="forecast-stat-label">Minimum</div>
    </div>
    <div class="forecast-stat">
      <div class="forecast-stat-val text-accent">${avgConf}%</div>
      <div class="forecast-stat-label">Avg Confidence</div>
    </div>
    <div class="forecast-stat">
      <div class="forecast-stat-val" style="font-size:14px;color:#8896aa">${new Date(peakTime).toLocaleString('en-IN', {hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'})}</div>
      <div class="forecast-stat-label">Peak Time</div>
    </div>
  `;
}

function renderForecastChart(data) {
  const ctx = document.getElementById('forecastChart').getContext('2d');
  if (forecastChart) forecastChart.destroy();

  // Show every 3rd point to avoid crowding
  const step = data.forecast.length > 48 ? 3 : 2;
  const points = data.forecast.filter((_, i) => i % step === 0);

  forecastChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: points.map(p => {
        const d = new Date(p.timestamp);
        return `${d.getDate()}/${d.getMonth()+1} ${String(d.getHours()).padStart(2,'0')}h`;
      }),
      datasets: [
        {
          label: 'Forecast AQI',
          data: points.map(p => p.aqi),
          borderColor: '#00c4ff',
          backgroundColor: 'rgba(0,196,255,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: points.map(p => aqiColor(p.aqi))
        },
        {
          label: 'Upper Bound',
          data: points.map(p => Math.round(p.aqi * (1 + (1-p.confidence)*0.5))),
          borderColor: 'rgba(0,196,255,0.2)',
          borderDash: [4,4],
          pointRadius: 0,
          fill: false,
          tension: 0.4
        },
        {
          label: 'Lower Bound',
          data: points.map(p => Math.round(p.aqi * (1 - (1-p.confidence)*0.5))),
          borderColor: 'rgba(0,196,255,0.2)',
          borderDash: [4,4],
          pointRadius: 0,
          fill: '-1',
          backgroundColor: 'rgba(0,196,255,0.04)',
          tension: 0.4
        }
      ]
    },
    options: {
      plugins: {
        legend: { labels: { color: '#8896aa', font: { size: 11 } } },
        annotation: {}
      },
      scales: {
        x: { ticks: { color: '#8896aa', maxRotation: 45, font: { size: 10 } }, grid: { color: '#1e2d47' } },
        y: { ticks: { color: '#8896aa' }, grid: { color: '#1e2d47' }, min: 0 }
      }
    }
  });

  // Pollutant trend chart
  const ctx2 = document.getElementById('pollutantForecastChart').getContext('2d');
  if (pollForecastChart) pollForecastChart.destroy();

  pollForecastChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: points.map(p => {
        const d = new Date(p.timestamp);
        return `${String(d.getHours()).padStart(2,'0')}h`;
      }),
      datasets: [
        { label: 'PM2.5', data: points.map(p => p.pm25), borderColor: '#ff7e00', pointRadius: 0, tension: 0.4 },
        { label: 'PM10', data: points.map(p => p.pm10), borderColor: '#ff0000', pointRadius: 0, tension: 0.4 },
        { label: 'NO₂', data: points.map(p => p.no2), borderColor: '#8f3f97', pointRadius: 0, tension: 0.4 },
        { label: 'O₃', data: points.map(p => p.o3), borderColor: '#00e400', pointRadius: 0, tension: 0.4 }
      ]
    },
    options: {
      plugins: { legend: { labels: { color: '#8896aa', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#8896aa', font: { size: 10 } }, grid: { color: '#1e2d47' } },
        y: { ticks: { color: '#8896aa' }, grid: { color: '#1e2d47' } }
      }
    }
  });
}

function renderForecastTable(data) {
  const rows = data.forecast.filter((_, i) => i % 3 === 0).slice(0, 24);
  document.getElementById('forecastTable').innerHTML = `
    <table>
      <thead><tr>
        <th>Time</th><th>AQI</th><th>Category</th><th>PM2.5</th><th>PM10</th><th>Wind (km/h)</th><th>Confidence</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => {
          const color = aqiColor(r.aqi);
          return `<tr>
            <td>${r.timestamp}</td>
            <td><span style="color:${color};font-weight:700">${r.aqi}</span></td>
            <td><span class="cat-badge" style="background:${color}22;color:${color}">${r.category}</span></td>
            <td>${r.pm25}</td><td>${r.pm10}</td><td>${r.wind_speed_kmh}</td>
            <td><span style="color:${r.confidence>0.8?'#00e400':r.confidence>0.65?'#ff7e00':'#ff0000'}">${Math.round(r.confidence*100)}%</span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;
}

// ── ATTRIBUTION TAB ──────────────────────────────────────────────────────────
function initAttributionTab() {
  const select = document.getElementById('attributionStation');
  if (select.options.length === 0) {
    allStations.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.city})`;
      select.appendChild(opt);
    });
  }
  loadAttribution();
}

async function loadAttribution() {
  const stationId = document.getElementById('attributionStation').value;
  if (!stationId) return;

  showLoading();
  try {
    const data = await apiFetch(`/api/stations/${stationId}/attribution`);
    renderAttributionChart(data);
    renderAttributionSummary(data);
    renderNearbySources(data.nearby_emission_sources);
  } finally {
    hideLoading();
  }
}

function renderAttributionSummary(data) {
  const color = aqiColor(data.current_aqi);
  document.getElementById('attributionSummary').innerHTML = `
    <div class="attr-stat">
      <div class="attr-stat-val" style="color:${color}">${data.current_aqi}</div>
      <div class="attr-stat-label">Current AQI</div>
    </div>
    <div class="attr-stat">
      <div class="attr-stat-val text-accent">${Math.round(data.overall_confidence*100)}%</div>
      <div class="attr-stat-label">Attribution Confidence</div>
    </div>
    <div class="attr-stat" style="grid-column:1/-1">
      <div style="font-size:12px;color:var(--text-muted)">Dominant Source</div>
      <div style="font-size:16px;font-weight:700;margin-top:4px;text-transform:capitalize;">
        ${data.dominant_source.replace(/_/g,' ')}
        <span style="color:${color};margin-left:8px">${data.dominant_fraction_pct}%</span>
      </div>
    </div>
  `;
}

function renderAttributionChart(data) {
  const ctx = document.getElementById('attributionChart').getContext('2d');
  if (attributionChart) attributionChart.destroy();

  const labels = Object.keys(data.source_breakdown).map(k => k.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()));
  const values = Object.values(data.source_breakdown).map(v => v.fraction_pct);
  const colors = ['#ff7e00', '#ff0000', '#8f3f97', '#7e0023', '#00c4ff', '#00e400'];

  attributionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.map(c => c + 'cc'),
        borderColor: colors,
        borderWidth: 2
      }]
    },
    options: {
      plugins: {
        legend: { labels: { color: '#e2e8f0', font: { size: 12 }, padding: 16 } },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}%` }
        }
      }
    }
  });
}

function renderNearbySources(sources) {
  document.getElementById('nearbySourcesList').innerHTML = sources.map(src => `
    <div class="source-card risk-${src.risk_level}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div class="source-card-name">${src.name}</div>
        <span class="risk-chip risk-${src.risk_level}">${src.risk_level}</span>
      </div>
      <div class="source-meta">
        <span><i class="fas fa-tag"></i> ${src.type}</span>
        <span><i class="fas fa-map-pin"></i> ${src.distance_km} km</span>
        <span><i class="fas fa-chart-bar"></i> Influence: ${Math.round(src.influence_weight*100)}%</span>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:6px;">
        Last inspected: ${src.last_inspection}
      </div>
    </div>
  `).join('');
}

// ── ENFORCEMENT TAB ───────────────────────────────────────────────────────────
async function loadEnforcement() {
  const city = document.getElementById('enforcementCity')?.value || '';
  showLoading();
  try {
    const url = city ? `/api/enforcement?city=${city}&limit=10` : '/api/enforcement?limit=10';
    const data = await apiFetch(url);
    renderEnforcementList(data.recommendations);
    document.getElementById('enforcementStats').innerHTML = `
      <div class="enf-stat"><div class="enf-stat-val">${data.total}</div><div class="enf-stat-label">Total Sources</div></div>
      <div class="enf-stat"><div class="enf-stat-val" style="color:#ff4444">${data.recommendations.filter(r=>r.risk_level==='critical').length}</div><div class="enf-stat-label">Critical</div></div>
      <div class="enf-stat"><div class="enf-stat-val" style="color:#ff7e00">${data.recommendations.filter(r=>r.risk_level==='high').length}</div><div class="enf-stat-label">High Risk</div></div>
    `;
  } finally {
    hideLoading();
  }
}

function renderEnforcementList(recs) {
  document.getElementById('enforcementList').innerHTML = recs.map(r => {
    const evidenceBadges = [
      r.geospatial_evidence.satellite_detected ? '<span class="evidence-badge"><i class="fas fa-satellite"></i> Satellite</span>' : '',
      r.geospatial_evidence.cctv_available ? '<span class="evidence-badge"><i class="fas fa-video"></i> CCTV</span>' : '',
      r.geospatial_evidence.ais_tracked ? '<span class="evidence-badge"><i class="fas fa-ship"></i> AIS</span>' : '',
      '<span class="evidence-badge"><i class="fas fa-map-pin"></i> Geospatial</span>'
    ].filter(Boolean).join('');

    return `
    <div class="enforcement-card risk-${r.risk_level}">
      <div class="enf-header">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <div class="enf-rank">#${r.rank}</div>
          <div>
            <div class="enf-title">${r.source_name}</div>
            <div class="enf-meta">
              <span class="risk-chip risk-${r.risk_level}">${r.risk_level.toUpperCase()}</span>
              <span style="margin-left:8px"><i class="fas fa-city"></i> ${r.city}</span>
              <span style="margin-left:8px"><i class="fas fa-industry"></i> ${r.source_type}</span>
              <span style="margin-left:8px;${r.inspection_overdue?'color:#ff6666':''}"
                ><i class="fas fa-clock"></i> Last inspected ${r.last_inspection_days_ago}d ago ${r.inspection_overdue?'⚠️ OVERDUE':''}</span>
            </div>
          </div>
        </div>
        <div class="enf-score">Priority Score<span>${r.priority_score}</span></div>
      </div>

      <div class="enf-violations">
        ${r.detected_violations.map(v => `<div class="violation-item"><i class="fas fa-exclamation-triangle"></i>${v}</div>`).join('')}
      </div>

      <div class="evidence-badges">${evidenceBadges}</div>

      <div class="enf-actions">
        ${r.recommended_actions.map(a => `<span class="action-tag">${a}</span>`).join('')}
        <span class="timeline-badge"><i class="fas fa-clock"></i> Respond within ${r.response_timeline_hours}h</span>
      </div>

      <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">
        <i class="fas fa-user-tie"></i> Authority: ${r.authority}
        &nbsp;|&nbsp; City AQI: <span style="color:${aqiColor(r.city_avg_aqi)}">${r.city_avg_aqi}</span>
      </div>
    </div>
    `;
  }).join('');
}

// ── AI ADVISORY TAB ───────────────────────────────────────────────────────────
function askAdvisory(question) {
  document.getElementById('advisoryInput').value = question;
  sendAdvisory();
}

async function sendAdvisory() {
  const input = document.getElementById('advisoryInput');
  const query = input.value.trim();
  if (!query) return;

  const city = document.getElementById('advisoryCity').value;
  const chatMessages = document.getElementById('chatMessages');

  // Add user message
  chatMessages.innerHTML += `
    <div class="chat-msg user">
      <div class="chat-bubble">${escapeHtml(query)}</div>
    </div>
  `;
  input.value = '';
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Loading indicator
  const loadingId = 'chat-loading-' + Date.now();
  chatMessages.innerHTML += `
    <div class="chat-msg bot" id="${loadingId}">
      <div class="chat-bubble"><i class="fas fa-circle-notch fa-spin"></i> Analysing air quality data...</div>
    </div>
  `;
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const res = await fetch('/api/advisory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, city })
    });
    const data = await res.json();

    document.getElementById(loadingId).remove();

    const aiLabel = data.ai_powered
      ? '<span style="color:#00c4ff;font-size:10px;"><i class="fas fa-robot"></i> Claude AI</span>'
      : '<span style="color:#8896aa;font-size:10px;"><i class="fas fa-database"></i> Rule Engine</span>';

    chatMessages.innerHTML += `
      <div class="chat-msg bot">
        <div class="chat-bubble">
          ${escapeHtml(data.advisory)}
          <div class="chat-aqi-context">
            ${aiLabel}
            &nbsp;|&nbsp;
            <span style="color:${aqiColor(data.current_aqi)}">${data.location}: AQI ${data.current_aqi} (${data.category})</span>
          </div>
        </div>
      </div>
    `;
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (e) {
    document.getElementById(loadingId).remove();
    chatMessages.innerHTML += `
      <div class="chat-msg bot">
        <div class="chat-bubble" style="color:#ff6666">Sorry, I couldn't connect to the advisory service. Please try again.</div>
      </div>
    `;
  }
}

// ── STATION MODAL ──────────────────────────────────────────────────────────────
async function openStationModal(stationId) {
  const station = allStations.find(s => s.id === stationId);
  if (!station) return;

  document.getElementById('modalTitle').textContent = `${station.name} — ${station.city}`;
  document.getElementById('stationModal').classList.remove('hidden');

  const color = aqiColor(station.aqi);

  document.getElementById('modalBody').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div style="background:var(--bg3);border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:48px;font-weight:800;color:${color}">${station.aqi}</div>
        <div style="font-size:14px;font-weight:600;color:${color}">${station.category}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${station.zone} Zone</div>
      </div>
      <div style="background:var(--bg3);border-radius:10px;padding:16px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
          <div><div style="color:var(--text-muted)">PM2.5</div><div style="font-weight:700">${station.pm25} µg/m³</div></div>
          <div><div style="color:var(--text-muted)">PM10</div><div style="font-weight:700">${station.pm10} µg/m³</div></div>
          <div><div style="color:var(--text-muted)">NO₂</div><div style="font-weight:700">${station.no2} µg/m³</div></div>
          <div><div style="color:var(--text-muted)">O₃</div><div style="font-weight:700">${station.o3} µg/m³</div></div>
          <div><div style="color:var(--text-muted)">SO₂</div><div style="font-weight:700">${station.so2} µg/m³</div></div>
          <div><div style="color:var(--text-muted)">CO</div><div style="font-weight:700">${station.co} mg/m³</div></div>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <button class="action-btn" onclick="closeModal();switchTab('forecast');document.getElementById('forecastStation').value='${stationId}';loadForecast()">
        <i class="fas fa-chart-line"></i> View 72h Forecast
      </button>
      <button class="action-btn" onclick="closeModal();switchTab('attribution');document.getElementById('attributionStation').value='${stationId}';loadAttribution()">
        <i class="fas fa-layer-group"></i> Source Attribution
      </button>
      <button class="action-btn" onclick="closeModal();switchTab('advisory');document.getElementById('advisoryCity').value='${station.city}';askAdvisory('What is the health risk at ${station.name} right now?')">
        <i class="fas fa-robot"></i> Get AI Advisory
      </button>
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:12px;">
      <i class="fas fa-clock"></i> Last updated: ${station.timestamp}
      &nbsp;|&nbsp; Coordinates: ${station.lat.toFixed(4)}, ${station.lon.toFixed(4)}
      &nbsp;|&nbsp; Pop. density: ${(station.population_density/1000).toFixed(0)}k/km²
    </div>
  `;
}

function closeModal() {
  document.getElementById('stationModal').classList.add('hidden');
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Close modal on backdrop click
document.getElementById('stationModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadDashboard();

  // Auto-refresh every 60 seconds
  setInterval(loadDashboard, 60000);
});
