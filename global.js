// Global variables and configurations
const CONFIG = {
    VISUALIZATION: {
        width: 800,
        height: 500,
        margin: {
            top: 40,
            right: 40,
            bottom: 60,
            left: 60
        }
    },
    COLORS: {
        primary: '#3498db',
        secondary: '#2ecc71',
        accent: '#e74c3c'
    }
};

// Event handling
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
});

function initializeEventListeners() {
    // Add event listeners to all filter dropdowns
    document.querySelectorAll('select').forEach(select => {
        select.addEventListener('change', handleFilterChange);
    });
}

function handleFilterChange(event) {
    // Get all current filter values
    const filters = {
        surgicalApproach: document.getElementById('surgical-approach').value,
        demographics: document.getElementById('demographics').value,
        anesthesia: document.getElementById('anesthesia').value,
        // Add more filters as needed
    };

    // Trigger visualization update
    updateVisualization(filters);
}