// app.js
import { dataProcessor } from './dataProcessing.js';
import { visualization } from './visualization.js'

async function initializeApp() {
    try {
        await dataProcessor.fetchData();
        
        // Initial visualization
        const initialData = dataProcessor.getFilteredData();
        visualization.updateVisualization(initialData);
        
        // Set up filter event listeners
        setupFilters();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

function setupFilters() {
    // Add event listeners to your filter elements
    document.querySelectorAll('.filter-select').forEach(select => {
        select.addEventListener('change', handleFilterChange);
    });
}

function handleFilterChange() {
    const filters = {
        surgicalApproach: document.getElementById('surgical-approach').value,
        demographics: document.getElementById('demographics').value,
        anesthesia: document.getElementById('anesthesia').value,
        anesthetic: document.getElementById('anesthetic').value,
        operationTime: document.getElementById('operation-time').value,
        surgeryType: document.getElementById('surgery-type').value,
        diagnosis: document.getElementById('diagnosis').value
    };
    
    const filteredData = dataProcessor.getFilteredData(filters);
    visualization.updateVisualization(filteredData);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);