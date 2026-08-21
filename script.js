const scriptURL =
  "https://script.google.com/macros/s/AKfycbxKCkvYVHkca_BcfCpZuFOHE8GNDuAwBTjdQ37_YRJbddnDO2F6pIcpVABwm_x-bZkV5g/exec";


let charts = {};

let currentInterval =
  "5min";

let fullData =
  [];

let isFetching =
  false;

let lastKnownTimestamp =
  null;

let lastAutoFetchKey =
  "";


const directionNames = [
  "N",
  "NE",
  "E",
  "SE",
  "S",
  "SW",
  "W",
  "NW"
];


const BATTERY_RED_MAX =
  20;

const BATTERY_YELLOW_MAX =
  50;


const VISIBLE_POINTS =
  24;


const chartKeyByCanvas = {

  tempChart:
    "V1",

  humChart:
    "V2",

  presChart:
    "V3",

  luxChart:
    "V4",

  uvChart:
    "V5",

  windChart:
    "V6",

  dirChart:
    "V7",

  rainChart:
    "V8"
};


// =====================================================
// BATERIA
//
// GOOGLE ZWRACA GOTOWY PROCENT W row[9]
//
// 0-20%   = CZERWONA + PULSOWANIE
// 21-50%  = ZOLTA
// 51-100% = ZIELONA
// =====================================================

function updateBattery(
  value
) {

  const rawPercent =
    parseFloat(
      value
    );


  if (
    !Number.isFinite(
      rawPercent
    )
  ) {

    return;
  }


  const percent =
    Math.max(
      0,
      Math.min(
        100,
        rawPercent
      )
    );


  const displayPercent =
    Math.round(
      percent
    );


  const fill =
    document.getElementById(
      "battery-fill"
    );


  const percentText =
    document.getElementById(
      "battery-percent"
    );


  const statusText =
    document.getElementById(
      "battery-status"
    );


  const widget =
    document.querySelector(
      ".battery-widget"
    );


  if (
    percentText
  ) {

    percentText.innerText =
      `${displayPercent}%`;
  }


  if (
    fill
  ) {

    fill.style.width =
      `${percent}%`;


    fill.classList.remove(
      "battery-green",
      "battery-yellow",
      "battery-red"
    );
  }


  if (
    widget
  ) {

    widget.classList.remove(
      "battery-widget-green",
      "battery-widget-yellow",
      "battery-widget-red"
    );
  }


  if (
    percent <=
    BATTERY_RED_MAX
  ) {

    if (
      fill
    ) {

      fill.classList.add(
        "battery-red"
      );
    }


    if (
      widget
    ) {

      widget.classList.add(
        "battery-widget-red"
      );
    }


    if (
      statusText
    ) {

      statusText.innerText =
        "Niski poziom";


      statusText.className =
        "battery-status battery-status-red";
    }
  }


  else if (
    percent <=
    BATTERY_YELLOW_MAX
  ) {

    if (
      fill
    ) {

      fill.classList.add(
        "battery-yellow"
      );
    }


    if (
      widget
    ) {

      widget.classList.add(
        "battery-widget-yellow"
      );
    }


    if (
      statusText
    ) {

      statusText.innerText =
        "Sredni poziom";


      statusText.className =
        "battery-status battery-status-yellow";
    }
  }


  else {

    if (
      fill
    ) {

      fill.classList.add(
        "battery-green"
      );
    }


    if (
      widget
    ) {

      widget.classList.add(
        "battery-widget-green"
      );
    }


    if (
      statusText
    ) {

      statusText.innerText =
        "Dobry poziom";


      statusText.className =
        "battery-status battery-status-green";
    }
  }
}


// =====================================================
// DATA AKTUALNA
// =====================================================

