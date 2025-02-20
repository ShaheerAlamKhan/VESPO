// app.js
import { dataProcessor } from "./dataProcessing.js";
import { visualization } from "./visualization.js";

// Responsive visualization dimensions
const getVisualizationDimensions = () => {
    const container = document.getElementById('visualization');
    if (!container) return { width: 1000, height: 600 };
    
    const rect = container.getBoundingClientRect();
    const width = rect.width || 1000;
    const height = Math.min(width * 0.6, 600);
    console.log('Container dimensions:', { width, height });
    return { width, height };
};

// Modern metrics configuration with improved formatting
const metrics = {
    age: {
        label: "Patient Age (years)",
        format: d => d ? `${d} years` : "N/A",
        color: "#3b82f6"
    },
    bmi: {
        label: "BMI",
        format: d => d ? d.toFixed(1) : "N/A",
        color: "#8b5cf6"
    },
    asa: {
        label: "ASA Score",
        format: d => d ? `ASA ${d}` : "N/A",
        color: "#ef4444"
    },
    duration: {
        label: "Surgery Duration (hours)",
        format: d => d ? `${d.toFixed(2)} hrs` : "N/A",
        color: "#10b981"
    },
    optype: {
        label: "Surgery Type",
        format: d => d || "N/A",
        color: "#f59e0b"
    },
    department: {
        label: "Department",
        format: d => d || "N/A",
        color: "#6366f1"
    },
    death_inhosp: {
        label: "Deaths",
        format: d => d ? `${(d * 100).toFixed(1)}%` : "N/A",
        color: "#dc2626"
    }
};

// Improved debounce utility
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

let currentVisualization = 'scatter';

// Update the explanation text for the active plot
function updatePlotExplanation() {
    const explanationContainer = document.getElementById("plot-explanation");
    let explanationText = "";
    switch(currentVisualization) {
        case "scatter":
            explanationText = `<strong>Bee Plot Explanation:</strong> This beeswarm plot displays individual surgical cases grouped by the selected risk factor (X-Axis). The Y-Axis shows the outcome (e.g., surgery duration). Each point represents a case – hover over a point for details.`;
            break;
        case "sunburst":
            explanationText = `<strong>Sunburst Plot Explanation:</strong> This sunburst plot presents a hierarchical breakdown of surgical cases based on parameters such as emergency status, surgery type, approach, age, BMI, and ASA score. Click on arcs to zoom in and explore the underlying details.`;
            break;
        case "boxplot":
            explanationText = `<strong>Box Plot Explanation:</strong> This box plot visualizes the distribution of the selected outcome across groups defined by the risk factor. It displays the median, quartiles, and extremes. Hover over the boxes for more statistical details.`;
            break;
        default:
            explanationText = "";
    }
    if (explanationContainer) {
        explanationContainer.innerHTML = explanationText;
        explanationContainer.style.display = "block";
    }
}

function updateCurrentVisualization() {
    const dimensions = getVisualizationDimensions();
    console.log('Updating visualization:', currentVisualization, dimensions);
    
    const filters = {
        riskFactor: document.getElementById("risk-factor")?.value || "age",
        outcome: document.getElementById("outcome")?.value || "duration"
    };
    
    const filteredData = dataProcessor.getFilteredData(filters);
    
    // Clear previous visualization
    const container = document.getElementById('visualization');
    if (container) {
        container.innerHTML = '';
    }

    // Show loading state
    document.getElementById("loading").style.display = "flex";
    
    // Use requestAnimationFrame to ensure DOM updates before visualization
    requestAnimationFrame(() => {
        try {
            switch(currentVisualization) {
                case 'scatter':
                    visualization.updateAlternativePlot(filteredData, filters, metrics, dimensions);
                    break;
                case 'sunburst':
                    visualization.updateSunburst(filteredData, filters, metrics, dimensions);
                    break;
                case 'boxplot':
                    visualization.updateBoxPlot(filteredData, filters, metrics, dimensions);
                    break;
            }
        } catch (error) {
            console.error('Error updating visualization:', error);
            if (container) {
                container.innerHTML = `
                    <div class="text-red-500 p-4 text-center">
                        <p>Error displaying visualization. Please try again.</p>
                        <p class="text-sm mt-2">${error.message}</p>
                    </div>
                `;
            }
        } finally {
            document.getElementById("loading").style.display = "none";
        }
        // Update the explanation text after the visualization is updated
        updatePlotExplanation();
    });
}

