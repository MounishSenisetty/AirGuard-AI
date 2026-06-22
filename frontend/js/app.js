/* ── AirGuard AI — Frontend Application ── */

const API = '';
let map, stationMarkers = {}, pollutantChart, cityAqiChart, forecastChart,
    pollForecastChart, attributionChart, comparisonBarChart;
let allStations = [], allCities = [];

// ── AQI helpers ──────────────────────────────────────────────────────────────
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

// ── Toast notifications ───────────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  const icons = { error: 'fa-circle-xmark', success: 'fa-circle-check', info: 'fa-circle-info' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fas ${icons[type]}"></i><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'fadeOut 0.4s ease forwards';
    setTimeout(() => el.remove(), 400);
  }, duration);
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t => {
    if (t.getAttribute('onclick').includes(`'${name}'`)) t.classList.add('active');
  });
  if (name === 'forecast')    initForecastTab();
  if (name === 'attribution') initAttributionTab();
  if (name === 'enforcement') loadEnforcement();
  if (name === 'comparison')  loadComparison();
}

// ── Loading ───────────────────────────────────────────────────────────────────
function showLoading() { document.getElementById('loadingOverlay').classList.remove('hidden'); }
function hideLoading()  { document.getElementById('loadingOverlay').classList.add('hidden'); }

// ── API helper ────────────────────────────────────────────────────────────────
async function apiFetch(url) {
  const res = await fetch(API + url);
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  return res.json();
}

// ── Map ───────────────────────────────────────────────────────────────────────
function initMap() {
  map = L.map('map', { zoomControl: true }).setView([22.5, 80], 5);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd', maxZoom: 19
  }).addTo(map);
}

