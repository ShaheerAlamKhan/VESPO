import { dataProcessor } from './dataProcessing.js';
import { visualization } from './visualization.js';
import { enhancedWordCloud } from './enhancedWordCloud.js';
import { simpleWordCloud } from './simpleWordCloud.js';



async function initializeApp() {
    try {
        await dataProcessor.fetchData();
        
        // Log first few data items to inspect structure
        console.log("Sample data from dataProcessor:", 
            dataProcessor.processedData.slice(0, 3));
        

        enhancedWordCloud.initialize('#word-cloud');
        
        // Call update immediately
        const allData = dataProcessor.getFilteredData({});

        
        updateVisualization();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

function initializeVisualizations() {
    // Initialize word cloud
    enhancedWordCloud.initialize('#word-cloud');
}
function setupEventListeners() {
    // Make sure these IDs match your HTML
    document.getElementById('risk-factor')?.addEventListener('change', updateVisualization);
    document.getElementById('outcome')?.addEventListener('change', updateVisualization);
    document.getElementById('emergency')?.addEventListener('change', updateVisualization);
    document.getElementById('department')?.addEventListener('change', updateVisualization);
    
    console.log("Event listeners set up");
}
// Add this function
function toggleVisualization(visType) {
    // Update active button state
    document.querySelectorAll('.vis-btn').forEach(btn => btn.classList.remove('active'));
    
    if (visType === 'scatter') {
        document.getElementById('scatter-btn').classList.add('active');
        document.getElementById('visualization').style.display = 'block';
        document.getElementById('word-cloud').style.display = 'none';
    } else if (visType === 'wordcloud') {
        document.getElementById('wordcloud-btn').classList.add('active');
        document.getElementById('visualization').style.display = 'none';
        document.getElementById('word-cloud').style.display = 'block';
        
        // Update word cloud with current filtered data
        const filters = getFilters();
        const filteredData = dataProcessor.getFilteredData(filters);
        enhancedWordCloud.update(filteredData);
    }
}

function getFilters() {
    return {
        riskFactor: document.getElementById('risk-factor')?.value || 'age',
        outcome: document.getElementById('outcome')?.value || 'duration',
        emergency: document.getElementById('emergency')?.value || '',
        department: document.getElementById('department')?.value || ''
    };
}

function updateVisualization() {
    const filters = {
      riskFactor: document.getElementById('risk-factor')?.value || 'age',
      outcome: document.getElementById('outcome')?.value || 'duration',
      emergency: document.getElementById('emergency')?.value || '',
      department: document.getElementById('department')?.value || ''
    };
  
    console.log('Filters:', filters);
    
    const filteredData = dataProcessor.getFilteredData(filters);
    
    // Update scatter plot
    visualization.updateVisualization(filteredData, filters);
    
    // Update word cloud
    enhancedWordCloud.update(filteredData);

    if (enhancedWordCloud) {
        enhancedWordCloud.update(filteredData);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);

export { updateVisualization };