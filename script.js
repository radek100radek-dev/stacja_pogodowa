const scriptURL = "https://script.google.com/macros/s/AKfycby0E-JWzMjlf2RsRA_viuL1DB7Ih7PaZPdnZoqholUTtMdBwFv4C8gYOolQhtmdSWvL0g/exec";

let charts = {};
let currentInterval = "5min";
let fullData = [];
let isFetching = false;
let lastKnownTimestamp = null;
let serverOffset = 0;
let hasUpdatedThisCycle = false;

function getVisiblePoints() { return 24; }

// --- DEKORACJE I POGODA ---
function getWeatherState(lux) {
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour > 20;
    if (isNight && lux < 100) return { emoji: "🌙", desc: "Noc" };
    if (lux < 300) return { emoji: "☁️", desc: "Pochmurno" };
    if (lux < 2500) return { emoji: "🌥️", desc: "Zachmurzenie" };
    return { emoji: "☀️", desc: "Słonecznie" };
}

function updateCardsWithData(rowData) {
    if(!rowData) return;
    const fields = ['v1', 'v2', 'v3', 'v4', 'v5'];
    fields.forEach((id, i) => {
        const el = document.getElementById(id);
        if(el) {
            const val = parseFloat(rowData[i+1]);
            el.innerText = (i === 4) ? val.toFixed(2) : (i < 2 ? val.toFixed(1) : Math.round(val));
        }
    });
    
    const lux = parseFloat(rowData[4]);
    const uv = parseFloat(rowData[5]);
    const state = getWeatherState(lux);
    if(document.getElementById('weather-emoji')) document.getElementById('weather-emoji').innerText = state.emoji;
    if(document.getElementById('weather-description')) document.getElementById('weather-description').innerText = state.desc;
    if(document.getElementById('bar-lux')) document.getElementById('bar-lux').style.width = Math.min((lux/50000)*100, 100) + "%";
    if(document.getElementById('bar-uv')) document.getElementById('bar-uv').style.width = Math.min((uv/11)*100, 100) + "%";
}

// --- LOGIKA POBIERANIA ---
async function refreshValues() {
    if (isFetching) return false;
    isFetching = true;
    
    const elements = document.querySelectorAll('.chart-container, .card, .weather-status-card');
    elements.forEach(el => el.classList.add('loading-shimmer'));
    updateStatus('loading');

    try {
        const response = await fetch(`${scriptURL}?read=true&interval=${currentInterval}&t=${Date.now()}`);
        const data = await response.json();
        if (data && data.length > 0) {
            const newestRow = data[data.length - 1];
            
            if (newestRow[0] !== lastKnownTimestamp) {
                fullData = data;
                lastKnownTimestamp = newestRow[0];
                updateCardsWithData(newestRow);
                updateCharts();
                updateStatus(true);
                elements.forEach(el => el.classList.remove('loading-shimmer'));
                isFetching = false;
                return true; 
            }
        }
        updateStatus(true);
    } catch (e) { 
        console.error("Błąd refresh:", e);
        updateStatus(false);
    }
    
    elements.forEach(el => el.classList.remove('loading-shimmer'));
    isFetching = false;
    return false;
}

