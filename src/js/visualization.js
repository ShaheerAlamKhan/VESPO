import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export class Visualization {
    constructor() {
        // Define dimensions
        this.width = 900;
        this.height = 500;
        this.margin = { top: 40, right: 100, bottom: 60, left: 60 };
        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;

        this.metrics = {
            // Risk Factors
            age: {
                label: "Patient Age (years)",
                format: d => d ? `${d} years` : 'N/A'
            },
            bmi: {
                label: "BMI",
                format: d => d ? d.toFixed(1) : 'N/A'
            },
            asa: {
                label: "ASA Score",
                format: d => d ? `${d} ASA` : 'N/A'
            },
            // Outcomes
            duration: {
                label: "Surgery Duration (hours)",
                format: d => d ? `${(d).toFixed(2)} hours` : 'N/A'
            },
            approach: {
                label: "Surgery Approach",
                format: d => d ? `${d}` : 'N/A', // display categorical label as is
            },
            optype: {
                label: "Surgery Type",
                format: d => d ? `${d}` : 'N/A', // display categorical label as is
            }
        };

        this.setupVisualization();
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

        // Initialize scales
        this.xScale = d3.scaleLinear()
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

        // Create tooltip
        this.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        // Add legend
        this.setupLegend();
    }

    setupLegend() {
        const legend = this.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${this.width - 120},20)`);

        // Emergency status legend
        legend.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 5)
            .attr("fill", "#2196F3");

        legend.append("text")
            .attr("x", 10)
            .attr("y", 5)
            .text("Non-Emergency");

        legend.append("circle")
            .attr("cx", 0)
            .attr("cy", 20)
            .attr("r", 5)
            .attr("fill", "#ff4444");

        legend.append("text")
            .attr("x", 10)
            .attr("y", 25)
            .text("Emergency");
    }

    updateVisualization(data, filters) {
        console.log('Updating visualization with:', { data, filters });
    
        if (!data || !filters) {
            console.warn('Missing data or filters');
            return;
        }
    
        const xMetric = filters.riskFactor;
        const yMetric = filters.outcome;
    
        console.log('Metrics:', { xMetric, yMetric });
        console.log('Sample data point:', data[0]);
    
        // Get valid data points only
        const validData = data.filter(d => 
            d.riskFactors && 
            d.outcomes && 
            !isNaN(d.riskFactors[xMetric]) && 
            !isNaN(d.outcomes[yMetric])
        );
    
        console.log('Valid data points:', validData.length);
    
        if (validData.length === 0) {
            console.warn('No valid data points to display');
            return;
        }
    
        if (xMetric === 'approach' || xMetric === 'optype' || xMetric === 'asa') {
            // Calculate the average duration for each category using d3.group()
            const groupedData = d3.group(validData, d => d.riskFactors[xMetric]);
            const categoryAverages = Array.from(groupedData, ([key, values]) => {
                return {
                    key: key,
                    value: d3.mean(values, d => d.riskFactors.duration)
                };
            });
    
            console.log('Category averages:', categoryAverages);
    
            // Categorical x-axis
            const uniqueCategories = categoryAverages.map(d => d.key);  // Get unique categories
            this.xScale = d3.scaleBand()  // Use scaleBand for categorical axis
                .range([0, this.innerWidth])
                .domain(uniqueCategories)
                .padding(0.1);  // Optional: Adjust padding
    
            this.yScale.domain([
                0,
                d3.max(categoryAverages, d => d.value) * 1.1
            ]);
    
            // Update axes
            this.xAxis.transition().duration(750)
                .call(d3.axisBottom(this.xScale));
    
            this.yAxis.transition().duration(750)
                .call(d3.axisLeft(this.yScale));
    
            // Update axis labels
            this.xLabel.text(this.metrics[xMetric].label);
            this.yLabel.text('Average Duration');
    
            // Update bars for bar chart
            const bars = this.plotArea.selectAll(".bar")
                .data(categoryAverages, d => d.key);  // Use category key as key
    
            // Enter new bars
            const barsEnter = bars.enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", d => this.xScale(d.key))
                .attr("y", d => this.yScale(d.value))
                .attr("width", this.xScale.bandwidth())
                .attr("height", d => this.innerHeight - this.yScale(d.value))
                .attr("fill", "#2196F3")
                .attr("opacity", 0.6);
    
            // Update + Enter
            bars.merge(barsEnter)
                .transition()
                .duration(750)
                .attr("x", d => this.xScale(d.key))
                .attr("y", d => this.yScale(d.value))
                .attr("width", this.xScale.bandwidth())
                .attr("height", d => this.innerHeight - this.yScale(d.value));
    
            // Remove old bars
            bars.exit()
                .transition()
                .duration(750)
                .attr("height", 0)
                .remove();
        } else {
            // Numerical x-axis (scatter plot)
            this.xScale = d3.scaleLinear()
                .range([0, this.innerWidth])
                .domain([d3.min(validData, d => d.riskFactors[xMetric]) * 0.95, 
                d3.max(validData, d => d.riskFactors[xMetric]) * 1.05]);
    
            this.yScale.domain([
                0,
                d3.max(validData, d => d.outcomes[yMetric]) * 1.1
            ]);
    
            // Update axes
            this.xAxis.transition().duration(750)
                .call(d3.axisBottom(this.xScale));
    
            this.yAxis.transition().duration(750)
                .call(d3.axisLeft(this.yScale));
    
            // Update axis labels
            this.xLabel.text(this.metrics[xMetric].label);
            this.yLabel.text(this.metrics[yMetric].label);
    
            // Update scatter plot points
            const points = this.plotArea.selectAll(".point")
                .data(validData, d => d.caseid); // Use caseid as key
    
            // Enter new points
            const pointsEnter = points.enter()
                .append("circle")
                .attr("class", "point")
                .attr("r", 5)
                .attr("opacity", 0.6);
    
            // Update + Enter
            points.merge(pointsEnter)
                .transition()
                .duration(750)
                .attr("cx", d => this.xScale(d.riskFactors[xMetric]))
                .attr("cy", d => this.yScale(d.outcomes[yMetric]))
                .attr("fill", d => d.riskFactors.emergency ? "#ff4444" : "#2196F3");
    
            // Remove old points
            points.exit()
                .transition()
                .duration(750)
                .attr("r", 0)
                .remove();
        }
        
        // Update tooltips
        this.updateTooltips(xMetric, yMetric);
    }

    updateTooltips(xMetric, yMetric) {
        this.plotArea.selectAll(".point")
            .on("mouseover", (event, d) => {
                this.tooltip
                    .style("opacity", 1)
                    .html(`
                        Department: ${d.department}<br/>
                        ${this.metrics[xMetric].label}: ${this.metrics[xMetric].format(d.riskFactors[xMetric])}<br/>
                        ${this.metrics[yMetric].label}: ${this.metrics[yMetric].format(d.outcomes[yMetric])}<br/>
                        Emergency: ${d.riskFactors.emergency ? "Yes" : "No"}
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", () => {
                this.tooltip.style("opacity", 0);
            });
    }
}

export const visualization = new Visualization();