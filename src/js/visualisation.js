// visualization.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

class Visualization {
    constructor() {
        this.svg = null;
        this.scales = {};
        this.axes = {};
        this.currentData = [];
        this.setupVisualization();
    }

    setupVisualization() {
        // Create SVG container
        this.svg = d3.select("#visualization")
            .append("svg")
            .attr("width", CONFIG.VISUALIZATION.width)
            .attr("height", CONFIG.VISUALIZATION.height)
            .append("g")
            .attr("transform", `translate(${CONFIG.VISUALIZATION.margin.left},${CONFIG.VISUALIZATION.margin.top})`);

        // Initialize scales
        this.initializeScales();
        
        // Add axes
        this.createAxes();
        
        // Add tooltips
        this.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
    }

    updateVisualization(data, xField = 'patient.age', yField = 'timing.duration') {
        this.currentData = data;

        // Update scales
        this.updateScales(data, xField, yField);

        // Update axes
        this.updateAxes();

        // Update data points
        const points = this.svg.selectAll(".data-point")
            .data(data, d => d.id);

        // Enter new points
        points.enter()
            .append("circle")
            .attr("class", "data-point")
            .attr("r", 5)
            .attr("fill", CONFIG.COLORS.primary)
            .merge(points)
            .transition()
            .duration(500)
            .attr("cx", d => this.scales.x(this.getNestedValue(d, xField)))
            .attr("cy", d => this.scales.y(this.getNestedValue(d, yField)));

        // Remove old points
        points.exit()
            .transition()
            .duration(500)
            .attr("r", 0)
            .remove();

        // Add hover effects
        this.addHoverEffects();
    }

    // Helper function to get nested object values
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current[key], obj);
    }

    // Add hover effects to data points
    addHoverEffects() {
        this.svg.selectAll(".data-point")
            .on("mouseover", (event, d) => {
                this.tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                this.tooltip.html(this.formatTooltip(d))
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                this.tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    }

    formatTooltip(d) {
        return `
            <strong>${d.surgery.name}</strong><br/>
            Patient: ${d.patient.age}y, ${d.patient.sex}<br/>
            Duration: ${d.timing.duration}min<br/>
            Department: ${d.surgery.department}
        `;
    }
}

// Export a single instance
export const visualization = new Visualization();