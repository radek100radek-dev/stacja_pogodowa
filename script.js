const AUTH_TOKEN = "FoXVEcbaCus_0fAmltqrnqL9glcETGC3";
const REGION = "fra1";

let rawHistory = { V1: [], V2: [], V3: [] };
let currentInterval = 5; 

const delay = ms => new Promise(res => setTimeout(res, ms));

// --- POBIERANIE HISTORII Z SERWERA (Zostawiamy, może kiedyś zaskoczy) ---
async function loadHistory() {
    const now = Date.now();
    const pins = ["V1", "V2", "V3"];
    for (let pin of pins) {
        try {
            const url = `https://${REGION}.blynk.cloud/external/api/data/get?token=${AUTH_TOKEN}&pin=${pin}&from=${now - 86400000}&to=${now}`;
            const res = await fetch(url);
            const data = await res.json();
            if (Array.isArray(data)) {
                // Dodajemy dane z serwera do naszej lokalnej pamięci
                const serverPoints = data.map(p => ({ x: Number(p[0]), y: Number(p[1]) }));
                rawHistory[pin] = [...serverPoints, ...rawHistory[pin]];
                // Usuwamy duplikaty i sortujemy
                rawHistory[pin] = rawHistory[pin].filter((v,i,a)=>a.findIndex(t=>(t.x === v.x))===i).sort((a,b) => a.x - b.x);
            }
            await delay(500); 
        } catch (e) { console.error("Błąd historii " + pin); }
    }
    updateCharts();
}

// --- POBIERANIE WARTOŚCI (KAFELKI + DOPISYWANIE DO WYKRESU) ---
async function refreshValues() {
    const pins = ["V1", "V2", "V3"];
    let success = false;

    for (let p of pins) {
        try {
            const res = await fetch(`https://${REGION}.blynk.cloud/external/api/get?token=${AUTH_TOKEN}&${p}`);
            const val = await res.text();
            
            const el = document.getElementById(p.toLowerCase());
            if (el && val !== "null" && val !== "") {
                const num = parseFloat(val);
                if (!isNaN(num)) {
                    el.innerText = num.toFixed(1);
                    
                    // --- TUTAJ JEST MAGIA: Dodajemy wartość z kafelka do pamięci wykresu ---
                    const now = Date.now();
                    rawHistory[p].push({ x: now, y: num });
                    
                    // Czyścimy stare dane (> 24h)
                    rawHistory[p] = rawHistory[p].filter(pt => pt.x > now - 86400000);
                    
                    success = true;
                }
            }
            await delay(300);
        } catch(e) { console.error("Błąd V-Pin"); }
    }
    updateStatusUI(success);
    updateCharts(); // Aktualizujemy wykres po pobraniu kafelków
}

function updateStatusUI(isOnline) {
    const icon = document.getElementById('wifi-icon');
    const text = document.getElementById('status-text');
    if (isOnline) {
        icon.className = "online pulse";
        icon.innerHTML = "📶";
        text.innerText = "ESP32: ONLINE";
    } else {
        icon.className = "offline";
        icon.innerHTML = "⚠️";
        text.innerText = "ESP32: OFFLINE";
    }
}

// --- KONFIGURACJA WYKRESÓW ---
function createConfig(label, color) {
    return {
        type: 'line',
        data: { labels: [], datasets: [{ 
            label: label, data: [], borderColor: color, backgroundColor: color + '20', 
            fill: true, tension: 0.3, pointRadius: 4, spanGaps: true 
        }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { grid: { color: '#30363d' }, ticks: { color: '#8b949e' } },
                y: { grid: { color: '#30363d' }, ticks: { color: '#8b949e' } }
            }
        }
    };
}

const charts = {
    V1: new Chart(document.getElementById('tempChart'), createConfig('Temperatura [°C]', '#ff7b72')),
    V2: new Chart(document.getElementById('humChart'), createConfig('Wilgotność [%]', '#79c0ff')),
    V3: new Chart(document.getElementById('presChart'), createConfig('Ciśnienie [hPa]', '#7ee787'))
};

// --- AKTUALIZACJA WYKRESÓW (z danych kafelkowych) ---
function updateCharts() {
    const intervalMs = currentInterval * 60000;
    let roundedNow = Math.floor(Date.now() / intervalMs) * intervalMs;

    for (let pin in charts) {
        let labels = [];
        let values = [];
        for (let i = 23; i >= 0; i--) {
            const t = roundedNow - (i * intervalMs);
            const d = new Date(t);
            labels.push(`${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`);
            
            // Filtrujemy punkty z naszej lokalnej pamięci (którą kafelki uzupełniają)
            const points = rawHistory[pin].filter(p => p.x >= t && p.x < t + intervalMs);
            values.push(points.length > 0 ? (points.reduce((a,b)=>a+b.y, 0)/points.length).toFixed(1) : null);
        }
        charts[pin].data.labels = labels;
        charts[pin].data.datasets[0].data = values;
        charts[pin].update('none');
    }
}

function updateTimer() {
    const msInInterval = 5 * 60 * 1000; 
    const timeToNext = msInInterval - (Date.now() % msInInterval);
    const min = Math.floor(timeToNext / 60000);
    const sec = Math.floor((timeToNext % 60000) / 1000);
    document.getElementById('timer').innerText = `${min}:${sec.toString().padStart(2, '0')}`;
}

window.onload = () => {
    document.getElementById('checkbox').addEventListener('change', () => document.body.classList.toggle('light-mode'));
    loadHistory();   // Próba pobrania historii stecznej
    refreshValues(); // Pobranie kafelków i dodanie pierwszej kropki do wykresu
    setInterval(updateTimer, 1000);
    setInterval(refreshValues, 30000); // Sprawdzaj kafelki co 30 sekund
};

function changeInterval(v, btn) {
    currentInterval = parseInt(v);
    document.querySelectorAll('#interval-btns button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateCharts();
}