function updateMapMarkers(stations) {
  Object.values(stationMarkers).forEach(m => m.remove());
  stationMarkers = {};
  stations.forEach(s => {
    const color = aqiColor(s.aqi);
    const size  = Math.max(20, Math.min(40, s.aqi / 12));
    const icon  = L.divIcon({
      className: '',
      html: `<div style="
        width:${size}px;height:${size}px;background:${color};border-radius:50%;
        border:2px solid rgba(255,255,255,0.4);display:flex;align-items:center;
        justify-content:center;font-size:${size > 28 ? 11 : 9}px;font-weight:700;
        color:#000;box-shadow:0 0 12px ${color}80;cursor:pointer;">${s.aqi}</div>`,
      iconSize: [size, size], iconAnchor: [size/2, size/2]
    });
    const marker = L.marker([s.lat, s.lon], { icon }).addTo(map)
      .bindPopup(`
        <div style="background:#111827;color:#e2e8f0;padding:14px 16px;border-radius:10px;min-width:210px;font-family:Segoe UI,sans-serif;">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${s.name}</div>
          <div style="font-size:12px;color:#8896aa;margin-bottom:10px;">${s.city} · ${s.zone}</div>
          <div style="font-size:32px;font-weight:800;color:${color};line-height:1;">${s.aqi}</div>
          <div style="font-size:12px;font-weight:600;color:${color};margin:4px 0 10px;">${s.category}</div>
          <div style="font-size:11px;color:#8896aa;line-height:1.8;">
            PM2.5: <b style="color:#e2e8f0">${s.pm25}</b> &nbsp;
            PM10: <b style="color:#e2e8f0">${s.pm10}</b><br>
            NO₂: <b style="color:#e2e8f0">${s.no2}</b> &nbsp;
            O₃: <b style="color:#e2e8f0">${s.o3}</b>
          </div>
          <button onclick="openStationModal('${s.id}')"
            style="margin-top:12px;background:rgba(0,196,255,0.15);border:1px solid rgba(0,196,255,0.3);
            color:#00c4ff;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:11px;width:100%;">
            View Details & Forecast →
          </button>
        </div>`, { className: 'dark-popup' });
    stationMarkers[s.id] = marker;
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  showLoading();
  try {
    const [stData, ctData] = await Promise.all([
      apiFetch('/api/stations'),
      apiFetch('/api/cities')
    ]);
    allStations = stData.stations;
    allCities   = ctData.cities;

    // Alerts banner — any severe/very poor cities
    const badCities = allCities.filter(c => c.avg_aqi > 300);
    const banner = document.getElementById('alertsBanner');
    if (badCities.length > 0) {
      document.getElementById('alertsText').textContent =
        `HEALTH ALERT: ${badCities.map(c => `${c.city} (AQI ${c.avg_aqi})`).join(', ')} — Very Poor / Severe air quality. Restrict outdoor activities.`;
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }

    renderCityCards(allCities);
    updateMapMarkers(allStations);
    renderStationTable(allStations);
    renderPollutantChart(allStations);
    renderCityAqiChart(allCities);
    document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
    populateStationSelects();
  } catch(e) {
    toast('Failed to load dashboard data. Retrying…', 'error');
    console.error(e);
  } finally {
    hideLoading();
  }
}

function populateStationSelects() {
  ['forecastStation', 'attributionStation'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel || sel.options.length > 0) return;
    allStations.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.city})`;
      sel.appendChild(opt);
    });
  });
}

function renderCityCards(cities) {
  document.getElementById('cityCards').innerHTML = cities.map(c => {
    const color = aqiColor(c.avg_aqi);
    return `<div class="city-card" style="--card-accent:${color}"
        onclick="map.setView([${c.lat},${c.lon}],11);switchTab('dashboard')">
      <div class="city-card-name"><i class="fas fa-city" style="color:${color};margin-right:6px;"></i>${c.city}</div>
      <div class="city-card-aqi" style="color:${color}">${c.avg_aqi}</div>
      <div class="city-card-cat" style="color:${color}">${c.category}</div>
      <div class="city-card-stations">${c.station_count} stations · ${c.population_millions}M pop.</div>
    </div>`;
  }).join('');
}

function renderStationTable(stations) {
  const sorted = [...stations].sort((a, b) => b.aqi - a.aqi);
  document.getElementById('stationTableBody').innerHTML = sorted.map(s => {
    const color = aqiColor(s.aqi);
    return `<tr>
      <td><strong>${s.name}</strong></td>
      <td>${s.city}</td>
      <td><span style="color:var(--text-muted)">${s.zone}</span></td>
      <td><span class="aqi-badge" style="background:${color}22;color:${color};border:1px solid ${color}44">${s.aqi}</span></td>
      <td><span class="cat-badge" style="background:${color}22;color:${color}">${s.category}</span></td>
      <td>${s.pm25}</td><td>${s.pm10}</td><td>${s.no2}</td>
      <td>
        <button class="action-btn" onclick="openStationModal('${s.id}')"><i class="fas fa-chart-line"></i> Forecast</button>
        <button class="action-btn" onclick="switchTab('attribution');document.getElementById('attributionStation').value='${s.id}';loadAttribution()"><i class="fas fa-layer-group"></i> Attribution</button>
      </td>
    </tr>`;
  }).join('');
}

function renderPollutantChart(stations) {
  const ctx = document.getElementById('pollutantChart').getContext('2d');
  if (pollutantChart) pollutantChart.destroy();
  const avg = key => Math.round(stations.reduce((s, st) => s + (st[key] || 0), 0) / stations.length);
  pollutantChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['PM2.5', 'PM10', 'NO₂', 'SO₂', 'CO×10', 'O₃'],
      datasets: [{
        label: 'Avg (µg/m³)',
        data: [avg('pm25'), avg('pm10'), avg('no2'), avg('so2'), avg('co') * 10, avg('o3')],
        backgroundColor: ['#ff7e0099','#ff000099','#8f3f9799','#7e002399','#00c4ff99','#00e40099'],
        borderColor:     ['#ff7e00',  '#ff0000',  '#8f3f97',  '#7e0023',  '#00c4ff',  '#00e400'],
        borderWidth: 1, borderRadius: 4
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
    type: 'bar',                              // FIX: was 'horizontalBar' (removed in Chart.js v4)
    data: {
      labels: cities.map(c => c.city),
      datasets: [{
        label: 'Avg AQI',
        data: cities.map(c => c.avg_aqi),
        backgroundColor: cities.map(c => aqiColor(c.avg_aqi) + '99'),
        borderColor:     cities.map(c => aqiColor(c.avg_aqi)),
        borderWidth: 1, borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',                         // horizontal bars
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8896aa' }, grid: { color: '#1e2d47' } },
        y: { ticks: { color: '#8896aa' }, grid: { color: '#1e2d47' } }
      }
    }
  });
}

// ── Forecast Tab ──────────────────────────────────────────────────────────────
function initForecastTab() {
  populateStationSelects();
  const sel = document.getElementById('forecastStation');
  if (sel && sel.options.length > 0 && !sel.value) sel.selectedIndex = 0;
  if (sel && sel.value) loadForecast();
}

async function loadForecast() {
  const stationId = document.getElementById('forecastStation').value;
  const hours     = document.getElementById('forecastHours').value;
  if (!stationId) return;
  showLoading();
  try {
    const data = await apiFetch(`/api/stations/${stationId}/forecast?hours=${hours}`);
    renderForecastSummary(data);
    renderForecastChart(data);
    renderForecastTable(data);
  } catch(e) {
    toast('Could not load forecast data.', 'error');
  } finally {
    hideLoading();
  }
}

function renderForecastSummary(data) {
  const fc   = data.forecast;
  const aqis = fc.map(f => f.aqi);
  const peak = Math.max(...aqis);
  const min  = Math.min(...aqis);
  const peakTs = fc[aqis.indexOf(peak)].timestamp;
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
      <div class="forecast-stat-val" style="font-size:12px;color:#8896aa;">
        ${new Date(peakTs).toLocaleString('en-IN',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'})}
      </div>
      <div class="forecast-stat-label">Peak Time</div>
    </div>`;
}

