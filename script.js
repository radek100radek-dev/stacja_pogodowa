const scriptURL = "https://script.google.com/macros/s/AKfycby0E-JWzMjlf2RsRA_viuL1DB7Ih7PaZPdnZoqholUTtMdBwFv4C8gYOolQhtmdSWvL0g/exec";
let charts = {};
let currentInterval = "5min";
const visiblePoints = 20; // Ile punktów widać naraz na ekranie

function initCharts() {
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: { 
            y: { beginAtZero: false },
            x: { 
                ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
                min: 0,
                max: visiblePoints
            }
        },
        plugins: {
            legend: { labels: { color: '#8b949e' } },
            zoom: {
                pan: { enabled: true, mode: 'x' },
                zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
            }
        }
    };

    charts.V1 = new Chart(document.getElementById('tempChart'), {
        type: 'line',
        data: { datasets: [{ label: 'Temperatura [°C]', data: [], borderColor: '#ff7b72', backgroundColor: '#ff7b7222', fill: true, tension: 0.3 }] },
        options: commonOptions
    });

    charts.V2 = new Chart(document.getElementById('humChart'), {
        type: 'line',
        data: { datasets: [{ label: 'Wilgotność [%]', data: [], borderColor: '#79c0ff', backgroundColor: '#79c0ff22', fill: true, tension: 0.3 }] },
        options: commonOptions
    });

    charts.V3 = new Chart(document.getElementById('presChart'), {
        type: 'line',
        data: { datasets: [{ label: 'Ciśnienie [hPa]', data: [], borderColor: '#7ee787', backgroundColor: '#7ee78722', fill: true, tension: 0.3 }] },
        options: commonOptions
    });
}

// Obsługa suwaka do patrzenia w historię
function manualScroll(chartKey, value) {
    const chart = charts[chartKey];
    const totalPoints = chart.data.labels.length;
    if (totalPoints > visiblePoints) {
        const start = Math.floor((value / 100) * (totalPoints - visiblePoints));
        chart.options.scales.x.min = start;
        chart.options.scales.x.max = start + visiblePoints;
        chart.update('none');
    }
}

async function refreshValues() {
    try {
        const response = await fetch(`${scriptURL}?read=true&interval=${currentInterval}`);
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
            const lastRow = data[data.length - 1];
            document.getElementById('v1').innerText = parseFloat(lastRow[1]).toFixed(1);
            document.getElementById('v2').innerText = parseFloat(lastRow[2]).toFixed(1);
            document.getElementById('v3').innerText = Math.round(lastRow[3]);

            document.getElementById('status-text').innerText = "Połączono";
            document.getElementById('wifi-icon').style.color = "#7ee787";

            updateCharts(data);
        }
    } catch (error) {
        console.error("Błąd fetch:", error);
        document.getElementById('status-text').innerText = "Błąd danych";
    }
}

function updateCharts(data) {
    const labels = data.map(row => {
        const d = new Date(row[0]);
        return d.getHours() + ":" + d.getMinutes().toString().padStart(2, '0');
    });

    const datasets = [
        data.map(row => row[1]),
        data.map(row => row[2]),
        data.map(row => row[3])
    ];

    Object.keys(charts).forEach((key, index) => {
        charts[key].data.labels = labels;
        charts[key].data.datasets[0].data = datasets[index];
        
        // Auto-przesuwanie jeśli suwak jest na końcu
        const slider = document.getElementById('scroll' + key);
        if (slider && slider.value == 100) {
            const total = labels.length;
            charts[key].options.scales.x.min = Math.max(0, total - visiblePoints);
            charts[key].options.scales.x.max = total;
        }
        charts[key].update('none'); 
    });
}

function changeInterval(min, btn) {
    if (min === 5) currentInterval = "5min";
    else if (min === 60) currentInterval = "1hour";
    else if (min === 360) currentInterval = "6hour";

    document.querySelectorAll('#interval-btns button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    Object.values(charts).forEach(chart => chart.resetZoom());
    refreshValues();
}

function setFilter(type, btn) {
    document.querySelectorAll('#filter-btns button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Logika filtra (opcjonalnie)
}

function exportToCSV() {
    window.open(`${scriptURL}?read=true&interval=${currentInterval}`);
}

window.onload = () => {
    initCharts();
    refreshValues();
    setInterval(refreshValues, 30000); 
    
    const themeCheckbox = document.getElementById('checkbox');
    if (themeCheckbox) {
        themeCheckbox.addEventListener('change', () => {
            document.body.classList.toggle('light-mode');
        });
    }
};
