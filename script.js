const AUTH_TOKEN = "FoXVEcbaCus_0fAmltqrnqL9glcETGC3";
const REGION = "fra1";
let rawHistory = { V1: [], V2: [], V3: [] };
let currentInterval = 5; 

const charts = {
    V1: new Chart(document.getElementById('tempChart'), createConfig('Temperatura [°C]', '#ff7b72')),
    V2: new Chart(document.getElementById('humChart'), createConfig('Wilgotność [%]', '#79c0ff')),
    V3: new Chart(document.getElementById('presChart'), createConfig('Ciśnienie [hPa]', '#7ee787'))
};

async function refreshValues() {
    const pins = ["V1", "V2", "V3"];
    let success = false;
    for (let p of pins) {
        try {
            const res = await fetch(`https://${REGION}.blynk.cloud/external/api/get?token=${AUTH_TOKEN}&${p}`);
            const val = await res.text();
            const el = document.getElementById(p.toLowerCase());
            if (el && val !== "" && val !== "null") {
                const num = parseFloat(val);
                el.innerText = num.toFixed(1);
                rawHistory[p].push({ x: Date.now(), y: num });
                success = true;
            }
        } catch(e) { console.error("Błąd API"); }
    }
    updateCharts();
}

function updateTimer() {
    const msInInterval = 5 * 60 * 1000; 
    const now = Date.now();
    const timeToNext = msInInterval - (now % msInInterval);
    const min = Math.floor(timeToNext / 60000);
    const sec = Math.floor((timeToNext % 60000) / 1000);
    document.getElementById('timer').innerText = `${min}:${sec.toString().padStart(2, '0')}`;
    
    // Moment synchronizacji: gdy licznik wybije zero, czekamy 3s i pobieramy dane
    if (min === 0 && sec === 0) {
        setTimeout(refreshValues, 3000); 
    }
}

function exportToCSV() {
    let csv = "Data,Temperatura,Wilgotnosc,Cisnienie\n";
    const dataV1 = rawHistory.V1;
    dataV1.forEach((pt, i) => {
        const date = new Date(pt.x).toLocaleString();
        const h = rawHistory.V2[i] ? rawHistory.V2[i].y : "";
        const p = rawHistory.V3[i] ? rawHistory.V3[i].y : "";
        csv += `${date},${pt.y},${h},${p}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stacja_pogodowa.csv';
    a.click();
}

window.onload = () => {
    document.getElementById('checkbox').addEventListener('change', () => document.body.classList.toggle('light-mode'));
    refreshValues();
    setInterval(updateTimer, 1000);
    setInterval(refreshValues, 300000); // Backup co 5 min
};

// --- Reszta funkcji (createConfig, updateCharts, changeInterval) pozostaje bez zmian ---
function createConfig(label, color) {
    return {
        type: 'line',
        data: { datasets: [{ label: label, data: [], borderColor: color, fill: true, tension: 0.3 }] },
        options: { responsive: true, maintainAspectRatio: false }
    };
}

function updateCharts() {
    const intervalMs = currentInterval * 60000;
    const roundedNow = Math.floor(Date.now() / intervalMs) * intervalMs;
    for (let pin in charts) {
        let labels = []; let values = [];
        for (let i = 23; i >= 0; i--) {
            const t = roundedNow - (i * intervalMs);
            const d = new Date(t);
            labels.push(`${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`);
            const points = rawHistory[pin].filter(p => p.x >= t && p.x < t + intervalMs);
            values.push(points.length > 0 ? (points.reduce((a,b)=>a+b.y, 0)/points.length).toFixed(1) : null);
        }
        charts[pin].data.labels = labels;
        charts[pin].data.datasets[0].data = values;
        charts[pin].update('none');
    }
}
