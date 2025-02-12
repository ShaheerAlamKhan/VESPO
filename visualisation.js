// D3.js visualization setup and update functions
class Visualization {
    constructor() {
        this.svg = null;
        this.scales = {};
        this.axes = {};
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
    }

    initializeScales() {
        const width = CONFIG.VISUALIZATION.width - CONFIG.VISUALIZATION.margin.left - CONFIG.VISUALIZATION.margin.right;
        const height = CONFIG.VISUALIZATION.height - CONFIG.VISUALIZATION.margin.top - CONFIG.VISUALIZATION.margin.bottom;

        this.scales.x = d3.scaleLinear()
            .range([0, width]);

        this.scales.y = d3.scaleLinear()
            .range([height, 0]);
    }

    createAxes() {
        // Create and add axes
        this.axes.x = d3.axisBottom(this.scales.x);
        this.axes.y = d3.axisLeft(this.scales.y);

        this.svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${CONFIG.VISUALIZATION.height - CONFIG.VISUALIZATION.margin.top - CONFIG.VISUALIZATION.margin.bottom})`)
            .call(this.axes.x);

        this.svg.append("g")
            .attr("class", "y-axis")
            .call(this.axes.y);
    }

    updateVisualization(data, filters) {
        // Update scales based on new data
        this.updateScales(data);

        // Update axes
        this.updateAxes();

        // Update data points
        this.updateDataPoints(data);
    }

    updateScales(data) {
        // Update scale domains based on data
        this.scales.x.domain([0, d3.max(data, d => d.x)]);
        this.scales.y.domain([0, d3.max(data, d => d.y)]);
    }

    updateAxes() {
        // Update axes with new scales
        this.svg.select(".x-axis")
            .transition()
            .duration(500)
            .call(this.axes.x);

        this.svg.select(".y-axis")
            .transition()
            .duration(500)
            .call(this.axes.y);
    }

    updateDataPoints(data) {
        // Data join
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
            .attr("cx", d => this.scales.x(d.x))
            .attr("cy", d => this.scales.y(d.y));

        // Remove old points
        points.exit()
            .transition()
            .duration(500)
            .attr("r", 0)
            .remove();
    }
}

// Create global instance
const visualization = new Visualization();