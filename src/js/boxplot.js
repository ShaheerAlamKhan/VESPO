import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function updateBoxPlot(data, filters, metrics, dimensions = { width: 1000, height: 500 }) {
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };
  const width = dimensions.width - margin.left - margin.right;
  const height = dimensions.height - margin.top - margin.bottom;
  
  // Show loading state
  d3.select("#loading").style("display", "flex");
  
  const container = d3.select("#visualization");
  container.select("svg").remove();
  
  const isDark = document.body.classList.contains("dark-mode");
  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("background-color", isDark ? "var(--bg-dark)" : "var(--bg-light)")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  const xMetric = filters.riskFactor;
  const yMetric = filters.outcome;
  
  let boxData = [];
  let groupingKeys = [];
  
  if (xMetric === "department" || xMetric === "optype") {
    boxData = d3.rollups(
      data,
      group => {
        const values = group
          .map(d => d.outcomes[yMetric])
          .filter(v => v != null)
          .sort(d3.ascending);
        
        if (values.length > 0) {
          return {
            min: d3.min(values),
            q1: d3.quantile(values, 0.25),
            median: d3.quantile(values, 0.5),
            q3: d3.quantile(values, 0.75),
            max: d3.max(values),
            count: values.length
          };
        }
        return null;
      },
      d => (xMetric === "department" ? d.department : d.riskFactors[xMetric])
    )
      .filter(d => d[1] !== null)
      .map(([key, stats]) => ({ key, ...stats }));
    
    groupingKeys = boxData.map(d => d.key);
  } else {
    const valuesX = data
      .map(d => d.riskFactors[xMetric])
      .filter(v => v != null);
    
    if (valuesX.length === 0) return;
    
    const xExtent = d3.extent(valuesX);
    const binGenerator = d3.bin()
      .domain(xExtent)
      .thresholds(5)
      .value(d => d.riskFactors[xMetric]);
    
    const bins = binGenerator(data);
    
    boxData = bins
      .map(bin => {
        const valuesY = bin
          .map(d => d.outcomes[yMetric])
          .filter(v => v != null)
          .sort(d3.ascending);
        
        if (valuesY.length > 0) {
          return {
            key: `${bin.x0.toFixed(1)} - ${bin.x1.toFixed(1)}`,
            min: d3.min(valuesY),
            q1: d3.quantile(valuesY, 0.25),
            median: d3.quantile(valuesY, 0.5),
            q3: d3.quantile(valuesY, 0.75),
            max: d3.max(valuesY),
            count: valuesY.length
          };
        }
        return null;
      })
      .filter(d => d !== null);
    
    groupingKeys = boxData.map(d => d.key);
  }
  
  if (boxData.length === 0) {
    d3.select("#loading").style("display", "none");
    return;
  }
  
  const xScale = d3.scaleBand()
    .domain(groupingKeys)
    .range([0, width])
    .paddingInner(0.1)
    .paddingOuter(0.1);
  
  const yScale = d3.scaleLinear()
    .domain([
      d3.min(boxData, d => d.min),
      d3.max(boxData, d => d.max)
    ])
    .nice()
    .range([height, 0]);
  
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale);
  
  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");
  
  svg.append("g")
    .attr("class", "y-axis")
    .call(yAxis);
  
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

  const boxes = svg.selectAll(".box")
    .data(boxData)
    .join("rect")
    .attr("class", "box")
    .attr("x", d => xScale(d.key))
    .attr("width", xScale.bandwidth())
    .attr("y", d => yScale(d.q3))
    .attr("height", d => yScale(d.q1) - yScale(d.q3))
    .attr("fill", "var(--primary-color)")
    .attr("opacity", 0.7)
    .attr("stroke", "var(--primary-hover)");

  const medianLines = svg.selectAll(".median")
    .data(boxData)
    .join("line")
    .attr("class", "median")
    .attr("x1", d => xScale(d.key))
    .attr("x2", d => xScale(d.key) + xScale.bandwidth())
    .attr("y1", d => yScale(d.median))
    .attr("y2", d => yScale(d.median))
    .attr("stroke", "white")
    .attr("stroke-width", 2);

  const whiskers = svg.selectAll(".whisker")
    .data(boxData)
    .join(enter => {
      const group = enter.append("g")
        .attr("class", "whisker");

      group.append("line")
        .attr("class", "whisker")
        .attr("x1", d => xScale(d.key) + xScale.bandwidth() / 2)
        .attr("x2", d => xScale(d.key) + xScale.bandwidth() / 2)
        .attr("y1", d => yScale(d.q3))
        .attr("y2", d => yScale(d.max))
        .attr("stroke", "var(--primary-hover)");

      group.append("line")
        .attr("class", "whisker")
        .attr("x1", d => xScale(d.key) + xScale.bandwidth() / 2)
        .attr("x2", d => xScale(d.key) + xScale.bandwidth() / 2)
        .attr("y1", d => yScale(d.q1))
        .attr("y2", d => yScale(d.min))
        .attr("stroke", "var(--primary-hover)");

      group.append("line")
        .attr("class", "whisker-cap")
        .attr("x1", d => xScale(d.key) + xScale.bandwidth() * 0.25)
        .attr("x2", d => xScale(d.key) + xScale.bandwidth() * 0.75)
        .attr("y1", d => yScale(d.max))
        .attr("y2", d => yScale(d.max))
        .attr("stroke", "var(--primary-hover)");

      group.append("line")
        .attr("class", "whisker-cap")
        .attr("x1", d => xScale(d.key) + xScale.bandwidth() * 0.25)
        .attr("x2", d => xScale(d.key) + xScale.bandwidth() * 0.75)
        .attr("y1", d => yScale(d.min))
        .attr("y2", d => yScale(d.min))
        .attr("stroke", "var(--primary-hover)");

      return group;
    });

  const tooltip = d3.select("body").selectAll(".tooltip").data([null])
    .join("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  boxes.on("mouseover", function(event, d) {
    tooltip.transition().duration(200).style("opacity", 1);
    tooltip.html(
      `${metrics[xMetric].label}: ${d.key}<br/>
       Maximum: ${metrics[yMetric].format(d.max)}<br/>
       Q3: ${metrics[yMetric].format(d.q3)}<br/>
       Median: ${metrics[yMetric].format(d.median)}<br/>
       Q1: ${metrics[yMetric].format(d.q1)}<br/>
       Minimum: ${metrics[yMetric].format(d.min)}<br/>
       Count: ${d.count} cases`
    )
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 10) + "px");

    d3.select(this).transition().duration(200).attr("opacity", 0.9);
  })
  .on("mouseout", function() {
    tooltip.transition().duration(500).style("opacity", 0);
    d3.select(this).transition().duration(200).attr("opacity", 0.7);
  });

  d3.select("#loading").style("display", "none");
}
