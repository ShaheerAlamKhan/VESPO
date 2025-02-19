// simpleWordCloud.js
export class SimpleWordCloud {
    initialize(containerId) {
        this.container = document.querySelector(containerId);
        if (!this.container) {
            console.error(`Container not found: ${containerId}`);
            return;
        }
        this.container.innerHTML = '<div>Loading diagnosis data...</div>';
    }

    update(data) {
        if (!this.container) return;
        
        if (!data || data.length === 0) {
            this.container.innerHTML = '<div>No data available</div>';
            return;
        }
        
        // Count diagnoses
        const counts = {};
        data.forEach(item => {
            if (item && item.dx) {
                counts[item.dx] = (counts[item.dx] || 0) + 1;
            }
        });
        
        // Convert to sorted array
        const sortedDiagnoses = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));
        
        // Create HTML
        let html = '<h3>Diagnoses by Frequency</h3>';
        html += '<div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:15px;">';
        
        sortedDiagnoses.forEach(dx => {
            const fontSize = 12 + Math.min(24, Math.sqrt(dx.count) * 2);
            html += `<div style="padding:8px; font-size:${fontSize}px;">${dx.name}</div>`;
        });
        
        html += '</div>';
        this.container.innerHTML = html;
    }
}

export const simpleWordCloud = new SimpleWordCloud();