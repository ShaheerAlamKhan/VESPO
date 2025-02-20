/*
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function updateScatterPlot(data, filters, metrics) {
  // Remove previous visualization
  d3.select("#visualization").select("svg").remove();
  
  const width = 1000, height = 500;
  const margin = { top: 40, right: 100, bottom: 60, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  // Create SVG container
  const svg = d3.select("#visualization")
    .append("svg")
    .attr("width", width)
    .attr("height", height);
  
  const plotArea = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  // Initialize scales
  const xScaleLinear = d3.scaleLinear().range([0, innerWidth]);
  const xScaleOrdinal = d3.scalePoint().range([0, innerWidth]);
  const yScale = d3.scaleLinear().range([innerHeight, 0]);
  
  const xMetric = filters.riskFactor;
  const yMetric = filters.outcome;
  
  // Filter valid data
  const validData = data.filter(d =>
    d.riskFactors &&
    d.outcomes &&
    !isNaN(d.outcomes[yMetric]) &&
    ((xMetric === "department" && d.department) ||
     (xMetric === "optype" && d.riskFactors.optype) ||
     (d.riskFactors[xMetric] !== undefined && !isNaN(d.riskFactors[xMetric])))
  );
  
  if (validData.length === 0) {
    console.warn("No valid data points to display for scatter plot");
    return;
  }
  
  // Set up yScale
  if (yMetric === "death_inhosp") {
    yScale.domain([0, 1]);
  } else {
    yScale.domain([0, d3.max(validData, d => d.outcomes[yMetric]) * 1.1]);
  }
  plotArea.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale));
  
  // Set up xScale based on metric type
  if (xMetric === "department" || xMetric === "optype") {
    const categories = xMetric === "department"
      ? [...new Set(validData.map(d => d.department))]
      : [...new Set(validData.map(d => d.riskFactors.optype))];
    xScaleOrdinal.domain(categories);
    plotArea.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScaleOrdinal));
  } else {
    xScaleLinear.domain([
      d3.min(validData, d => d.riskFactors[xMetric]) * 0.95,
      d3.max(validData, d => d.riskFactors[xMetric]) * 1.05
    ]);
    plotArea.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScaleLinear));
  }
  
  // Add axis labels
  plotArea.append("text")
    .attr("class", "x-label axis-label")
    .attr("text-anchor", "middle")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 40)
    .text(metrics[xMetric].label);
  
  plotArea.append("text")
    .attr("class", "y-label axis-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -40)
    .text(metrics[yMetric].label);
  
  // Create tooltip
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
  
  // Plot points
  plotArea.selectAll(".point")
    .data(validData, d => d.caseid)
    .enter()
    .append("circle")
    .attr("class", "point")
    .attr("r", 5)
    .attr("opacity", 0.6)
    .attr("cx", d => {
      if (xMetric === "department") return xScaleOrdinal(d.department);
      else if (xMetric === "optype") return xScaleOrdinal(d.riskFactors.optype);
      else return xScaleLinear(d.riskFactors[xMetric]);
    })
    .attr("cy", d => yScale(d.outcomes[yMetric]))
    .attr("fill", d => d.riskFactors.emergency ? "#ff4444" : "#2196F3")
    .on("mouseover", function(event, d) {
      tooltip.style("opacity", 1)
        .html(`
          Department: ${d.department}<br/>
          ${metrics[xMetric].label}: ${
            xMetric === "department" ? d.department :
            xMetric === "optype" ? d.riskFactors.optype :
            metrics[xMetric].format(d.riskFactors[xMetric])
          }<br/>
          ${metrics[yMetric].label}: ${metrics[yMetric].format(d.outcomes[yMetric])}<br/>
          Emergency: ${d.riskFactors.emergency ? "Yes" : "No"}
        `)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseout", function() {
      tooltip.style("opacity", 0);
    });
}
*/