function updateCurrentDate() {

  const now =
    new Date();


  const days = [
    "Niedziela",
    "Poniedziałek",
    "Wtorek",
    "Środa",
    "Czwartek",
    "Piątek",
    "Sobota"
  ];


  const element =
    document.getElementById(
      "current-date"
    );


  if (
    !element
  ) {

    return;
  }


  const date =
    `${String(now.getDate()).padStart(2, "0")}.`
    +
    `${String(now.getMonth() + 1).padStart(2, "0")}.`
    +
    `${now.getFullYear()}`;


  const time =
    `${String(now.getHours()).padStart(2, "0")}:`
    +
    `${String(now.getMinutes()).padStart(2, "0")}:`
    +
    `${String(now.getSeconds()).padStart(2, "0")}`;


  element.innerHTML =
    `${days[now.getDay()]}, ${date}<br>${time}`;
}


// =====================================================
// FORMAT DATY
// =====================================================

function formatDateTime(
  timestamp,
  withSeconds = true
) {

  const date =
    new Date(
      Number(
        timestamp
      )
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "--";
  }


  const d =
    String(
      date.getDate()
    )
    .padStart(
      2,
      "0"
    );


  const m =
    String(
      date.getMonth() + 1
    )
    .padStart(
      2,
      "0"
    );


  const y =
    date.getFullYear();


  const h =
    String(
      date.getHours()
    )
    .padStart(
      2,
      "0"
    );


  const min =
    String(
      date.getMinutes()
    )
    .padStart(
      2,
      "0"
    );


  const s =
    String(
      date.getSeconds()
    )
    .padStart(
      2,
      "0"
    );


  if (
    withSeconds
  ) {

    return `${d}.${m}.${y} ${h}:${min}:${s}`;
  }


  return `${d}.${m}.${y} ${h}:${min}`;
}


// =====================================================
// DATA NA OSI X
// =====================================================

function formatAxisLabel(
  timestamp
) {

  const date =
    new Date(
      Number(
        timestamp
      )
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "";
  }


  const d =
    String(
      date.getDate()
    )
    .padStart(
      2,
      "0"
    );


  const m =
    String(
      date.getMonth() + 1
    )
    .padStart(
      2,
      "0"
    );


  const h =
    String(
      date.getHours()
    )
    .padStart(
      2,
      "0"
    );


  const min =
    String(
      date.getMinutes()
    )
    .padStart(
      2,
      "0"
    );


  return [
    `${d}.${m}`,
    `${h}:${min}`
  ];
}


// =====================================================
// KIERUNEK WIATRU
// =====================================================

function directionToNumber(
  dir
) {

  if (
    dir === undefined ||
    dir === null
  ) {

    return null;
  }


  const index =
    directionNames.indexOf(
      String(
        dir
      )
      .trim()
      .toUpperCase()
    );


  return index >= 0
    ?
    index
    :
    null;
}


function numberToDirection(
  value
) {

  return directionNames[
    Math.round(
      Number(
        value
      )
    )
  ]
  ??
  "";
}


// =====================================================
// STAN POGODY
// =====================================================

function getWeatherState(
  lux,
  rain,
  timestamp = Date.now()
) {

  const luxValue =
    Number.isFinite(
      Number(
        lux
      )
    )
    ?
    Number(
      lux
    )
    :
    0;


  const rainValue =
    Number.isFinite(
      Number(
        rain
      )
    )
    ?
    Number(
      rain
    )
    :
    0;


  const date =
    new Date(
      Number(
        timestamp
      )
    );


  const hour =
    Number.isNaN(
      date.getTime()
    )
    ?
    new Date().getHours()
    :
    date.getHours();


  const night =
    hour < 6 ||
    hour > 20;


  if (
    rainValue >= 70
  ) {

    return {

      emoji:
        "⛈️",

      desc:
        "Ulewa"

    };
  }


  if (
    rainValue >= 25
  ) {

    return {

      emoji:
        "🌧️",

      desc:
        "Deszcz"

    };
  }


  if (
    rainValue >= 5
  ) {

    return {

      emoji:
        "🌦️",

      desc:
        "Przelotny deszcz"

    };
  }


  if (
    night &&
    luxValue < 100
  ) {

    return {

      emoji:
        "🌙",

      desc:
        "Noc"

    };
  }


  if (
    luxValue < 300
  ) {

    return {

      emoji:
        "☁️",

      desc:
        "Pochmurno"

    };
  }


  if (
    luxValue < 2500
  ) {

    return {

      emoji:
        "🌥️",

      desc:
        "Zachmurzenie"

    };
  }


  return {

    emoji:
      "☀️",

    desc:
      "Słonecznie"

  };
}