function setupEventListeners() {
    // Filter change handlers
    const riskFactorEl = document.getElementById("risk-factor");
    const outcomeEl = document.getElementById("outcome");
    
    if (riskFactorEl) {
        riskFactorEl.addEventListener("change", debounce(updateCurrentVisualization, 300));
    }
    
    if (outcomeEl) {
        outcomeEl.addEventListener("change", debounce(updateCurrentVisualization, 300));
    }

    // Tab handlers
    const tabMapping = {
        'scatter-tab': 'scatter',
        'sunburst-tab': 'sunburst',
        'boxplot-tab': 'boxplot'
    };

    Object.entries(tabMapping).forEach(([tabId, vizType]) => {
        const tab = document.getElementById(tabId);
        if (tab) {
            tab.addEventListener("click", () => {
                // Update active states
                Object.keys(tabMapping).forEach(id => {
                    document.getElementById(id)?.classList.remove("active");
                });
                tab.classList.add("active");
                
                // Update visualization
                currentVisualization = vizType;
                updateCurrentVisualization();
            });
        }
    });

    // Window resize handler
    window.addEventListener('resize', debounce(updateCurrentVisualization, 250));

    // Dark mode toggle handler
    const darkModeToggle = document.getElementById("dark-mode-toggle");
    if (darkModeToggle) {
        // Check system preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-mode');
            darkModeToggle.checked = true;
        }

        darkModeToggle.addEventListener("change", () => {
            document.body.classList.toggle("dark-mode");
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');
            updateCurrentVisualization();
        });

        // Check stored preference
        const storedDarkMode = localStorage.getItem('darkMode');
        if (storedDarkMode) {
            if (storedDarkMode === 'enabled') {
                document.body.classList.add('dark-mode');
                darkModeToggle.checked = true;
            } else {
                document.body.classList.remove('dark-mode');
                darkModeToggle.checked = false;
            }
        }
    }
}

async function initializeApp() {
    try {
        // Show loading state
        document.getElementById("loading").style.display = "flex";
        
        // Initialize dark mode
        const darkModeToggle = document.getElementById("dark-mode-toggle");
        if (darkModeToggle) {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.body.classList.add('dark-mode');
                darkModeToggle.checked = true;
            }

            darkModeToggle.addEventListener("change", () => {
                document.body.classList.toggle("dark-mode");
                localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');
                updateCurrentVisualization();
            });

            const storedDarkMode = localStorage.getItem('darkMode');
            if (storedDarkMode) {
                if (storedDarkMode === 'enabled') {
                    document.body.classList.add('dark-mode');
                    darkModeToggle.checked = true;
                } else {
                    document.body.classList.remove('dark-mode');
                    darkModeToggle.checked = false;
                }
            }
        }

        // Fetch and process data
        console.log("Starting data fetch...");
        await dataProcessor.fetchData();
        console.log("Data fetch complete");
        console.log("Raw data count:", dataProcessor.rawData.length);
        console.log("Processed data count:", dataProcessor.processedData.length);

        // Setup event listeners
        setupEventListeners();

        // Initial visualization
        updateCurrentVisualization();

        // Initialize word cloud with delay
        setTimeout(() => {
            visualization.updateWordCloud(dataProcessor.rawData);
        }, 2000);

    } catch (error) {
        console.error("Error initializing app:", error);
        document.getElementById("loading").style.display = "none";
        
        const visualizationContainer = document.getElementById("visualization");
        if (visualizationContainer) {
            visualizationContainer.innerHTML = `
                <div class="text-red-500 p-4 text-center">
                    <p>Error loading visualization. Please try refreshing the page.</p>
                    <p class="text-sm mt-2">${error.message}</p>
                </div>
            `;
        }
    }
}

document.addEventListener("DOMContentLoaded", initializeApp);
