const AUTH_TOKEN = "FoXVEcbaCus_0fAmltqrnqL9glcETGC3";
const REGION = "fra1"; 
const PINS = ["V1", "V2", "V3"];
let lastValues = { V1: null, V2: null, V3: null };

function initChart(id, label, color) {
    return new Chart(document.getElementById(id), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: color,
                backgroundColor: color + '22',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grace: '10%', grid: { color: '#333' } },
                x: { grid: { display: false } }
            }
        }
    });
}

const charts = {
    V1: initChart('tempChart', 'Temperatura [°C]', '#ff4d4d'),
    V2: initChart('humChart', 'Wilgotność [%]', '#00d4ff'),
    V3: initChart('presChart', 'Ciśnienie [hPa]', '#44ff44')
};

async function update() {
    for (let pin of PINS) {
        try {
            const res = await fetch(`https://${REGION}.blynk.cloud/external/api/get?token=${AUTH_TOKEN}&value=${pin}`);
            const text = await res.text();
            const val = parseFloat(text);

            if (!isNaN(val)) {
                document.getElementById(pin.toLowerCase()).innerText = val.toFixed(2);

                if (val !== lastValues[pin]) {
                    lastValues[pin] = val;
                    const chart = charts[pin];
                    const time = new Date().toLocaleTimeString();

                    chart.data.labels.push(time);
                    chart.data.datasets[0].data.push(val);

                    if (chart.data.labels.length > 20) {
                        chart.data.labels.shift();
                        chart.data.datasets[0].data.shift();
                    }
                    chart.update();
                }
            }
        } catch (e) {
            console.error("Błąd API:", e);
        }
    }
}

setInterval(update, 5000);
update();