// --- LICZNIK (TWOJA STRATEGIA: BUFOR + AGRESYWNE POBIERANIE) ---
function runTick() {
    const now = Date.now() + serverOffset;
    const intervalMs = (currentInterval === "1h") ? 3600000 : (currentInterval === "6h") ? 21600000 : 300000;
    
    const lastUpdateEvent = Math.floor(now / intervalMs) * intervalMs;
    const nextUpdateEvent = lastUpdateEvent + intervalMs;
    
    const secondsSinceLast = Math.floor((now - lastUpdateEvent) / 1000);
    const secondsUntilNext = Math.floor((nextUpdateEvent - now) / 1000);
    
    let display;
    let color = "#7ee787";

    // Reset flagi przed końcem cyklu
    if (secondsUntilNext === 10) hasUpdatedThisCycle = false;

    // Faza 1: CZEKAM (0-30s po terminie)
    if (secondsSinceLast >= 0 && secondsSinceLast < 30 && !hasUpdatedThisCycle) {
        display = "CZEKAM...";
        color = "#f1c40f";
    } 
    // Faza 2: POBIERANIE (30-60s po terminie)
    else if (secondsSinceLast >= 30 && secondsSinceLast < 60 && !hasUpdatedThisCycle) {
        display = "POBIERANIE...";
        color = "#ff7b72";
        if (secondsSinceLast % 5 === 0 && !isFetching) {
            refreshValues().then(isNew => { if (isNew) hasUpdatedThisCycle = true; });
        }
    }
    // Faza 3: ODLICZANIE
    else {
        const h = Math.floor(secondsUntilNext / 3600);
        const m = Math.floor((secondsUntilNext % 3600) / 60);
        const s = secondsUntilNext % 60;
        display = (h > 0) ? `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}` : `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    document.querySelectorAll('[id^="timer-V"]').forEach(el => {
        el.innerText = display;
        el.style.color = color;
    });
}

// --- WYKRESY I PLUGINY (ZACHOWANE ANIMACJE) ---
const weatherIconPlugin = {
    id: 'weatherIconPlugin',
    afterDatasetsDraw(chart) {
        if (chart.canvas.id !== 'tempChart' || fullData.length === 0) return;
        const { ctx, data, scales: { x, y } } = chart;
        ctx.save();
        ctx.textAlign = 'center';
        const step = currentInterval === "5min" ? 4 : 1;
        data.datasets[0].data.forEach((value, index) => {
            const meta = chart.getDatasetMeta(0);
            if (meta.data[index] && !meta.data[index].skip && index % step === 0) {
                const xPos = x.getPixelForValue(index);
                const yPos = y.getPixelForValue(value);
                const lux = fullData[index] ? parseFloat(fullData[index][4]) : 0;
                const state = getWeatherState(lux);
                ctx.font = '24px Arial';
                ctx.fillText(state.emoji, xPos, yPos - 35);
                ctx.font = 'bold 12px Segoe UI';
                ctx.fillStyle = '#ff7b72';
                ctx.fillText(value.toFixed(1) + "°", xPos, yPos - 18);
            }
        });
        ctx.restore();
    }
};

function initCharts() {
    const dataset = (label, color) => ({
        label: label, data: [], borderColor: color, borderWidth: 4,
        fill: true, tension: 0.4, pointRadius: 0, hoverRadius: 8,
        backgroundColor: (context) => {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            if (!chartArea) return null;
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, color + '40');
            gradient.addColorStop(1, color + '00');
            return gradient;
        }
    });

    const options = (sMin, sMax) => ({
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 800 }, // ZACHOWANA ANIMACJA
        interaction: { mode: 'index', intersect: false },
        onHover: (event, chartElement) => {
            if (chartElement.length > 0) {
                const index = chartElement[0].index;
                updateCardsWithData(fullData[index]);
                Object.values(charts).forEach(c => {
                    if (c !== event.chart) {
                        c.setActiveElements([{datasetIndex: 0, index}]);
                        c.tooltip.setActiveElements([{datasetIndex: 0, index}]);
                        c.update('none');
                    }
                });
            }
        },
        scales: {
            y: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(139, 148, 158, 0.05)' }, suggestedMin: sMin, suggestedMax: sMax },
            x: { display: true, ticks: { color: '#8b949e', maxTicksLimit: 8, autoSkip: true, font: { size: 10 } }, grid: { display: false } }
        },
        plugins: { 
            legend: { display: false },
            tooltip: { backgroundColor: 'rgba(13, 17, 23, 0.9)', borderColor: 'var(--accent-blue)', borderWidth: 1, displayColors: false }
        }
    });

    charts.V1 = new Chart(document.getElementById('tempChart'), { type: 'line', data: { datasets: [dataset('Temp', '#ff7b72')] }, options: options(10, 30), plugins: [weatherIconPlugin] });
    charts.V2 = new Chart(document.getElementById('humChart'), { type: 'line', data: { datasets: [dataset('Wilg', '#79c0ff')] }, options: options(20, 90) });
    charts.V3 = new Chart(document.getElementById('presChart'), { type: 'line', data: { datasets: [dataset('Cis', '#7ee787')] }, options: options(990, 1030) });
    charts.V4 = new Chart(document.getElementById('luxChart'), { type: 'line', data: { datasets: [dataset('Lux', '#f1c40f')] }, options: options(0, 10000) });
    charts.V5 = new Chart(document.getElementById('uvChart'), { type: 'line', data: { datasets: [dataset('UV', '#ab47bc')] }, options: options(0, 11) });
}

function updateCharts() {
    const pts = getVisiblePoints();
    const labels = fullData.map(row => {
        const d = new Date(row[0]);
        return d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    });
    
    Object.keys(charts).forEach((key) => {
        const chart = charts[key];
        const idx = parseInt(key.replace('V', ''));
        chart.data.labels = labels;
        chart.data.datasets[0].data = fullData.map(row => parseFloat(row[idx]) || 0);
        
        const slider = document.getElementById('scroll' + key);
        if (slider) {
            slider.value = 100;
            chart.options.scales.x.min = Math.max(0, fullData.length - pts);
            chart.options.scales.x.max = fullData.length;
        }
        chart.update('default');
    });
}

// --- INTERAKCJA UŻYTKOWNIKA ---
function manualScroll(key, val) {
    const pts = getVisiblePoints();
    let start = Math.floor((val / 100) * Math.max(0, fullData.length - pts));
    Object.keys(charts).forEach(k => {
        charts[k].options.scales.x.min = start;
        charts[k].options.scales.x.max = start + pts;
        charts[k].update('none');
        const s = document.getElementById('scroll' + k);
        if(s) s.value = val;
    });
    const targetIndex = Math.min(start + pts - 1, fullData.length - 1);
    updateCardsWithData(fullData[targetIndex]);
}

function scrollToChart(chartId) {
    const element = document.getElementById(chartId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const container = element.parentElement;
        container.style.boxShadow = "0 0 50px var(--accent-blue)";
        setTimeout(() => { container.style.boxShadow = "none"; }, 800);
    }
}

function changeInterval(type, btn) {
    if (currentInterval === type) return;
    currentInterval = type;
    document.querySelectorAll('#interval-btns button').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    lastKnownTimestamp = null;
    hasUpdatedThisCycle = false;
    refreshValues();
}

function updateStatus(online) {
    const icon = document.getElementById('wifi-icon');
    const text = document.getElementById('status-text');
    if (!icon || !text) return;
    if (online === 'loading') {
        icon.style.color = "#f1c40f"; icon.classList.add('status-spin');
        text.innerText = "Aktualizacja...";
    } else if (online === true) {
        icon.style.color = "#7ee787"; icon.classList.remove('status-spin');
        text.innerText = (currentInterval === "5min") ? "LIVE" : "Online";
    } else {
        icon.style.color = "#ff7b72"; icon.classList.remove('status-spin');
        text.innerText = "Offline";
    }
}

function exportToCSV() {
    let csv = "Data;Temperatura;Wilgotnosc;Cisnienie;Lux;UV\n";
    fullData.forEach(row => csv += row[0] + ";" + row.slice(1).join(";").replace(/\./g, ',') + "\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv'}));
    link.download = "meteo_data.csv"; link.click();
}

// --- START ---
if(document.getElementById('checkbox')) {
    document.getElementById('checkbox').addEventListener('change', () => document.body.classList.toggle('light-mode'));
}

window.onload = () => { 
    initCharts(); 
    refreshValues();
    setInterval(runTick, 1000); 
};