// =====================================================
// HISTORYCZNE IKONY POGODY
// =====================================================

const weatherHistoryPlugin = {

  id:
    "weatherHistory",


  afterDraw(
    chart
  ) {

    if (
      !Array.isArray(
        fullData
      )
      ||
      fullData.length === 0
    ) {

      return;
    }


    const meta =
      chart.getDatasetMeta(
        0
      );


    const area =
      chart.chartArea;


    if (
      !meta?.data?.length ||
      !area
    ) {

      return;
    }


    const visible =
      [];


    meta.data.forEach(
      (
        point,
        index
      ) => {

        if (
          !point
        ) {

          return;
        }


        if (
          point.x < area.left ||
          point.x > area.right
        ) {

          return;
        }


        const row =
          fullData[
            index
          ];


        if (
          !row
        ) {

          return;
        }


        visible.push({

          point:
            point,

          index:
            index,

          weather:
            getWeatherState(
              row[4],
              row[8],
              row[0]
            )

        });
      }
    );


    if (
      !visible.length
    ) {

      return;
    }


    const selectedIndexes =
      new Set(
        [
          0,
          visible.length - 1
        ]
      );


    for (
      let i = 1;
      i < visible.length;
      i++
    ) {

      if (
        visible[i - 1].weather.emoji
        !==
        visible[i].weather.emoji
      ) {

        selectedIndexes.add(
          i - 1
        );


        selectedIndexes.add(
          i
        );
      }
    }


    const usableWidth =
      area.right -
      area.left;


    const maxIcons =
      Math.max(
        4,
        Math.floor(
          usableWidth /
          85
        )
      );


    const step =
      Math.max(
        1,
        Math.ceil(
          visible.length /
          maxIcons
        )
      );


    for (
      let i = 0;
      i < visible.length;
      i += step
    ) {

      selectedIndexes.add(
        i
      );
    }


    const selected =
      Array.from(
        selectedIndexes
      )
      .sort(
        (
          a,
          b
        ) =>
        a - b
      );


    const ctx =
      chart.ctx;


    const styles =
      getComputedStyle(
        document.body
      );


    const cardColor =
      styles
      .getPropertyValue(
        "--card-bg"
      )
      .trim()
      ||
      "#161b22";


    const borderColor =
      styles
      .getPropertyValue(
        "--border-color"
      )
      .trim()
      ||
      "#30363d";


    const iconY =
      area.top -
      22;


    ctx.save();


    selected.forEach(
      selectedIndex => {

        const item =
          visible[
            selectedIndex
          ];


        if (
          !item
        ) {

          return;
        }


        const x =
          item.point.x;


        ctx.beginPath();


        ctx.arc(
          x,
          iconY,
          13,
          0,
          Math.PI * 2
        );


        ctx.fillStyle =
          cardColor;


        ctx.fill();


        ctx.strokeStyle =
          borderColor;


        ctx.lineWidth =
          1;


        ctx.stroke();


        ctx.beginPath();


        ctx.moveTo(
          x,
          iconY + 14
        );


        ctx.lineTo(
          x,
          area.top - 3
        );


        ctx.strokeStyle =
          "rgba(139,148,158,0.22)";


        ctx.lineWidth =
          1;


        ctx.stroke();


        ctx.font =
          chart.width < 650
          ?
          "15px Segoe UI Emoji, Apple Color Emoji, sans-serif"
          :
          "17px Segoe UI Emoji, Apple Color Emoji, sans-serif";


        ctx.textAlign =
          "center";


        ctx.textBaseline =
          "middle";


        ctx.fillText(
          item.weather.emoji,
          x,
          iconY
        );
      }
    );


    ctx.restore();
  }
};


