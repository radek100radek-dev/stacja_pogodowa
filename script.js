const scriptURL = "https://script.google.com/macros/s/AKfycby0E-JWzMjlf2RsRA_viuL1DB7Ih7PaZPdnZoqholUTtMdBwFv4C8gYOolQhtmdSWvL0g/exec";

let charts = {};
let currentInterval = "5min";
let fullData = [];
let isFetching = false;
let lastKnownTimestamp = null;
let serverOffset = 0;

function getVisiblePoints() { return 24; }

function scrollToChart(chartId) {
    const el = document.getElementById(chartId);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.parentElement.style.boxShadow = "0 0 20px var(--accent-blue)";
        setTimeout(() => { el.parentElement.style.boxShadow = "none"; }, 1000);
    }
}

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
    const ids = ['v1', 'v2', 'v3', 'v4', 'v5'];
    ids.forEach((id, i) => {
        const el = document.getElementById(id);
        if(el) {
            const val = parseFloat(rowData[i+1]);
            el.innerText = (i === 0 || i === 1 || i === 4) ? val.toFixed(i === 4 ? 2 : 1) : Math.round(val);
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

async function refreshValues() {
    if (isFetching) return false;
    isFetching = true;
    updateStatus('loading');
    try {
        const response = await fetch(`${scriptURL}?read=true&interval=${currentInterval}&t=${Date.now()}`);
        const data = await response.json();
        if (data && data.length > 0) {
            const newestRow = data[data.length - 1];
            if (newestRow[0] !== lastKnownTimestamp) {
                lastKnownTimestamp = newestRow[0];
                fullData = data;
                updateCardsWithData(newestRow);
                updateCharts();
                updateStatus(true);
                isFetching = false;
                return true; // MAMY NOWE DANE
            }
            updateStatus(true);
        }
    } catch (e) { updateStatus(false); }
    isFetching = false;
    return false; // DANE STARE LUB BŁĄD
}

// Zmienna pomocnicza, żeby wiedzieć czy w obecnym cyklu już pobraliśmy nowość
let hasUpdatedInThisCycle = false;

function runTick() {
    const now = Date.now();
    const intervalMs = (currentInterval === "1h") ? 3600000 : (currentInterval === "6h") ? 21600000 : 300000;
    
    const lastExpected = Math.floor(now / intervalMs) * intervalMs;
    const nextExpected = lastExpected + intervalMs;
    
    let diffToNext = Math.floor((nextExpected - now) / 1000);
    let secondsSinceLast = Math.floor((now - lastExpected) / 1000);
    
    let display;
    let color = "#7ee787";

    // Reset flagi przy nowym cyklu (ok. 5s przed końcem)
    if (diffToNext === 5) hasUpdatedInThisCycle = false;

    // 1. Czekamy 15s po czasie zapisu na "rozruch" stacji
    if (secondsSinceLast >= 0 && secondsSinceLast < 15 && !hasUpdatedInThisCycle) {
        display = "CZEKAM..."; 
        color = "#f1c40f";
    }
    // 2. Faza agresywnego pobierania (15s - 90s)
    else if (secondsSinceLast >= 15 && secondsSinceLast <= 90 && !hasUpdatedInThisCycle) {
        display = "POBIERANIE...";
        color = "#ff7b72";
        if (secondsSinceLast % 5 === 0) {
            refreshValues().then(success => { if(success) hasUpdatedInThisCycle = true; });
        }
    }
    // 3. Normalne odliczanie
    else {
        const m = Math.floor((diffToNext % 3600) / 60);
        const s = diffToNext % 60;
        display = `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    document.querySelectorAll('[id^="timer-V"]').forEach(el => {
        el.innerText = display;
        el.style.color = color;
    });
}

const weatherIconPlugin = {
    id: 'weatherIconPlugin',
    afterDatasetsDraw(chart) {
        if (chart.canvas.id !== 'tempChart' || fullData.length === 0) return;
        const { ctx, data, scales: { x, y } } = chart;
        ctx.save(); ctx.textAlign = 'center';
        const step = currentInterval === "5min" ? 4 : 1;
        data.datasets[0].data.forEach((value, index) => {
            const meta = chart.getDatasetMeta(0);
            if (meta.data[index] && !meta.data[index].skip && index % step === 0) {
                const xPos = x.getPixelForValue(index);
                const yPos = y.getPixelForValue(value);
                const lux = fullData[index] ? parseFloat(fullData[index][4]) : 0;
                const state = getWeatherState(lux);
                ctx.font = '24px Arial'; ctx.fillText(state.emoji, xPos, yPos - 35);
                ctx.font = 'bold 12px Segoe UI'; ctx.fillStyle = '#ff7b72'; ctx.fillText(value.toFixed(1) + "°", xPos, yPos - 18);
            }
        });
        ctx.restore();
    }
};

function initCharts() {
    const dataset = (label, color) => ({
        label: label, data: [], borderColor: color, borderWidth: 4,
        fill: true, tension: 0.4, pointRadius: 0, hoverRadius: 8, spanGaps: true,
        backgroundColor: (ctx) => {
            const a = ctx.chart.chartArea;
            if (!a) return null;
            const g = ctx.chart.ctx.createLinearGradient(0, a.top, 0, a.bottom);
            g.addColorStop(0, color + '40'); g.addColorStop(1, color + '00');
            return g;
        }
    });

    const options = (sMin, sMax) => ({
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
            y: { ticks: { color: '#8b949e' }, suggestedMin: sMin, suggestedMax: sMax },
            x: { ticks: { color: '#8b949e', maxTicksLimit: 8 } }
        },
        plugins: { legend: { display: false }, tooltip: { enabled: true } }
    });

    charts.V1 = new Chart(document.getElementById('tempChart'), { type: 'line', data: { datasets: [dataset('Temp', '#ff7b72')] }, options: options(10, 35), plugins: [weatherIconPlugin] });
    charts.V2 = new Chart(document.getElementById('humChart'), { type: 'line', data: { datasets: [dataset('Wilg', '#79c0ff')] }, options: options(20, 95) });
    charts.V3 = new Chart(document.getElementById('presChart'), { type: 'line', data: { datasets: [dataset('Cis', '#7ee787')] }, options: options(980, 1040) });
    charts.V4 = new Chart(document.getElementById('luxChart'), { type: 'line', data: { datasets: [dataset('Lux', '#f1c40f')] }, options: options(0, 50000) });
    charts.V5 = new Chart(document.getElementById('uvChart'), { type: 'line', data: { datasets: [dataset('UV', '#ab47bc')] }, options: options(0, 11) });
}

function updateCharts() {
    const isAnyHovered = Object.values(charts).some(c => c.tooltip && c.tooltip.opacity > 0);
    if (isAnyHovered) return;
    const pts = getVisiblePoints();
    const labels = fullData.map(row => new Date(row[0]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
    Object.keys(charts).forEach((key) => {
        const chart = charts[key];
        const idx = parseInt(key.replace('V', ''));
        chart.data.labels = labels;
        chart.data.datasets[0].data = fullData.map(row => parseFloat(row[idx]) || 0);
        chart.options.scales.x.min = Math.max(0, fullData.length - pts);
        chart.options.scales.x.max = fullData.length;
        chart.update('none');
    });
}

function manualScroll(key, val) {
    const pts = getVisiblePoints();
    let range = Math.max(0, fullData.length - pts);
    let start = Math.floor((val / 100) * range);
    Object.keys(charts).forEach(k => {
        charts[k].options.scales.x.min = start;
        charts[k].options.scales.x.max = start + pts;
        charts[k].update('none');
        const s = document.getElementById('scroll' + k);
        if(s) s.value = val;
    });
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

function changeInterval(type, btn) {
    if (currentInterval === type) return;
    currentInterval = type;
    document.querySelectorAll('#interval-btns button').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    lastKnownTimestamp = null;
    fullData = []; 
    hasUpdatedInThisCycle = false;
    refreshValues();
}

window.onload = () => { 
    initCharts(); 
    refreshValues(); 
    setInterval(runTick, 1000); 
    if(document.getElementById('checkbox')) {
        document.getElementById('checkbox').addEventListener('change', () => document.body.classList.toggle('light-mode'));
    }
};
