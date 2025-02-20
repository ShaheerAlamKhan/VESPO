// app.js
import { dataProcessor } from "./dataProcessing.js";
import { visualization } from "./visualization.js";

// Common metrics configuration
const metrics = {
  age: {
    label: "Patient Age (years)",
    format: d => (d ? `${d} years` : "N/A"),
  },
  bmi: {
    label: "BMI",
    format: d => (d ? d.toFixed(1) : "N/A"),
  },
  asa: {
    label: "ASA Score",
    format: d => (d ? `${d} ASA` : "N/A"),
  },
  duration: {
    label: "Surgery Duration (hours)",
    format: d => (d ? `${d.toFixed(2)} hours` : "N/A"),
  },
  approach: {
    label: "Surgery Approach",
    format: d => (d ? `${d}` : "N/A"),
    toNumeric: (d, categoryMap) =>
      categoryMap[d] !== undefined ? categoryMap[d] : NaN,
  },
  optype: {
    label: "Surgery Type",
    format: d => (d ? `${d}` : "N/A"),
    toNumeric: (d, categoryMap) =>
      categoryMap[d] !== undefined ? categoryMap[d] : NaN,
  },
  department: {
    label: "Department",
    format: d => (d ? `${d}` : "N/A"),
  },
  death_inhosp: {
    label: "Deaths",
    format: d => (d ? `${d.toFixed(0)} deaths` : "N/A"),
  },
};

// Debounce utility to delay rapid successive calls
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

async function initializeApp() {
  try {
    console.log("Starting data fetch...");
    await dataProcessor.fetchData();
    console.log("Data fetch complete");
    console.log("Raw data count:", dataProcessor.rawData.length);
    console.log("Processed data count:", dataProcessor.processedData.length);
    // Set up initial view using the alternative plot
    updateAlternativePlot();
    setupEventListeners();
    setupTabs();
    
    // Set up Dark Mode toggle
    const darkModeToggle = document.getElementById("dark-mode-toggle");
    if (darkModeToggle) {
      darkModeToggle.addEventListener("change", () => {
        document.body.classList.toggle("dark-mode");
      });
    }
    
    // Lazy load the word cloud after a short delay (e.g., 2 seconds)
    setTimeout(() => {
      visualization.updateWordCloud(dataProcessor.rawData);
    }, 2000);
  } catch (error) {
    console.error("Error initializing app:", error);
  }
}

function setupEventListeners() {
  const riskFactorEl = document.getElementById("risk-factor");
  const outcomeEl = document.getElementById("outcome");
  if (riskFactorEl) {
    riskFactorEl.addEventListener("change", debounce(() => {
      if (document.getElementById("scatter-tab").classList.contains("active")) {
        updateAlternativePlot();
      } else if (document.getElementById("sunburst-tab").classList.contains("active")) {
        updateSunburst();
      } else if (document.getElementById("boxplot-tab").classList.contains("active")) {
        updateBoxPlot();
      }
    }, 300));
  }
  if (outcomeEl) {
    outcomeEl.addEventListener("change", debounce(() => {
      if (document.getElementById("scatter-tab").classList.contains("active")) {
        updateAlternativePlot();
      } else if (document.getElementById("sunburst-tab").classList.contains("active")) {
        updateSunburst();
      } else if (document.getElementById("boxplot-tab").classList.contains("active")) {
        updateBoxPlot();
      }
    }, 300));
  }
}

function updateAlternativePlot() {
  const filters = {
    riskFactor: document.getElementById("risk-factor")?.value || "age",
    outcome: document.getElementById("outcome")?.value || "duration",
    emergency: ""
  };
  const filteredData = dataProcessor.getFilteredData(filters);
  visualization.updateAlternativePlot(filteredData, filters, metrics);
}

function updateSunburst() {
  const filters = {
    riskFactor: document.getElementById("risk-factor")?.value || "age",
    outcome: document.getElementById("outcome")?.value || "duration",
    emergency: ""
  };
  const filteredData = dataProcessor.getFilteredData(filters);
  visualization.updateSunburst(filteredData, filters, metrics);
}

function updateBoxPlot() {
  const filters = {
    riskFactor: document.getElementById("risk-factor")?.value || "age",
    outcome: document.getElementById("outcome")?.value || "duration",
    emergency: ""
  };
  const filteredData = dataProcessor.getFilteredData(filters);
  visualization.updateBoxPlot(filteredData, filters, metrics);
}

function setupTabs() {
  const alternativeTab = document.getElementById("scatter-tab");
  const sunburstTab = document.getElementById("sunburst-tab");
  const boxplotTab = document.getElementById("boxplot-tab");

  if (alternativeTab) {
    alternativeTab.addEventListener("click", debounce(() => {
      alternativeTab.classList.add("active");
      sunburstTab.classList.remove("active");
      boxplotTab.classList.remove("active");
      document.getElementById("visualization").innerHTML = "";
      updateAlternativePlot();
    }, 300));
  }
  if (sunburstTab) {
    sunburstTab.addEventListener("click", debounce(() => {
      sunburstTab.classList.add("active");
      alternativeTab.classList.remove("active");
      boxplotTab.classList.remove("active");
      document.getElementById("visualization").innerHTML = "";
      updateSunburst();
    }, 300));
  }
  if (boxplotTab) {
    boxplotTab.addEventListener("click", debounce(() => {
      boxplotTab.classList.add("active");
      alternativeTab.classList.remove("active");
      sunburstTab.classList.remove("active");
      document.getElementById("visualization").innerHTML = "";
      updateBoxPlot();
    }, 300));
  }
}

document.addEventListener("DOMContentLoaded", initializeApp);