Chart.register(
  weatherHistoryPlugin
);


// =====================================================
// KAFELKI
// =====================================================

function setNumericText(
  id,
  value,
  decimals
) {

  const element =
    document.getElementById(
      id
    );


  if (
    !element
  ) {

    return;
  }


  const number =
    parseFloat(
      value
    );


  element.innerText =
    Number.isFinite(
      number
    )
    ?
    number.toFixed(
      decimals
    )
    :
    "--";
}


// =====================================================
// DATA NAD WYKRESEM
// =====================================================

function updateChartDate(
  key,
  row
) {

  if (
    !key ||
    !row
  ) {

    return;
  }


  const element =
    document.getElementById(
      `chart-date-${key}`
    );


  if (
    element
  ) {

    element.innerText =
      `Pomiar: ${formatDateTime(row[0])}`;
  }
}


function restoreChartDate(
  chart
) {

  if (
    !fullData.length
  ) {

    return;
  }


  const key =
    chartKeyByCanvas[
      chart.canvas.id
    ];


  updateChartDate(
    key,
    fullData[
      fullData.length - 1
    ]
  );
}


// =====================================================
// AKTUALIZACJA KAFELKOW
// =====================================================

function updateCardsWithData(
  row
) {

  if (
    !row
  ) {

    return;
  }


  setNumericText(
    "v1",
    row[1],
    1
  );


  setNumericText(
    "v2",
    row[2],
    1
  );


  setNumericText(
    "v3",
    row[3],
    0
  );


  setNumericText(
    "v4",
    row[4],
    0
  );


  setNumericText(
    "v5",
    row[5],
    2
  );


  setNumericText(
    "v-wind",
    row[6],
    2
  );


  setNumericText(
    "v-rain",
    row[8],
    1
  );


  const direction =
    document.getElementById(
      "v-dir"
    );


  if (
    direction
  ) {

    direction.innerText =
      row[7]
      ||
      "--";
  }


  const weather =
    getWeatherState(
      row[4],
      row[8],
      row[0]
    );


  const weatherEmoji =
    document.getElementById(
      "weather-emoji"
    );


  const weatherDescription =
    document.getElementById(
      "weather-description"
    );


  const lastMeasurement =
    document.getElementById(
      "last-measurement"
    );


  if (
    weatherEmoji
  ) {

    weatherEmoji.innerText =
      weather.emoji;
  }


  if (
    weatherDescription
  ) {

    weatherDescription.innerText =
      weather.desc;
  }


  if (
    lastMeasurement
  ) {

    lastMeasurement.innerText =
      `Ostatni pomiar: ${formatDateTime(row[0])}`;
  }


  for (
    let i = 1;
    i <= 8;
    i++
  ) {

    updateChartDate(
      `V${i}`,
      row
    );
  }
}


// =====================================================
// NAJNOWSZY POMIAR
//
// row[9] = PROCENT BATERII
// =====================================================

async function refreshExtraValues() {

  try {

    const response =
      await fetch(
        `${scriptURL}?latest=true&t=${Date.now()}`,
        {
          cache:
            "no-store"
        }
      );


    if (
      !response.ok
    ) {

      throw new Error(
        response.status
      );
    }


    const row =
      await response.json();


    if (
      Array.isArray(
        row
      )
      &&
      row.length >= 10
    ) {

      updateCardsWithData(
        row
      );


      updateBattery(
        row[9]
      );
    }

  }

  catch (
    error
  ) {

    console.error(
      "Błąd danych LIVE:",
      error
    );
  }
}


// =====================================================
// DANE DO WYKRESOW
// =====================================================

