// app.js
import { dataProcessor } from "./dataProcessing.js";
import { visualization } from "./visualization.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

async function initializeApp() {
  try {
    console.log("Starting data fetch...");
    await dataProcessor.fetchData();
    console.log("Data fetch complete");
    console.log("Raw data count:", dataProcessor.rawData.length);
    console.log("Processed data count:", dataProcessor.processedData.length);
    // Set up initial view as scatter plot
    updateVisualization();
    setupEventListeners();
    setupTabs();
    
    // Set up Dark Mode toggle switch
    const darkModeToggle = document.getElementById("dark-mode-toggle");
    if (darkModeToggle) {
      darkModeToggle.addEventListener("change", () => {
        document.body.classList.toggle("dark-mode");
      });
    }
  } catch (error) {
    console.error("Error initializing app:", error);
  }
}

function setupEventListeners() {
  document.getElementById("risk-factor")?.addEventListener("change", () => {
    if (document.getElementById("scatter-tab").classList.contains("active")) {
      updateVisualization();
    } else {
      updateSunburst();
    }
  });
  document.getElementById("outcome")?.addEventListener("change", () => {
    if (document.getElementById("scatter-tab").classList.contains("active")) {
      updateVisualization();
    } else {
      updateSunburst();
    }
  });
  document.getElementById("department")?.addEventListener("change", () => {
    if (document.getElementById("scatter-tab").classList.contains("active")) {
      updateVisualization();
    } else {
      updateSunburst();
    }
  });
}

function updateVisualization() {
  const filters = {
    riskFactor: document.getElementById("risk-factor")?.value || "age",
    outcome: document.getElementById("outcome")?.value || "duration",
    emergency: "",
    department: document.getElementById("department")?.value || ""
  };

  console.log("Filters:", filters);
  console.log("Processed Data:", dataProcessor.processedData);

  const filteredData = dataProcessor.getFilteredData(filters);
  console.log("Filtered Data:", filteredData);

  visualization.updateVisualization(filteredData, filters);
}

function updateSunburst() {
  const filters = {
    riskFactor: document.getElementById("risk-factor")?.value || "age",
    outcome: document.getElementById("outcome")?.value || "duration",
    emergency: "",
    department: document.getElementById("department")?.value || ""
  };

  const filteredData = dataProcessor.getFilteredData(filters);
  visualization.updateSunburst(filteredData, filters);
}

function setupTabs() {
  const scatterTab = document.getElementById("scatter-tab");
  const sunburstTab = document.getElementById("sunburst-tab");

  scatterTab.addEventListener("click", () => {
    scatterTab.classList.add("active");
    sunburstTab.classList.remove("active");
    document.getElementById("visualization").innerHTML = "";
    visualization.setupVisualization();
    updateVisualization();
  });

  sunburstTab.addEventListener("click", () => {
    sunburstTab.classList.add("active");
    scatterTab.classList.remove("active");
    document.getElementById("visualization").innerHTML = "";
    updateSunburst();
  });
}

document.addEventListener("DOMContentLoaded", initializeApp);
