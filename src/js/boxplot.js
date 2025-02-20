// boxplot.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function updateBoxPlot(data, filters, metrics) {
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };
  const width = 1000 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;
  
  // Cache the visualization container selection
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
  
  // Prepare data for the box plot
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
            max: d3.max(values)
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
            max: d3.max(valuesY)
          };
        }
        return null;
      })
      .filter(d => d !== null);
    groupingKeys = boxData.map(d => d.key);
  }
  
  const allOutcomeValues = data
    .map(d => d.outcomes[yMetric])
    .filter(v => v != null);
  const yScale = d3.scaleLinear()
    .domain([d3.min(allOutcomeValues), d3.max(allOutcomeValues)])
    .nice()
    .range([height, 0]);
  
  const xScale = d3.scaleBand()
    .domain(groupingKeys)
    .range([0, width])
    .paddingInner(0.1)
    .paddingOuter(0.1);
  
  // Update axes using join pattern
  let xAxisGroup = svg.selectAll(".x-axis").data([null]);
  xAxisGroup = xAxisGroup.join(
    enter => enter.append("g").attr("class", "x-axis"),
    update => update,
    exit => exit.remove()
  );
  xAxisGroup
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");
  
  let yAxisGroup = svg.selectAll(".y-axis").data([null]);
  yAxisGroup = yAxisGroup.join(
    enter => enter.append("g").attr("class", "y-axis"),
    update => update,
    exit => exit.remove()
  );
  yAxisGroup.call(d3.axisLeft(yScale));
  
  // Update boxes with the enter–update–exit pattern
  const boxes = svg.selectAll(".box").data(boxData, d => d.key);
  boxes.join(
    enter => enter.append("rect")
      .attr("class", "box")
      .attr("x", d => xScale(d.key))
      .attr("y", d => yScale(d.q3))
      .attr("width", xScale.bandwidth())
      .attr("height", d => yScale(d.q1) - yScale(d.q3))
      .attr("fill", "#2196F3")
      .attr("opacity", 0.7),
    update => update.transition().duration(500)
      .attr("x", d => xScale(d.key))
      .attr("y", d => yScale(d.q3))
      .attr("width", xScale.bandwidth())
      .attr("height", d => yScale(d.q1) - yScale(d.q3)),
    exit => exit.remove()
  );
  
  // Update median lines
  const medians = svg.selectAll(".median").data(boxData, d => d.key);
  medians.join(
    enter => enter.append("line")
      .attr("class", "median")
      .attr("x1", d => xScale(d.key))
      .attr("x2", d => xScale(d.key) + xScale.bandwidth())
      .attr("y1", d => yScale(d.median))
      .attr("y2", d => yScale(d.median))
      .attr("stroke", "black")
      .attr("stroke-width", 2),
    update => update.transition().duration(500)
      .attr("x1", d => xScale(d.key))
      .attr("x2", d => xScale(d.key) + xScale.bandwidth())
      .attr("y1", d => yScale(d.median))
      .attr("y2", d => yScale(d.median)),
    exit => exit.remove()
  );
  
  // Update min lines and caps
  const minLines = svg.selectAll(".minLine").data(boxData, d => d.key);
  minLines.join(
    enter => enter.append("line")
      .attr("class", "minLine")
      .attr("x1", d => xScale(d.key) + xScale.bandwidth() / 2)
      .attr("x2", d => xScale(d.key) + xScale.bandwidth() / 2)
      .attr("y1", d => yScale(d.min))
      .attr("y2", d => yScale(d.q1))
      .attr("stroke", "black")
      .attr("stroke-width", 1),
    update => update.transition().duration(500)
      .attr("x1", d => xScale(d.key) + xScale.bandwidth() / 2)
      .attr("x2", d => xScale(d.key) + xScale.bandwidth() / 2)
      .attr("y1", d => yScale(d.min))
      .attr("y2", d => yScale(d.q1)),
    exit => exit.remove()
  );
  
  const maxLines = svg.selectAll(".maxLine").data(boxData, d => d.key);
  maxLines.join(
    enter => enter.append("line")
      .attr("class", "maxLine")
      .attr("x1", d => xScale(d.key) + xScale.bandwidth() / 2)
      .attr("x2", d => xScale(d.key) + xScale.bandwidth() / 2)
      .attr("y1", d => yScale(d.q3))
      .attr("y2", d => yScale(d.max))
      .attr("stroke", "black")
      .attr("stroke-width", 1),
    update => update.transition().duration(500)
      .attr("x1", d => xScale(d.key) + xScale.bandwidth() / 2)
      .attr("x2", d => xScale(d.key) + xScale.bandwidth() / 2)
      .attr("y1", d => yScale(d.q3))
      .attr("y2", d => yScale(d.max)),
    exit => exit.remove()
  );
  
  const minCaps = svg.selectAll(".minCap").data(boxData, d => d.key);
  minCaps.join(
    enter => enter.append("line")
      .attr("class", "minCap")
      .attr("x1", d => xScale(d.key) + xScale.bandwidth() / 4)
      .attr("x2", d => xScale(d.key) + (3 * xScale.bandwidth()) / 4)
      .attr("y1", d => yScale(d.min))
      .attr("y2", d => yScale(d.min))
      .attr("stroke", "black")
      .attr("stroke-width", 1),
    update => update.transition().duration(500)
      .attr("x1", d => xScale(d.key) + xScale.bandwidth() / 4)
      .attr("x2", d => xScale(d.key) + (3 * xScale.bandwidth()) / 4)
      .attr("y1", d => yScale(d.min))
      .attr("y2", d => yScale(d.min)),
    exit => exit.remove()
  );
  
  const maxCaps = svg.selectAll(".maxCap").data(boxData, d => d.key);
  maxCaps.join(
    enter => enter.append("line")
      .attr("class", "maxCap")
      .attr("x1", d => xScale(d.key) + xScale.bandwidth() / 4)
      .attr("x2", d => xScale(d.key) + (3 * xScale.bandwidth()) / 4)
      .attr("y1", d => yScale(d.max))
      .attr("y2", d => yScale(d.max))
      .attr("stroke", "black")
      .attr("stroke-width", 1),
    update => update.transition().duration(500)
      .attr("x1", d => xScale(d.key) + xScale.bandwidth() / 4)
      .attr("x2", d => xScale(d.key) + (3 * xScale.bandwidth()) / 4)
      .attr("y1", d => yScale(d.max))
      .attr("y2", d => yScale(d.max)),
    exit => exit.remove()
  );
}
