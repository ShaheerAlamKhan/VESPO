// alternativePlot.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Cache variables for the beeswarm simulation results.
let cachedBeeData = null;
let cachedBeeFilters = null;

export function updateAlternativePlot(data, filters, metrics) {
  // Clear any existing alternative plot so that only the correct one shows.
  d3.select("#visualization").select("svg").remove();

  if (filters.outcome === "duration") {
    updateGroupedBeeswarmPlot(data, filters, metrics);
  } else if (filters.outcome === "death_inhosp") {
    updateGroupedBarChart(data, filters, metrics);
  }
}

function updateGroupedBeeswarmPlot(data, filters, metrics) {
  if (
    cachedBeeData &&
    cachedBeeFilters &&
    cachedBeeFilters.riskFactor === filters.riskFactor &&
    cachedBeeFilters.outcome === filters.outcome
  ) {
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const width = 1000 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;
    const container = d3.select("#visualization");
    let svg = container.select("svg");
    if (!svg.empty()) {
      svg = svg.select("g");
      svg.selectAll("circle")
        .transition()
        .duration(800)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    }
    d3.select("#loading").style("display", "none");
    return;
  }
  
  // Show loading spinner
  d3.select("#loading").style("display", "block");
  
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };
  const width = 1200 - margin.left - margin.right;
  const height = 600 - margin.top - margin.bottom;
  
  // Cache visualization container
  const container = d3.select("#visualization");
  let svg = container.select("svg");
  if (svg.empty()) {
    svg = container.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
    svg = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  } else {
    svg = svg.select("g");
  }
  
  const xMetric = filters.riskFactor;
  const yMetric = filters.outcome;
  
  // Determine groups and group accessor for beeswarm.
  // (For beeswarm we assume similar logic as before, so using department/optype fallback.)
  let groups, groupKeyAccessor;
  if (xMetric === "department" || xMetric === "optype") {
    groups = xMetric === "department"
      ? [...new Set(data.map(d => d.department))]
      : [...new Set(data.map(d => d.riskFactors.optype))];
    groupKeyAccessor = d => (xMetric === "department" ? d.department : d.riskFactors.optype);
  } else {
    const xExtent = d3.extent(data, d => d.riskFactors[xMetric]);
    const binGenerator = d3.bin()
      .domain(xExtent)
      .thresholds(5)
      .value(d => d.riskFactors[xMetric]);
    const bins = binGenerator(data);
    groups = bins.map(bin => `${bin.x0.toFixed(1)} - ${bin.x1.toFixed(1)}`);
    groupKeyAccessor = d => {
      const val = d.riskFactors[xMetric];
      for (let i = 0; i < bins.length; i++) {
        if (val >= bins[i].x0 && val < bins[i].x1) {
          return `${bins[i].x0.toFixed(1)} - ${bins[i].x1.toFixed(1)}`;
        }
      }
      return groups[groups.length - 1];
    };
  }
  
  // Create an x-scale for group centers.
  const xScale = d3.scalePoint()
    .domain(groups)
    .range([0, width])
    .padding(0.5);
  
  // Temporary y-scale based on outcome (duration)
  const yExtent = d3.extent(data, d => d.outcomes[yMetric]);
  const yScaleTemp = d3.scaleLinear()
    .domain(yExtent)
    .range([height, 0])
    .nice();
  
  // Assign target positions for force simulation.
  data.forEach(d => {
    d.group = groupKeyAccessor(d);
    d.targetX = xScale(d.group);
    d.targetY = yScaleTemp(d.outcomes[yMetric]);
    if (d.x === undefined) {
      d.x = d.targetX;
      d.y = d.targetY;
    }
  });
  
  // Draw x-axis using join pattern.
  let xAxisGroup = svg.selectAll(".x-axis").data([null]);
  xAxisGroup = xAxisGroup.join(
    enter => enter.append("g").attr("class", "x-axis"),
    update => update,
    exit => exit.remove()
  );
  xAxisGroup
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));
  
  svg.selectAll(".x-label").remove();
  svg.append("text")
    .attr("class", "x-label")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text(metrics[xMetric].label);
  
  // Run a force simulation to adjust positions.
  const simulation = d3.forceSimulation(data)
    .force("x", d3.forceX(d => d.targetX).strength(1))
    .force("y", d3.forceY(d => d.targetY).strength(0.3))
    .force("collide", d3.forceCollide(7))
    .stop();
  
  for (let i = 0; i < 100; i++) simulation.tick();
  
  data.forEach(d => {
    d.x = Math.max(0, Math.min(width, d.x));
    d.y = Math.max(0, Math.min(height, d.y));
  });
  
  // Use enter–update–exit for circles.
  const circles = svg.selectAll("circle").data(data, d => d.caseid);
  circles.join(
    enter => enter.append("circle")
      .attr("r", 4)
      .attr("fill", d => d.riskFactors.emergency ? "#ff4444" : "#2196F3")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y),
    update => update.transition().duration(800)
      .attr("cx", d => d.x)
      .attr("cy", d => d.y),
    exit => exit.remove()
  );
  
  const tooltip = d3.select("body").selectAll(".tooltip").data([null]).join("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
  
  svg.selectAll("circle")
    .on("mouseover", function(event, d) {
      tooltip.style("opacity", 1)
        .html(`${metrics[xMetric].label}: ${d.group}<br/>${metrics[yMetric].label}: ${metrics[yMetric].format(d.outcomes[yMetric])}`)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseout", function() {
      tooltip.style("opacity", 0);
    });
  
  // Cache layout for reuse in subsequent updates.
  cachedBeeData = data;
  cachedBeeFilters = { riskFactor: filters.riskFactor, outcome: filters.outcome };
  
  d3.select("#loading").style("display", "none");
}

