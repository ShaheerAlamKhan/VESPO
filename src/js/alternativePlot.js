import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Cache variables for the beeswarm simulation results
let cachedBeeData = null;
let cachedBeeFilters = null;

export function updateAlternativePlot(data, filters, metrics, dimensions = { width: 1000, height: 600 }) {
  console.log('Alternative Plot Data:', data.length, 'records');
  console.log('Dimensions:', dimensions);
  
  // Clear any existing alternative plot
  const container = d3.select("#visualization");
  container.select("svg").remove();

  // Show loading spinner
  const loadingSpinner = d3.select("#loading");
  loadingSpinner.style("display", "flex");

  try {
    if (filters.outcome === "duration") {
      updateGroupedBeeswarmPlot(data, filters, metrics, dimensions);
    } else if (filters.outcome === "death_inhosp") {
      updateGroupedBarChart(data, filters, metrics, dimensions);
    }
  } catch (error) {
    console.error('Error in updateAlternativePlot:', error);
    container.html(`
      <div class="text-red-500 p-4 text-center">
        <p>Error displaying visualization. Please try again.</p>
        <p class="text-sm mt-2">${error.message}</p>
      </div>
    `);
  } finally {
    // Hide loading spinner
    loadingSpinner.style("display", "none");
  }
}

function updateGroupedBeeswarmPlot(data, filters, metrics, dimensions) {
  if (!Array.isArray(data) || data.length === 0) {
    console.error('No data available for visualization');
    const visContainer = d3.select("#visualization");
    visContainer.html(`
      <div class="text-red-500 p-4 text-center">
        <p>No data available for the selected filters.</p>
        <p class="text-sm mt-2">Try selecting different filter options.</p>
      </div>
    `);
    return;
  }

  const margin = { top: 40, right: 40, bottom: 60, left: 60 };
  const width = dimensions.width - margin.left - margin.right;
  const height = dimensions.height - margin.top - margin.bottom;
  
  const visContainer = d3.select("#visualization");
  // Create the SVG container and set its background based on dark mode.
  const isDark = document.body.classList.contains("dark-mode");
  const svg = visContainer.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("background-color", isDark ? "var(--bg-dark)" : "var(--bg-light)")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  const xMetric = filters.riskFactor;
  const yMetric = filters.outcome;
  
  let groups, groupKeyAccessor;
  if (xMetric === "department" || xMetric === "optype") {
    groups = xMetric === "department"
      ? [...new Set(data.map(d => d.department))]
      : [...new Set(data.map(d => d.riskFactors.optype))];
    groupKeyAccessor = d => (xMetric === "department" ? d.department : d.riskFactors.optype);
  } else {
    const xExtent = d3.extent(data, d => d.riskFactors[xMetric]);
    if (!xExtent[0] && !xExtent[1]) {
      console.error('No valid data for x-axis');
      visContainer.html(`
        <div class="text-red-500 p-4 text-center">
          <p>No valid data for the selected X-axis metric.</p>
          <p class="text-sm mt-2">Try selecting a different risk factor.</p>
        </div>
      `);
      return;
    }
    
    const binGenerator = d3.bin()
      .domain(xExtent)
      .thresholds(5)
      .value(d => d.riskFactors[xMetric]);
    const bins = binGenerator(data);
    groups = bins.map(bin => {
      const x0 = bin.x0 !== undefined ? bin.x0.toFixed(1) : 'N/A';
      const x1 = bin.x1 !== undefined ? bin.x1.toFixed(1) : 'N/A';
      return `${x0} - ${x1}`;
    });
    groupKeyAccessor = d => {
      const val = d.riskFactors[xMetric];
      if (val === undefined || val === null) return 'N/A';
      for (let i = 0; i < bins.length; i++) {
        if (val >= bins[i].x0 && val < bins[i].x1) {
          return `${bins[i].x0.toFixed(1)} - ${bins[i].x1.toFixed(1)}`;
        }
      }
      return groups[groups.length - 1];
    };
  }
  
  const xScale = d3.scalePoint()
    .domain(groups)
    .range([0, width])
    .padding(0.5);
  
  const yExtent = d3.extent(data, d => d.outcomes[yMetric]);
  if (!yExtent[0] && !yExtent[1]) {
    console.error('No valid data for y-axis');
    visContainer.html(`
      <div class="text-red-500 p-4 text-center">
        <p>No valid data for the selected Y-axis metric.</p>
        <p class="text-sm mt-2">Try selecting a different outcome.</p>
      </div>
    `);
    return;
  }
  
  const yScale = d3.scaleLinear()
    .domain(yExtent)
    .range([height, 0])
    .nice();
  
  data.forEach(d => {
    if (!d.outcomes || d.outcomes[yMetric] === undefined) return;
    d.group = groupKeyAccessor(d);
    d.targetX = xScale(d.group);
    d.targetY = yScale(d.outcomes[yMetric]);
    if (d.x === undefined) {
      d.x = d.targetX;
      d.y = d.targetY;
    }
  });
  
  // Draw axes – no inline fills so our CSS can apply.
  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");
  
  svg.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale));
  
  // Add axis labels; let CSS control the fill via classes.
  svg.append("text")
    .attr("class", "x-label axis-label")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text(metrics[xMetric].label);
  
  svg.append("text")
    .attr("class", "y-label axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text(metrics[yMetric].label);
  
  const validData = data.filter(d => d.x !== undefined && d.y !== undefined && 
                                   d.targetX !== undefined && d.targetY !== undefined);
  
  const simulation = d3.forceSimulation(validData)
    .force("x", d3.forceX(d => d.targetX).strength(1))
    .force("y", d3.forceY(d => d.targetY).strength(0.3))
    .force("collide", d3.forceCollide(4))
    .stop();
  
  for (let i = 0; i < 120; i++) simulation.tick();
  
  validData.forEach(d => {
    d.x = Math.max(0, Math.min(width, d.x));
    d.y = Math.max(0, Math.min(height, d.y));
  });
  
  const circles = svg.selectAll("circle")
    .data(validData, d => d.caseid);
  
  circles.join(
    enter => enter.append("circle")
      .attr("r", 3)
      .attr("fill", d => d.riskFactors.emergency ? "#ef4444" : "var(--primary-color)")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("opacity", 0.6),
    update => update.transition().duration(800)
      .attr("cx", d => d.x)
      .attr("cy", d => d.y),
    exit => exit.remove()
  );
  
  const tooltip = d3.select("body").selectAll(".tooltip").data([null])
    .join("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
  
  svg.selectAll("circle")
    .on("mouseover", function(event, d) {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(
        `${metrics[xMetric].label}: ${d.group}<br/>
         ${metrics[yMetric].label}: ${metrics[yMetric].format(d.outcomes[yMetric])}`
      )
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseout", function() {
      tooltip.transition().duration(500).style("opacity", 0);
    });
  
  cachedBeeData = data;
  cachedBeeFilters = { riskFactor: filters.riskFactor, outcome: filters.outcome };
}

function updateGroupedBarChart(data, filters, metrics, dimensions) {
  if (!Array.isArray(data) || data.length === 0) {
    console.error('No data available for visualization');
    const visContainer = d3.select("#visualization");
    visContainer.html(`
      <div class="text-red-500 p-4 text-center">
        <p>No data available for the selected filters.</p>
        <p class="text-sm mt-2">Try selecting different filter options.</p>
      </div>
    `);
    return;
  }
  
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };
  const width = dimensions.width - margin.left - margin.right;
  const height = dimensions.height - margin.top - margin.bottom;
  
  const visContainer = d3.select("#visualization");
  const isDark = document.body.classList.contains("dark-mode");
  const svg = visContainer.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("background-color", isDark ? "var(--bg-dark)" : "var(--bg-light)")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  const xMetric = filters.riskFactor;
  const yMetric = filters.outcome;
  
  let groupedData;
  if (xMetric === "department" || xMetric === "optype") {
    groupedData = d3.rollups(
      data,
      group => ({
        total: group.length,
        deaths: d3.sum(group, d => d.outcomes.death_inhosp),
        rate: (d3.sum(group, d => d.outcomes.death_inhosp) / group.length) * 100
      }),
      d => xMetric === "department" ? d.department : d.riskFactors[xMetric]
    ).map(([group, stats]) => ({ group, ...stats }));
  } else {
    const values = data.map(d => d.riskFactors[xMetric]).filter(v => v != null);
    const xExtent = d3.extent(values);
    if (!xExtent[0] && !xExtent[1]) {
      console.error('No valid data for x-axis');
      visContainer.html(`
        <div class="text-red-500 p-4 text-center">
          <p>No valid data for the selected X-axis metric.</p>
          <p class="text-sm mt-2">Try selecting a different risk factor.</p>
        </div>
      `);
      return;
    }
  
    const bins = d3.bin()
      .domain(xExtent)
      .thresholds(5)(values);
    
    groupedData = bins.map(bin => {
      const binData = data.filter(d => {
        const val = d.riskFactors[xMetric];
        return val >= bin.x0 && val < bin.x1;
      });
      
      return {
        group: `${bin.x0.toFixed(1)} - ${bin.x1.toFixed(1)}`,
        total: binData.length,
        deaths: d3.sum(binData, d => d.outcomes.death_inhosp),
        rate: (d3.sum(binData, d => d.outcomes.death_inhosp) / binData.length) * 100 || 0
      };
    }).filter(d => d.total > 0);
  }
  
  if (groupedData.length === 0) {
    console.error('No valid grouped data');
    visContainer.html(`
      <div class="text-red-500 p-4 text-center">
        <p>No valid data for grouping.</p>
        <p class="text-sm mt-2">Try selecting different metrics.</p>
      </div>
    `);
    return;
  }
  
  const xScale = d3.scaleBand()
    .domain(groupedData.map(d => d.group))
    .range([0, width])
    .padding(0.1);
  
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(groupedData, d => d.rate) * 1.1])
    .range([height, 0])
    .nice();
  
  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");
  
  svg.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => `${d.toFixed(1)}%`));
  
  svg.append("text")
    .attr("class", "x-label axis-label")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text(metrics[xMetric].label);
  
  svg.append("text")
    .attr("class", "y-label axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("Death Rate (%)");
  
  const gradient = svg.append("defs")
    .append("linearGradient")
    .attr("id", "bar-gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%");
  
  gradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#ef4444")
    .attr("stop-opacity", 0.8);
  
  gradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#ef4444")
    .attr("stop-opacity", 0.5);
  
  const bars = svg.selectAll(".bar")
    .data(groupedData)
    .join("rect")
    .attr("class", "bar")
    .attr("x", d => xScale(d.group))
    .attr("y", d => yScale(d.rate))
    .attr("width", xScale.bandwidth())
    .attr("height", d => height - yScale(d.rate))
    .attr("fill", "url(#bar-gradient)")
    .attr("rx", 4)
    .on("mouseover", function() {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("fill", "#dc2626");
    })
    .on("mouseout", function() {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("fill", "url(#bar-gradient)");
    });
  
  const tooltip = d3.select("body").selectAll(".tooltip").data([null])
    .join("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
  
  bars.on("mouseover", function(event, d) {
    d3.select(this).transition().duration(200).attr("fill", "#dc2626");
    tooltip.transition().duration(200).style("opacity", 1);
    tooltip.html(`
      ${metrics[xMetric].label}: ${d.group}<br/>
      Deaths: ${d.deaths}<br/>
      Total Cases: ${d.total}<br/>
      Death Rate: ${d.rate.toFixed(1)}%
    `)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 10) + "px");
  })
  .on("mouseout", function() {
    d3.select(this).transition().duration(200).attr("fill", "url(#bar-gradient)");
    tooltip.transition().duration(500).style("opacity", 0);
  });
  
  svg.selectAll(".bar-label")
    .data(groupedData)
    .join("text")
    .attr("class", "bar-label")
    .attr("x", d => xScale(d.group) + xScale.bandwidth() / 2)
    .attr("y", d => yScale(d.rate) - 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text(d => `${d.rate.toFixed(1)}%`);
}

export { updateGroupedBeeswarmPlot, updateGroupedBarChart };
