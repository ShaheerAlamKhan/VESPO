// visualization.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export class Visualization {
    constructor() {
        this.width = 900;
        this.height = 500;
        this.margin = { top: 40, right: 100, bottom: 60, left: 60 };
        
        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;
        
        this.metrics = {
            duration: {
                label: "Surgery Duration (minutes)",
                accessor: d => (d.opend - d.opstart) / 60,
                format: d => `${d.toFixed(0)} min`
            },
            icu_days: {
                label: "ICU Days",
                accessor: d => d.icu_days,
                format: d => `${d} days`
            },
            death_inhosp: {
                label: "In-hospital Mortality Rate",
                accessor: d => d.death_inhosp,
                format: d => `${(d * 100).toFixed(1)}%`
            },
            bmi: {
                label: "BMI",
                accessor: d => d.bmi,
                format: d => d.toFixed(1)
            },
            age: {
                label: "Age",
                accessor: d => d.age,
                format: d => `${d} years`
            }
        };

        this.setupVisualization();
        this.setupControls();
    }

    setupVisualization() {
        // Create SVG container
        this.svg = d3.select("#visualization")
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height);

        // Create group for the plot area
        this.plotArea = this.svg.append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // Add clip path for the plot area
        this.plotArea.append("defs")
            .append("clipPath")
            .attr("id", "plot-area-clip")
            .append("rect")
            .attr("width", this.innerWidth)
            .attr("height", this.innerHeight);

        // Initialize scales
        this.xScale = d3.scalePoint()
            .range([0, this.innerWidth]);

        this.yScale = d3.scaleLinear()
            .range([this.innerHeight, 0]);

        // Create axes
        this.xAxis = this.plotArea.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${this.innerHeight})`);

        this.yAxis = this.plotArea.append("g")
            .attr("class", "y-axis");

        // Add axis labels
        this.xLabel = this.plotArea.append("text")
            .attr("class", "x-label")
            .attr("text-anchor", "middle")
            .attr("x", this.innerWidth / 2)
            .attr("y", this.innerHeight + 40);

        this.yLabel = this.plotArea.append("text")
            .attr("class", "y-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -this.innerHeight / 2)
            .attr("y", -40);

        // Create legend
        this.legend = this.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${this.width - this.margin.right + 20},${this.margin.top})`);

        // Create tooltip
        this.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
    }

    setupControls() {
        this.primaryMetric = "duration";
        this.overlayActive = false;

        d3.select("#primary-metric").on("change", (event) => {
            this.primaryMetric = event.target.value;
            this.updateVisualization(this.currentData);
        });

        d3.select("#toggle-overlay").on("click", () => {
            this.overlayActive = !this.overlayActive;
            this.updateVisualization(this.currentData);
        });
    }

    processData(data) {
        // Group data by department and calculate averages
        const groupedData = d3.group(data, d => d.department);
        
        return Array.from(groupedData, ([department, values]) => {
            const metrics = {};
            Object.keys(this.metrics).forEach(metric => {
                const accessor = this.metrics[metric].accessor;
                metrics[metric] = d3.mean(values, accessor);
            });
            return {
                department,
                values: metrics
            };
        });
    }

    updateVisualization(rawData) {
        this.currentData = rawData;
        const data = this.processData(rawData);

        // Update scales
        this.xScale.domain(data.map(d => d.department));
        
        const primaryAccessor = d => d.values[this.primaryMetric];
        const primaryExtent = d3.extent(data, primaryAccessor);
        this.yScale.domain([0, primaryExtent[1] * 1.1]);

        // Update axes
        this.xAxis.call(d3.axisBottom(this.xScale))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        this.yAxis.call(d3.axisLeft(this.yScale));

        // Update labels
        this.xLabel.text("Department");
        this.yLabel.text(this.metrics[this.primaryMetric].label);

        // Create line generator
        const line = d3.line()
            .x(d => this.xScale(d.department))
            .y(d => this.yScale(d.values[this.primaryMetric]));

        // Update or create lines
        const lines = this.plotArea.selectAll(".metric-line")
            .data([data]);

        lines.enter()
            .append("path")
            .attr("class", "metric-line")
            .merge(lines)
            .transition()
            .duration(750)
            .attr("d", line)
            .attr("fill", "none")
            .attr("stroke", "#3498db")
            .attr("stroke-width", 2);

        // Update or create points
        const points = this.plotArea.selectAll(".point")
            .data(data);

        const pointsEnter = points.enter()
            .append("circle")
            .attr("class", "point");

        points.merge(pointsEnter)
            .transition()
            .duration(750)
            .attr("cx", d => this.xScale(d.department))
            .attr("cy", d => this.yScale(d.values[this.primaryMetric]))
            .attr("r", 6)
            .attr("fill", "#3498db");

        // Add hover effects
        this.addHoverEffects(points.merge(pointsEnter));

        // Remove old elements
        points.exit().remove();
        lines.exit().remove();
    }

    addHoverEffects(points) {
        points
            .on("mouseover", (event, d) => {
                this.tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                
                const primaryValue = this.metrics[this.primaryMetric]
                    .format(d.values[this.primaryMetric]);
                
                this.tooltip.html(
                    `Department: ${d.department}<br/>
                     ${this.metrics[this.primaryMetric].label}: ${primaryValue}`
                )
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                this.tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    }
}

export const visualization = new Visualization();