function updateGroupedBarChart(data, filters, metrics) {
  // Show loading spinner.
  d3.select("#loading").style("display", "block");
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };
  const width = 1200 - margin.left - margin.right;
  const height = 600 - margin.top - margin.bottom;
  
  // Cache visualization container.
  const container = d3.select("#visualization");
  let svg = container.select("svg");
  if (svg.empty()) {
    svg = container.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
    svg = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  } else {
    svg = svg.select("g");
  }
  
  const xMetric = filters.riskFactor;
  const yMetric = filters.outcome; // expecting death_inhosp
  
  // Determine groups and grouping function based on the risk factor.
  let groups, groupKey;
  if (xMetric === "age") {
    groupKey = d => {
      const age = d.riskFactors.age;
      if (age >= 0 && age <= 12) return "Child";
      else if (age >= 13 && age <= 19) return "Teen";
      else if (age >= 20 && age <= 39) return "Adult";
      else if (age >= 40 && age <= 59) return "Middle Age Adult";
      else return "Senior Adult";
    };
    groups = ["Child", "Teen", "Adult", "Middle Age Adult", "Senior Adult"];
  } else if (xMetric === "bmi") {
    groupKey = d => {
      const bmi = d.riskFactors.bmi;
      if (bmi < 18.5) return "Underweight";
      else if (bmi < 25) return "Normal weight";
      else return "Overweight";
    };
    groups = ["Underweight", "Normal weight", "Overweight"];
  } else if (xMetric === "asa") {
    groupKey = d => `ASA ${d.riskFactors.asa}`;
    groups = ["ASA 1", "ASA 2", "ASA 3", "ASA 4", "ASA 5", "ASA 6"];
  } else if (xMetric === "department" || xMetric === "optype") {
    groupKey = xMetric === "department" ? d => d.department : d => d.riskFactors.optype;
    groups = [...new Set(data.map(groupKey))];
  } else {
    groups = ["Group1", "Group2"];
    groupKey = d => "Group1";
  }
  
  // Aggregate data: sum up death_inhosp for each group.
  const groupedData = d3.rollups(
    data, 
    v => d3.sum(v, d => d.outcomes.death_inhosp),
    groupKey
  ).map(([group, sum]) => ({ group, sum }));
  
  const xScale = d3.scaleBand()
    .domain(groups)
    .range([0, width])
    .padding(0.1);
      
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(groupedData, d => d.sum)])
    .nice()
    .range([height, 0]);
  
  // Animate axis updates.
  let xAxisGroup = svg.selectAll(".x-axis").data([null]);
  xAxisGroup = xAxisGroup.join(
    enter => enter.append("g").attr("class", "x-axis"),
    update => update,
    exit => exit.remove()
  );
  xAxisGroup
    .attr("transform", `translate(0,${height})`)
    .transition().duration(800)
    .call(d3.axisBottom(xScale));
      
  let yAxisGroup = svg.selectAll(".y-axis").data([null]);
  yAxisGroup = yAxisGroup.join(
    enter => enter.append("g").attr("class", "y-axis"),
    update => update,
    exit => exit.remove()
  );
  yAxisGroup.transition().duration(800)
    .call(d3.axisLeft(yScale));
  
  // Append axis labels using the metrics parameter.
  svg.selectAll(".x-label").remove();
  svg.append("text")
    .attr("class", "x-label")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text(metrics[xMetric].label);
    
  svg.selectAll(".y-label").remove();
  svg.append("text")
    .attr("class", "y-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 10)
    .attr("text-anchor", "middle")
    .text(metrics[yMetric].label);
  
  // Bind data to bars using enter–update–exit with transitions.
  const bars = svg.selectAll(".bar").data(groupedData, d => d.group);
  bars.join(
    enter => enter.append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.group))
      .attr("width", xScale.bandwidth())
      .attr("y", height)
      .attr("height", 0)
      .attr("fill", "#3498db")
      .call(enter => enter.transition().duration(800)
        .attr("y", d => yScale(d.sum))
        .attr("height", d => height - yScale(d.sum))),
    update => update.transition().duration(800)
      .attr("x", d => xScale(d.group))
      .attr("width", xScale.bandwidth())
      .attr("y", d => yScale(d.sum))
      .attr("height", d => height - yScale(d.sum)),
    exit => exit.transition().duration(800)
      .attr("y", height)
      .attr("height", 0)
      .remove()
  );
  
  d3.select("#loading").style("display", "none");
}
  
export { updateGroupedBeeswarmPlot, updateGroupedBarChart };
