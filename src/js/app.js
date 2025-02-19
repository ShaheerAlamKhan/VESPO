// app.js
import { dataProcessor } from './dataProcessing.js';
import { visualization } from './visualization.js';

async function initializeApp() {
    try {
        console.log('Starting data fetch...');
        await dataProcessor.fetchData();
        console.log('Data fetch complete');
        console.log('Raw data count:', dataProcessor.rawData.length);
        console.log('Processed data count:', dataProcessor.processedData.length);
        updateVisualization();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

function setupEventListeners() {
    // Make sure these IDs match your HTML
    document.getElementById('risk-factor')?.addEventListener('change', updateVisualization);
    document.getElementById('outcome')?.addEventListener('change', updateVisualization);
    document.getElementById('emergency')?.addEventListener('change', updateVisualization);
    document.getElementById('department')?.addEventListener('change', updateVisualization);
}

function updateVisualization() {
    const filters = {
        riskFactor: document.getElementById('risk-factor')?.value || 'age',  // provide defaults
        outcome: document.getElementById('outcome')?.value || 'duration',
        emergency: document.getElementById('emergency')?.value || '',
        department: document.getElementById('department')?.value || ''
    };

    // Debug log
    console.log('Filters:', filters);
    console.log('Processed Data:', dataProcessor.processedData);
    
    const filteredData = dataProcessor.getFilteredData(filters);
    console.log('Filtered Data:', filteredData);
    
    visualization.updateVisualization(filteredData, filters);
}

document.addEventListener('DOMContentLoaded', initializeApp);