function renderForecastChart(data) {
  const step   = data.forecast.length > 48 ? 3 : 2;
  const points = data.forecast.filter((_, i) => i % step === 0);
  const labels = points.map(p => {
    const d = new Date(p.timestamp);
    return `${d.getDate()}/${d.getMonth()+1} ${String(d.getHours()).padStart(2,'0')}h`;
  });

  const ctx = document.getElementById('forecastChart').getContext('2d');
  if (forecastChart) forecastChart.destroy();
  forecastChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Forecast AQI', data: points.map(p => p.aqi),
          borderColor: '#00c4ff', backgroundColor: 'rgba(0,196,255,0.08)',
          fill: true, tension: 0.4, pointRadius: 3,
          pointBackgroundColor: points.map(p => aqiColor(p.aqi))
        },
        {
          label: 'Upper Bound',
          data: points.map(p => Math.round(p.aqi * (1 + (1 - p.confidence) * 0.5))),
          borderColor: 'rgba(0,196,255,0.2)', borderDash: [4,4],
          pointRadius: 0, fill: false, tension: 0.4
        },
        {
          label: 'Lower Bound',
          data: points.map(p => Math.round(p.aqi * (1 - (1 - p.confidence) * 0.5))),
          borderColor: 'rgba(0,196,255,0.2)', borderDash: [4,4],
          pointRadius: 0, fill: '-1', backgroundColor: 'rgba(0,196,255,0.04)', tension: 0.4
        }
      ]
    },
    options: {
      plugins: { legend: { labels: { color: '#8896aa', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#8896aa', maxRotation: 45, font: { size: 10 } }, grid: { color: '#1e2d47' } },
        y: { ticks: { color: '#8896aa' }, grid: { color: '#1e2d47' }, min: 0 }
      }
    }
  });

  const ctx2 = document.getElementById('pollutantForecastChart').getContext('2d');
  if (pollForecastChart) pollForecastChart.destroy();
  const shortLabels = points.map(p => `${String(new Date(p.timestamp).getHours()).padStart(2,'0')}h`);
  pollForecastChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: shortLabels,
      datasets: [
        { label: 'PM2.5', data: points.map(p => p.pm25), borderColor: '#ff7e00', pointRadius: 0, tension: 0.4 },
        { label: 'PM10',  data: points.map(p => p.pm10), borderColor: '#ff0000', pointRadius: 0, tension: 0.4 },
        { label: 'NO₂',   data: points.map(p => p.no2),  borderColor: '#8f3f97', pointRadius: 0, tension: 0.4 },
        { label: 'O₃',    data: points.map(p => p.o3),   borderColor: '#00e400', pointRadius: 0, tension: 0.4 }
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
            <td><span style="color:${r.confidence>0.8?'#00e400':r.confidence>0.65?'#ff7e00':'#ff0000'}">
              ${Math.round(r.confidence * 100)}%</span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

// ── Attribution Tab ───────────────────────────────────────────────────────────
function initAttributionTab() {
  populateStationSelects();
  const sel = document.getElementById('attributionStation');
  if (sel && sel.options.length > 0 && !sel.value) sel.selectedIndex = 0;
  if (sel && sel.value) loadAttribution();
}

async function loadAttribution() {
  const stationId = document.getElementById('attributionStation').value;
  if (!stationId) return;
  showLoading();
  try {
    const data = await apiFetch(`/api/stations/${stationId}/attribution`);
    renderAttributionSummary(data);
    renderAttributionChart(data);
    renderNearbySources(data.nearby_emission_sources);
  } catch(e) {
    toast('Could not load attribution data.', 'error');
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
      <div class="attr-stat-val text-accent">${Math.round(data.overall_confidence * 100)}%</div>
      <div class="attr-stat-label">Attribution Confidence</div>
    </div>
    <div class="attr-stat" style="grid-column:1/-1">
      <div style="font-size:12px;color:var(--text-muted)">Dominant Source</div>
      <div style="font-size:16px;font-weight:700;margin-top:4px;text-transform:capitalize;">
        ${data.dominant_source.replace(/_/g,' ')}
        <span style="color:${color};margin-left:8px">${data.dominant_fraction_pct}%</span>
      </div>
    </div>`;
}

function renderAttributionChart(data) {
  const ctx = document.getElementById('attributionChart').getContext('2d');
  if (attributionChart) attributionChart.destroy();
  const labels = Object.keys(data.source_breakdown)
    .map(k => k.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()));
  const values = Object.values(data.source_breakdown).map(v => v.fraction_pct);
  const colors = ['#ff7e00','#ff0000','#8f3f97','#7e0023','#00c4ff','#00e400'];
  attributionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors.map(c => c + 'cc'), borderColor: colors, borderWidth: 2 }]
    },
    options: {
      plugins: {
        legend: { labels: { color: '#e2e8f0', font: { size: 12 }, padding: 16 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}%` } }
      }
    }
  });
}

