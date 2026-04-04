// === KONFIGURACJA ===
const scriptURL = "https://script.google.com/macros/s/AKfycby0E-JWzMjlf2RsRA_viuL1DB7Ih7PaZPdnZoqholUTtMdBwFv4C8gYOolQhtmdSWvL0g/exec";

let charts = {};

// Inicjalizacja wykresów Chart.js
function initCharts() {
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: false } }
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

// Funkcja pobierająca dane przez Apps Script
async function refreshValues() {
    try {
        // Dodajemy ?read=true, żeby Apps Script wiedział, że chcemy odczytać dane
        const response = await fetch(scriptURL + "?read=true");
        const data = await response.json();

        if (data && data.length > 0) {
            // Ostatni wiersz danych (najnowszy)
            const lastRow = data[data.length - 1];
            
            // Mapowanie: lastRow[0]=Data, [1]=Temp, [2]=Wilg, [3]=Cisn
            document.getElementById('v1').innerText = parseFloat(lastRow[1]).toFixed(1);
            document.getElementById('v2').innerText = parseFloat(lastRow[2]).toFixed(1);
            document.getElementById('v3').innerText = Math.round(lastRow[3]);

            // Status połączenia na zielono
            document.getElementById('status-text').innerText = "Połączono";
            document.getElementById('wifi-icon').style.color = "#7ee787";

            updateCharts(data);
        }
    } catch (error) {
        console.error("Błąd pobierania danych:", error);
        document.getElementById('status-text').innerText = "Błąd połączenia";
        document.getElementById('wifi-icon').style.color = "#ff7b72";
    }
}

// Funkcja aktualizująca wykresy
function updateCharts(data) {
    const labels = data.map(row => {
        const d = new Date(row[0]);
        return d.getHours() + ":" + d.getMinutes().toString().padStart(2, '0');
    });

    charts.V1.data.labels = labels;
    charts.V1.data.datasets[0].data = data.map(row => row[1]);
    
    charts.V2.data.labels = labels;
    charts.V2.data.datasets[0].data = data.map(row => row[2]);
    
    charts.V3.data.labels = labels;
    charts.V3.data.datasets[0].data = data.map(row => row[3]);

    charts.V1.update('none');
    charts.V2.update('none');
    charts.V3.update('none');
}

// Obsługa przycisków interwału (pod Twój HTML)
function changeInterval(min, btn) {
    document.querySelectorAll('#interval-btns button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    refreshValues();
}

// Eksport CSV (otwiera dane w nowym oknie)
function exportToCSV() {
    window.open(scriptURL + "?read=true");
}

// Start po załadowaniu okna
window.onload = () => {
    initCharts();
    refreshValues();
    
    // Odświeżanie co 5 sekund
    setInterval(refreshValues, 5000);

    // Obsługa motywu (jasny/ciemny)
    const themeCheckbox = document.getElementById('checkbox');
    if (themeCheckbox) {
        themeCheckbox.addEventListener('change', () => {
            document.body.classList.toggle('light-mode');
        });
    }
};