async function refreshValues() {

  if (
    isFetching
  ) {

    return false;
  }


  isFetching =
    true;


  updateStatus(
    "loading"
  );


  try {

    const response =
      await fetch(
        `${scriptURL}?read=true&interval=${currentInterval}&t=${Date.now()}`,
        {
          cache:
            "no-store"
        }
      );


    if (
      !response.ok
    ) {

      throw new Error(
        response.status
      );
    }


    const data =
      await response.json();


    if (
      !Array.isArray(
        data
      )
      ||
      data.length === 0
    ) {

      updateStatus(
        false
      );


      return false;
    }


    fullData =
      data;


    const newestRow =
      data[
        data.length - 1
      ];


    updateCardsWithData(
      newestRow
    );


    if (
      newestRow.length >= 10
    ) {

      updateBattery(
        newestRow[9]
      );
    }


    updateCharts();


    updateStatus(
      true
    );


    const timestamp =
      newestRow[0];


    const newData =
      timestamp !==
      lastKnownTimestamp;


    lastKnownTimestamp =
      timestamp;


    return newData;

  }

  catch (
    error
  ) {

    console.error(
      "Błąd pobierania:",
      error
    );


    updateStatus(
      false
    );


    return false;

  }

  finally {

    isFetching =
      false;
  }
}


// =====================================================
// NASTEPNA AKTUALIZACJA
// =====================================================

function getNextExpectedUpdate(
  now = new Date()
) {

  /*
    LIVE:
    00:00:30
    00:05:30
    00:10:30
    itd.

    1h:
    każda pełna godzina + 30 sekund.

    6h:
    00:00:30
    06:00:30
    12:00:30
    18:00:30

    30 sekund zapasu daje Apps Scriptowi czas
    na zapisanie/usrednienie nowego wiersza.
  */

  let periodMs;


  if (
    currentInterval ===
    "6h"
  ) {

    periodMs =
      6 *
      60 *
      60 *
      1000;
  }

  else if (
    currentInterval ===
    "1h"
  ) {

    periodMs =
      60 *
      60 *
      1000;
  }

  else {

    periodMs =
      5 *
      60 *
      1000;
  }


  const offsetMs =
    30000;


  const nowMs =
    now.getTime();


  /*
    Przeliczenie na czas lokalny.

    To jest ważne szczególnie dla 6h,
    żeby granice były:

    00 / 06 / 12 / 18

    według lokalnego czasu użytkownika.
  */

  const timezoneOffsetMs =
    now.getTimezoneOffset() *
    60 *
    1000;


  const localNowMs =
    nowMs -
    timezoneOffsetMs;


  /*
    Odejmujemy 30 sekund PRZED ceil().

    Dzięki temu:

    19:00:05

    nadal wskazuje następny update:

    19:00:30

    zamiast błędnie przeskoczyć na:

    20:00:30
  */

  const targetLocalMs =
    Math.ceil(
      (
        localNowMs -
        offsetMs
      )
      /
      periodMs
    )
    *
    periodMs
    +
    offsetMs;


  const targetMs =
    targetLocalMs +
    timezoneOffsetMs;


  return new Date(
    targetMs
  );
}


// =====================================================
// LICZNIK
// =====================================================

