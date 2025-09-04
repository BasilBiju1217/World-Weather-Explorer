// main.js
const map = L.map('map').setView([20, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const info = {
  locName: document.getElementById('locName'),
  coords: document.getElementById('coords'),
  climate: document.getElementById('climate'),
  summary: document.getElementById('summary'),
  climateCard: document.getElementById('climateCard'),
  hourlyList: document.getElementById('hourlyList'),
  dailyList: document.getElementById('dailyList')
};

let marker = null;

function showLoading(){
  info.locName.textContent = 'Loading...';
  info.coords.textContent = '';
  info.climate.innerHTML = '';
  info.summary.innerHTML = '';
  info.hourlyList.innerHTML = '';
  info.dailyList.innerHTML = '';
  info.climateCard.innerHTML = '';
}

map.on('click', async function(e){
  const lat = e.latlng.lat.toFixed(4);
  const lon = e.latlng.lng.toFixed(4);
  if(marker) marker.setLatLng(e.latlng);
  else marker = L.marker(e.latlng).addTo(map);

  showLoading();
  info.coords.textContent = `Lat: ${lat}, Lon: ${lon}`;
  try {
    const res = await axios.get(`/api/forecast?lat=${lat}&lon=${lon}`);
    const payload = res.data;
    info.locName.textContent = `Location: ${payload.location.latitude.toFixed(4)}, ${payload.location.longitude.toFixed(4)}`;
    const climate = payload.climate_summary || {};
    info.climate.innerHTML = `<strong class="text-success">${climate.label || ''}</strong> • Avg max ${climate.avg_max ?? '-'}°C, avg min ${climate.avg_min ?? '-'}°C`;
    // daily
    const daily = payload.forecast.daily || {};
    const hours = payload.forecast.hourly || {};
    // hourly first 12
    info.hourlyList.innerHTML = '';
    const hlen = Math.min((hours.time||[]).length, 12);
    for(let i=0;i<hlen;i++){
      const t = hours.time[i];
      const temp = hours.temperature_2m[i];
      const hum = hours.relativehumidity_2m[i];
      info.hourlyList.innerHTML += `<div class="d-flex justify-content-between"><span>${t}</span><span>${temp}°C • ${hum}%</span></div>`;
    }
    // daily list
    info.dailyList.innerHTML = '';
    const dlen = Math.min((daily.time||[]).length, 7);
    for(let i=0;i<dlen;i++){
      info.dailyList.innerHTML += `<div class="d-flex justify-content-between"><span>${daily.time[i]}</span><span>${daily.temperature_2m_max[i]}° / ${daily.temperature_2m_min[i]}°C</span></div>`;
    }
    // climate card details
    info.climateCard.innerHTML = `
      <div class="p-2 bg-light rounded">
        <div><strong>Average max</strong>: ${climate.avg_max ?? '-'}°C</div>
        <div><strong>Average min</strong>: ${climate.avg_min ?? '-'}°C</div>
        <div><strong>Avg precip</strong>: ${climate.avg_precip_mm ?? '-'} mm</div>
      </div>
    `;
  } catch(err){
    console.error(err);
    info.locName.textContent = 'Failed to load data';
    info.summary.textContent = err?.response?.data?.error || err.message || 'Error';
  }
});

// add a legend/control
const legend = L.control({position: 'bottomright'});
legend.onAdd = function(map){
  const div = L.DomUtil.create('div','info legend p-2');
  div.innerHTML = '<strong>Tips</strong><br>Click anywhere on the map to see weather & climate summary.<br>Use scroll to zoom.';
  return div;
};
legend.addTo(map);