function renderNearbySources(sources) {
  if (!sources || sources.length === 0) {
    document.getElementById('nearbySourcesList').innerHTML =
      '<div style="color:var(--text-muted);font-size:13px;">No registered emission sources within 15 km.</div>';
    return;
  }
  document.getElementById('nearbySourcesList').innerHTML = sources.map(src => `
    <div class="source-card risk-${src.risk_level}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div class="source-card-name">${src.name}</div>
        <span class="risk-chip risk-${src.risk_level}">${src.risk_level}</span>
      </div>
      <div class="source-meta">
        <span><i class="fas fa-tag"></i> ${src.type}</span>
        <span><i class="fas fa-map-pin"></i> ${src.distance_km} km</span>
        <span><i class="fas fa-chart-bar"></i> Influence: ${Math.round(src.influence_weight * 100)}%</span>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:6px;">
        Last inspected: ${src.last_inspection}
      </div>
    </div>`).join('');
}

// ── Enforcement Tab ───────────────────────────────────────────────────────────
async function loadEnforcement() {
  const city = document.getElementById('enforcementCity')?.value || '';
  showLoading();
  try {
    const url  = city ? `/api/enforcement?city=${city}&limit=10` : '/api/enforcement?limit=10';
    const data = await apiFetch(url);
    renderEnforcementList(data.recommendations);
    const critical = data.recommendations.filter(r => r.risk_level === 'critical').length;
    const high     = data.recommendations.filter(r => r.risk_level === 'high').length;
    document.getElementById('enforcementStats').innerHTML = `
      <div class="enf-stat"><div class="enf-stat-val">${data.total}</div><div class="enf-stat-label">Total Sources</div></div>
      <div class="enf-stat"><div class="enf-stat-val" style="color:#ff4444">${critical}</div><div class="enf-stat-label">Critical</div></div>
      <div class="enf-stat"><div class="enf-stat-val" style="color:#ff7e00">${high}</div><div class="enf-stat-label">High Risk</div></div>`;
  } catch(e) {
    toast('Could not load enforcement data.', 'error');
  } finally {
    hideLoading();
  }
}