function runTick() {

  const now =
    new Date();


  const target =
    getNextExpectedUpdate(
      now
    );


  const seconds =
    Math.max(
      0,
      Math.floor(
        (
          target.getTime()
          -
          now.getTime()
        )
        /
        1000
      )
    );


  const h =
    Math.floor(
      seconds /
      3600
    );


  const m =
    Math.floor(
      (
        seconds %
        3600
      )
      /
      60
    );


  const s =
    seconds %
    60;


  const display =
    h > 0
    ?
    `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    :
    `${m}:${String(s).padStart(2, "0")}`;


  document.querySelectorAll(
    '[id^="timer-V"]'
  )
  .forEach(
    element => {

      element.innerText =
        display;


      element.style.color =
        "#7ee787";
    }
  );


  const fetchKey =
    `${currentInterval}-${target.getTime()}`;


  /*
    Pobieramy dane około 2 sekundy przed punktem
    +30 s. Apps Script ma więc około 28 sekund
    od granicy okresu na przygotowanie danych.
  */

  if (
    seconds <= 2
    &&
    lastAutoFetchKey !==
    fetchKey
  ) {

    lastAutoFetchKey =
      fetchKey;


    refreshValues();


    refreshExtraValues();
  }
}


// =====================================================
// DATASET
// =====================================================

function createDataset(
  label,
  color,
  stepped = false
) {

  return {

    label:
      label,

    data:
      [],

    borderColor:
      color,

    borderWidth:
      4,

    fill:
      true,

    tension:
      stepped
      ?
      0
      :
      0.35,

    stepped:
      stepped,

    pointRadius:
      0,

    pointHoverRadius:
      6,

    pointHitRadius:
      18,

    spanGaps:
      true,

    backgroundColor:
      `${color}20`

  };
}


// =====================================================
// POGODA W TOOLTIPIE
// =====================================================

function getTooltipWeather(
  items
) {

  if (
    !items?.length
  ) {

    return "";
  }


  const row =
    fullData[
      items[0].dataIndex
    ];


  if (
    !row
  ) {

    return "";
  }


  const state =
    getWeatherState(
      row[4],
      row[8],
      row[0]
    );


  return `${state.emoji} ${state.desc}`;
}


// =====================================================
// NAJECHANIE NA WYKRES
// =====================================================

function handleChartHover(
  event,
  elements,
  chart
) {

  const key =
    chartKeyByCanvas[
      chart.canvas.id
    ];


  if (
    !key
  ) {

    return;
  }


  if (
    !elements?.length
  ) {

    restoreChartDate(
      chart
    );


    return;
  }


  const index =
    elements[0].index;


  const row =
    fullData[
      index
    ];


  if (
    row
  ) {

    updateChartDate(
      key,
      row
    );
  }
}


// =====================================================
// OPCJE WYKRESOW
// =====================================================

function createBaseOptions(
  min,
  max,
  unit = ""
) {

  return {

    responsive:
      true,

    maintainAspectRatio:
      false,


    layout: {

      padding: {

        top:
          42

      }
    },


    interaction: {

      mode:
        "index",

      intersect:
        false
    },


    onHover:
      handleChartHover,


    scales: {

      y: {

        suggestedMin:
          min,

        suggestedMax:
          max,


        ticks: {

          color:
            "#8b949e",

          callback:
            value =>
            `${value}${unit}`
        },


        grid: {

          color:
            "rgba(139,148,158,0.06)"
        }
      },


      x: {

        ticks: {

          color:
            "#8b949e",

          maxTicksLimit:
            8,

          autoSkip:
            true,

          maxRotation:
            0,


          callback:
            function(
              value
            ) {

              return formatAxisLabel(
                this.getLabelForValue(
                  value
                )
              );
            }
        },


        grid: {

          display:
            false
        }
      }
    },


    plugins: {

      legend: {

        display:
          false
      },


      tooltip: {

        displayColors:
          false,


        callbacks: {

          title:
            items => {

              if (
                !items?.length
              ) {

                return "";
              }


              return formatDateTime(
                items[0].label
              );
            },


          beforeBody:
            items =>
            getTooltipWeather(
              items
            )
        }
      }
    }
  };
}


// =====================================================
// TWORZENIE WYKRESOW
// =====================================================

function initCharts() {


  charts.V1 =
    new Chart(

      document.getElementById(
        "tempChart"
      ),

      {

        type:
          "line",


        data: {

          datasets: [

            createDataset(
              "Temperatura",
              "#ff7b72"
            )

          ]
        },


        options:
          createBaseOptions(
            10,
            30,
            "°C"
          )
      }
    );


  charts.V2 =
    new Chart(

      document.getElementById(
        "humChart"
      ),

      {

        type:
          "line",


        data: {

          datasets: [

            createDataset(
              "Wilgotność",
              "#79c0ff"
            )

          ]
        },


        options:
          createBaseOptions(
            20,
            100,
            "%"
          )
      }
    );


  charts.V3 =
    new Chart(

      document.getElementById(
        "presChart"
      ),

      {

        type:
          "line",


        data: {

          datasets: [

            createDataset(
              "Ciśnienie",
              "#7ee787"
            )

          ]
        },


        options:
          createBaseOptions(
            980,
            1030,
            " hPa"
          )
      }
    );


  charts.V4 =
    new Chart(

      document.getElementById(
        "luxChart"
      ),

      {

        type:
          "line",


        data: {

          datasets: [

            createDataset(
              "Jasność",
              "#f1c40f"
            )

          ]
        },


        options:
          createBaseOptions(
            0,
            10000,
            " lx"
          )
      }
    );


  charts.V5 =
    new Chart(

      document.getElementById(
        "uvChart"
      ),

      {

        type:
          "line",


        data: {

          datasets: [

            createDataset(
              "UV",
              "#ab47bc"
            )

          ]
        },


        options:
          createBaseOptions(
            0,
            11,
            ""
          )
      }
    );


  charts.V6 =
    new Chart(

      document.getElementById(
        "windChart"
      ),

      {

        type:
          "line",


        data: {

          datasets: [

            createDataset(
              "Wiatr",
              "#56d4dd"
            )

          ]
        },


        options:
          createBaseOptions(
            0,
            10,
            " m/s"
          )
      }
    );


  const dirOptions =
    createBaseOptions(
      0,
      7,
      ""
    );


  dirOptions.scales.y = {

    min:
      0,

    max:
      7,


    ticks: {

      stepSize:
        1,

      color:
        "#8b949e",

      callback:
        value =>
        numberToDirection(
          value
        )
    },


    grid: {

      color:
        "rgba(139,148,158,0.06)"
    }
  };


  dirOptions.plugins.tooltip.callbacks.label =
    context =>
    `Kierunek: ${numberToDirection(context.parsed.y)}`;


  charts.V7 =
    new Chart(

      document.getElementById(
        "dirChart"
      ),

      {

        type:
          "line",


        data: {

          datasets: [

            createDataset(
              "Kierunek",
              "#d2a8ff",
              true
            )

          ]
        },


        options:
          dirOptions
      }
    );


  charts.V8 =
    new Chart(

      document.getElementById(
        "rainChart"
      ),

      {

        type:
          "line",


        data: {

          datasets: [

            createDataset(
              "Opady",
              "#58a6ff"
            )

          ]
        },


        options:
          createBaseOptions(
            0,
            100,
            "%"
          )
      }
    );


  Object.values(
    charts
  )
  .forEach(
    chart => {

      chart.canvas.addEventListener(

        "mouseleave",

        () =>
        restoreChartDate(
          chart
        )

      );
    }
  );
}


// =====================================================
// AKTUALIZACJA WYKRESOW
// =====================================================

function updateCharts() {

  const labels =
    fullData.map(
      row =>
      Number(
        row[0]
      )
    );


  Object.keys(
    charts
  )
  .forEach(
    key => {

      const chart =
        charts[
          key
        ];


      const index =
        parseInt(
          key.replace(
            "V",
            ""
          ),
          10
        );


      chart.data.labels =
        labels;


      if (
        index === 7
      ) {

        chart.data.datasets[0].data =
          fullData.map(
            row =>
            directionToNumber(
              row[7]
            )
          );

      }

      else {

        chart.data.datasets[0].data =
          fullData.map(
            row => {

              const value =
                parseFloat(
                  row[
                    index
                  ]
                );


              return Number.isFinite(
                value
              )
              ?
              value
              :
              null;
            }
          );
      }


      chart.options.scales.x.min =
        Math.max(
          0,
          fullData.length -
          VISIBLE_POINTS
        );


      chart.options.scales.x.max =
        Math.max(
          0,
          fullData.length -
          1
        );


      chart.update();
    }
  );
}


// =====================================================
// SUWAK
// =====================================================

function manualScroll(
  key,
  value
) {

  const maxStart =
    Math.max(
      0,
      fullData.length -
      VISIBLE_POINTS
    );


  const start =
    Math.floor(
      Number(
        value
      )
      /
      100
      *
      maxStart
    );


  const end =
    Math.min(
      fullData.length -
      1,
      start +
      VISIBLE_POINTS -
      1
    );


  Object.keys(
    charts
  )
  .forEach(
    chartKey => {

      charts[
        chartKey
      ]
      .options
      .scales
      .x
      .min =
        start;


      charts[
        chartKey
      ]
      .options
      .scales
      .x
      .max =
        end;


      charts[
        chartKey
      ]
      .update(
        "none"
      );


      const slider =
        document.getElementById(
          `scroll${chartKey}`
        );


      if (
        slider
      ) {

        slider.value =
          value;
      }
    }
  );
}


// =====================================================
// PRZEWIJANIE DO WYKRESU
// =====================================================

function scrollToChart(
  id
) {

  const element =
    document.getElementById(
      id
    );


  if (
    !element
  ) {

    return;
  }


  const container =
    element.closest(
      ".chart-container"
    );


  if (
    container
  ) {

    container.scrollIntoView({

      behavior:
        "smooth",

      block:
        "center"

    });
  }
}


// =====================================================
// ZMIANA INTERWALU
// =====================================================

function changeInterval(
  type,
  button
) {

  currentInterval =
    type;


  document.querySelectorAll(
    "#interval-btns button"
  )
  .forEach(
    element => {

      element.classList.remove(
        "active"
      );
    }
  );


  if (
    button
  ) {

    button.classList.add(
      "active"
    );
  }


  lastKnownTimestamp =
    null;


  lastAutoFetchKey =
    "";


  runTick();


  refreshValues();


  refreshExtraValues();
}


// =====================================================
// STATUS
// =====================================================

function updateStatus(
  status
) {

  const icon =
    document.getElementById(
      "wifi-icon"
    );


  const text =
    document.getElementById(
      "status-text"
    );


  if (
    !icon ||
    !text
  ) {

    return;
  }


  if (
    status ===
    "loading"
  ) {

    icon.style.color =
      "#f1c40f";


    text.innerText =
      "Aktualizacja...";
  }


  else if (
    status === true
  ) {

    icon.style.color =
      "#7ee787";


    text.innerText =
      currentInterval ===
      "5min"
      ?
      "LIVE"
      :
      "Online";
  }


  else {

    icon.style.color =
      "#ff7b72";


    text.innerText =
      "Offline";
  }
}


// =====================================================
// MOTYW
// =====================================================

const themeCheckbox =
  document.getElementById(
    "checkbox"
  );


if (
  themeCheckbox
) {

  themeCheckbox.addEventListener(

    "change",

    () => {

      document.body.classList.toggle(
        "light-mode"
      );
    }
  );
}


// =====================================================
// START
// =====================================================

window.addEventListener(

  "load",

  () => {

    initCharts();


    updateCurrentDate();


    /*
      Timer pokazujemy OD RAZU,
      bez czekania pierwszej sekundy.
    */

    runTick();


    /*
      Natychmiast pobieramy dane.
    */

    refreshValues();


    refreshExtraValues();


    /*
      Timer aktualizuje sie co 1 sekunde.
    */

    setInterval(
      runTick,
      1000
    );


    /*
      Zegar na stronie aktualizuje sie co 1 sekunde.
    */

    setInterval(
      updateCurrentDate,
      1000
    );


    /*
      Najnowszy pomiar + bateria odswiezane co 10 sekund.
    */

    setInterval(
      refreshExtraValues,
      10000
    );
  }
);