function renderEnforcementList(recs) {
  document.getElementById('enforcementList').innerHTML = recs.map(r => {
    const evidenceBadges = [
      r.geospatial_evidence.satellite_detected ? '<span class="evidence-badge"><i class="fas fa-satellite"></i> Satellite</span>' : '',
      r.geospatial_evidence.cctv_available      ? '<span class="evidence-badge"><i class="fas fa-video"></i> CCTV</span>' : '',
      r.geospatial_evidence.ais_tracked         ? '<span class="evidence-badge"><i class="fas fa-ship"></i> AIS</span>' : '',
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
              <span style="margin-left:8px;${r.inspection_overdue ? 'color:#ff6666' : ''}">
                <i class="fas fa-clock"></i> Last inspected ${r.last_inspection_days_ago}d ago
                ${r.inspection_overdue ? '⚠️ OVERDUE' : ''}
              </span>
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
    </div>`;
  }).join('');
}

// ── Comparison Tab ────────────────────────────────────────────────────────────
async function loadComparison() {
  if (!allCities.length) await loadDashboard();
  renderComparisonBarChart(allCities);
  renderComparisonGrid(allCities);
  renderComparisonTable(allCities);
}

function renderComparisonBarChart(cities) {
  const ctx = document.getElementById('comparisonBarChart').getContext('2d');
  if (comparisonBarChart) comparisonBarChart.destroy();
  comparisonBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: cities.map(c => c.city),
      datasets: [{
        label: 'Average AQI',
        data: cities.map(c => c.avg_aqi),
        backgroundColor: cities.map(c => aqiColor(c.avg_aqi) + '99'),
        borderColor:     cities.map(c => aqiColor(c.avg_aqi)),
        borderWidth: 2, borderRadius: 6
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterLabel: ctx => `  ${aqiCategory(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        x: { ticks: { color: '#8896aa' }, grid: { color: '#1e2d47' } },
        y: { ticks: { color: '#8896aa' }, grid: { color: '#1e2d47' }, min: 0, max: 500,
             title: { display: true, text: 'AQI', color: '#8896aa' } }
      }
    }
  });
}

function renderComparisonGrid(cities) {
  const stationsByCity = {};
  allStations.forEach(s => {
    if (!stationsByCity[s.city]) stationsByCity[s.city] = [];
    stationsByCity[s.city].push(s);
  });

  document.getElementById('comparisonGrid').innerHTML = cities.map(c => {
    const color    = aqiColor(c.avg_aqi);
    const stations = stationsByCity[c.city] || [];
    const avgPm25  = stations.length ? Math.round(stations.reduce((s, st) => s + (st.pm25 || 0), 0) / stations.length) : 0;
    const avgPm10  = stations.length ? Math.round(stations.reduce((s, st) => s + (st.pm10 || 0), 0) / stations.length) : 0;
    const avgNo2   = stations.length ? Math.round(stations.reduce((s, st) => s + (st.no2 || 0), 0) / stations.length) : 0;
    const maxAqi   = stations.length ? Math.max(...stations.map(s => s.aqi)) : 0;

    const bar = (val, max, col) =>
      `<div class="comparison-bar-track"><div class="comparison-bar-fill" style="width:${Math.min(100, val/max*100)}%;background:${col};"></div></div>`;

    return `
    <div class="comparison-card" style="border-top-color:${color}">
      <div class="comparison-card-city">
        <span>${c.city}</span>
        <span class="cat-badge" style="background:${color}22;color:${color}">${c.category}</span>
      </div>
      <div style="font-size:28px;font-weight:800;color:${color};margin-bottom:12px;">${c.avg_aqi} <span style="font-size:13px;font-weight:400;color:var(--text-muted)">avg AQI</span></div>
      <div class="comparison-bar-row"><span class="comparison-bar-label">PM2.5</span>${bar(avgPm25,250,'#ff7e00')}<span class="comparison-bar-val" style="color:#ff7e00">${avgPm25}</span></div>
      <div class="comparison-bar-row"><span class="comparison-bar-label">PM10</span>${bar(avgPm10,400,'#ff0000')}<span class="comparison-bar-val" style="color:#ff0000">${avgPm10}</span></div>
      <div class="comparison-bar-row"><span class="comparison-bar-label">NO₂</span>${bar(avgNo2,100,'#8f3f97')}<span class="comparison-bar-val" style="color:#8f3f97">${avgNo2}</span></div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:10px;">
        ${c.station_count} stations · Peak AQI: <span style="color:${aqiColor(maxAqi)};font-weight:600">${maxAqi}</span>
        · Pop: ${c.population_millions}M
      </div>
    </div>`;
  }).join('');
}

function renderComparisonTable(cities) {
  const stationsByCity = {};
  allStations.forEach(s => {
    if (!stationsByCity[s.city]) stationsByCity[s.city] = [];
    stationsByCity[s.city].push(s);
  });

  document.getElementById('comparisonTableBody').innerHTML = cities.map((c, i) => {
    const color    = aqiColor(c.avg_aqi);
    const stations = stationsByCity[c.city] || [];
    const worst    = stations.length ? stations.reduce((a, b) => a.aqi > b.aqi ? a : b).name : '—';
    return `<tr>
      <td><strong>#${i + 1}</strong></td>
      <td><strong>${c.city}</strong></td>
      <td><span class="aqi-badge" style="background:${color}22;color:${color};border:1px solid ${color}44">${c.avg_aqi}</span></td>
      <td><span class="cat-badge" style="background:${color}22;color:${color}">${c.category}</span></td>
      <td>${c.population_millions}M</td>
      <td>${c.station_count}</td>
      <td style="color:var(--text-muted)">${worst}</td>
    </tr>`;
  }).join('');
}

// ── AI Advisory Tab ───────────────────────────────────────────────────────────
function askAdvisory(question) {
  document.getElementById('advisoryInput').value = question;
  sendAdvisory();
}

async function sendAdvisory() {
  const input = document.getElementById('advisoryInput');
  const query = input.value.trim();
  if (!query) return;
  const city       = document.getElementById('advisoryCity').value;
  const chatMsgs   = document.getElementById('chatMessages');

  chatMsgs.innerHTML += `
    <div class="chat-msg user"><div class="chat-bubble">${escapeHtml(query)}</div></div>`;
  input.value = '';
  chatMsgs.scrollTop = chatMsgs.scrollHeight;

  const loadId = 'chat-loading-' + Date.now();
  chatMsgs.innerHTML += `
    <div class="chat-msg bot" id="${loadId}">
      <div class="chat-bubble"><i class="fas fa-circle-notch fa-spin"></i> Analysing air quality data…</div>
    </div>`;
  chatMsgs.scrollTop = chatMsgs.scrollHeight;

  try {
    const res = await fetch('/api/advisory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, city })
    });
    if (!res.ok) throw new Error('Advisory API error');
    const data = await res.json();
    document.getElementById(loadId)?.remove();

    const aiLabel = data.ai_powered
      ? '<span style="color:#00c4ff;font-size:10px;"><i class="fas fa-robot"></i> Claude AI</span>'
      : '<span style="color:#8896aa;font-size:10px;"><i class="fas fa-database"></i> Rule Engine</span>';

    chatMsgs.innerHTML += `
      <div class="chat-msg bot">
        <div class="chat-bubble">
          ${escapeHtml(data.advisory)}
          <div class="chat-aqi-context">
            ${aiLabel} &nbsp;|&nbsp;
            <span style="color:${aqiColor(data.current_aqi)}">${data.location}: AQI ${data.current_aqi} (${data.category})</span>
          </div>
        </div>
      </div>`;
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  } catch(e) {
    document.getElementById(loadId)?.remove();
    chatMsgs.innerHTML += `
      <div class="chat-msg bot">
        <div class="chat-bubble" style="color:#ff6666">
          Sorry, I couldn't connect to the advisory service. Please try again.
        </div>
      </div>`;
    toast('Advisory service unavailable.', 'error');
  }
}

// ── Station Modal ─────────────────────────────────────────────────────────────
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
        <i class="fas fa-chart-line"></i> 72h Forecast
      </button>
      <button class="action-btn" onclick="closeModal();switchTab('attribution');document.getElementById('attributionStation').value='${stationId}';loadAttribution()">
        <i class="fas fa-layer-group"></i> Source Attribution
      </button>
      <button class="action-btn" onclick="closeModal();switchTab('advisory');document.getElementById('advisoryCity').value='${station.city}';askAdvisory('What is the health risk at ${station.name} right now?')">
        <i class="fas fa-robot"></i> AI Advisory
      </button>
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:12px;">
      <i class="fas fa-clock"></i> ${station.timestamp}
      &nbsp;|&nbsp; ${station.lat.toFixed(4)}, ${station.lon.toFixed(4)}
      &nbsp;|&nbsp; Pop. density: ${(station.population_density/1000).toFixed(0)}k/km²
    </div>`;
}

function closeModal() {
  document.getElementById('stationModal').classList.add('hidden');
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function escapeHtml(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadDashboard();

  document.getElementById('stationModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  // Auto-refresh every 60 seconds
  setInterval(loadDashboard, 60000);
});
