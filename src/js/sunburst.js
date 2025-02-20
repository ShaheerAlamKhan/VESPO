import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function updateSunburst(data, filters, metrics) {
  // Remove any existing SVG
  d3.select("#visualization").select("svg").remove();
  
  const width = 928;
  const height = width;
  const radius = width / 6;
  
  function binAge(age) {
    if (age < 20) return "<20";
    else if (age < 40) return "20-39";
    else if (age < 60) return "40-59";
    else if (age < 80) return "60-79";
    else return "80+";
  }
  function binBMI(bmi) {
    if (bmi < 18.5) return "Underweight";
    else if (bmi < 25) return "Normal";
    else if (bmi < 30) return "Overweight";
    else return "Obese";
  }
  
  const metric = filters.outcome;
  
  function prepareSunburstData(data, metric) {
    const levels = [
      d => (d.riskFactors.emergency === 1 ? "Emergency" : "Non-Emergency"),
      d => d.riskFactors.optype || "Unknown Surgery Type",
      d => d.riskFactors.approach || "Unknown Approach",
      d => binAge(d.riskFactors.age),
      d => binBMI(d.riskFactors.bmi),
      d => d.riskFactors.asa != null ? `ASA ${d.riskFactors.asa}` : "ASA Missing",
    ];
    if (metric === "death_inhosp") {
      const root = { name: "All", totalDeaths: 0, children: {} };
      data.forEach(d => {
        let death = d.outcomes.death_inhosp;
        let node = root;
        node.totalDeaths += death;
        levels.forEach(levelFn => {
          const key = levelFn(d);
          if (!node.children[key]) {
            node.children[key] = { name: key, totalDeaths: 0, children: {} };
          }
          node = node.children[key];
          node.totalDeaths += death;
        });
      });
      function convert(node) {
        if (node.children) {
          node.children = Object.values(node.children).map(convert);
        }
        node.value = node.totalDeaths;
        return node;
      }
      return convert(root);
    } else {
      const root = { name: "All", total: 0, children: {} };
      data.forEach(d => {
        let value = d.outcomes.duration;
        let node = root;
        node.total += value;
        levels.forEach(levelFn => {
          const key = levelFn(d);
          if (!node.children[key]) {
            node.children[key] = { name: key, total: 0, children: {} };
          }
          node = node.children[key];
          node.total += value;
        });
      });
      function convert(node) {
        if (node.children) {
          node.children = Object.values(node.children).map(convert);
        }
        node.value = node.total;
        return node;
      }
      return convert(root);
    }
  }
  
  const hierarchicalData = prepareSunburstData(data, metric);
  
  const visContainer = d3.select("#visualization");
  // Determine dark mode and set background accordingly.
  const isDark = document.body.classList.contains("dark-mode");
  const svg = visContainer.append("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, width])
    .style("font", "10px sans-serif")
    .style("background-color", isDark ? "var(--bg-dark)" : "var(--bg-light)");
  
  const centralLabelColor = isDark ? "var(--text-dark)" : "var(--text-light)";
  const centralLabel = svg.append("text")
    .attr("class", "central-label")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .style("font-size", "2em")
    .style("fill", centralLabelColor)
    .style("pointer-events", "none")
    .style("visibility", "hidden");
  
  let color;
  if (metric === "death_inhosp") {
    color = d => {
      const emergencyNode = d.ancestors().find(n => n.depth === 1);
      return emergencyNode && emergencyNode.data.name === "Emergency" ? "#ff4444" : "var(--primary-color)";
    };
  } else {
    color = d3.scaleOrdinal(
      d3.quantize(d3.interpolateRainbow, Object.keys(hierarchicalData.children).length + 1)
    );
  }
  
  const rootNode = d3.hierarchy(hierarchicalData)
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);
  const partitionLayout = d3.partition().size([2 * Math.PI, rootNode.height + 1]);
  partitionLayout(rootNode);
  rootNode.each(d => (d.current = d));
  
  const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius(d => d.y0 * radius)
    .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));
  
  const path = svg.append("g")
    .selectAll("path")
    .data(rootNode.descendants().slice(1))
    .join("path")
    .attr("class", "arc")
    .attr("fill", d => {
      if (metric === "death_inhosp") {
        return color(d);
      } else {
        let current = d;
        while (current.depth > 1) current = current.parent;
        return color(current.data.name);
      }
    })
    .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
    .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
    .attr("d", d => arc(d.current))
    .on("click", clicked)
    .on("mouseover", (event, d) => {
      let valueText = metric === "death_inhosp"
        ? d.data.value.toFixed(0) + " deaths"
        : d.data.value.toFixed(0) + " hrs";
      centralLabel.text(valueText).style("visibility", "visible");
    })
    .on("mouseout", () => {
      centralLabel.style("visibility", "hidden");
    });
  
  function labelVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  }
  function labelTransform(d) {
    const x = ((d.x0 + d.x1) / 2) * (180 / Math.PI);
    const y = ((d.y0 + d.y1) / 2) * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }
  
  const label = svg.append("g")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .style("user-select", "none")
    .selectAll("text")
    .data(rootNode.descendants().slice(1))
    .join("text")
    .attr("class", "sunburst-label")
    .attr("dy", "0.35em")
    .attr("fill-opacity", d => +labelVisible(d.current))
    .attr("transform", d => labelTransform(d.current))
    .text(d => d.data.name);
  
  const parent = svg.append("circle")
    .datum(rootNode)
    .attr("r", radius)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .on("click", (event, d) => { clicked(event, rootNode); });
  
  function clicked(event, p) {
    rootNode.each(d => {
      d.target = {
        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - p.depth),
        y1: Math.max(0, d.y1 - p.depth)
      };
    });
  
    const t = svg.transition().duration(event.altKey ? 7500 : 750);
  
    path.transition(t)
      .tween("data", d => {
        const i = d3.interpolate(d.current, d.target);
        return t => d.current = i(t);
      })
      .attrTween("d", d => () => arc(d.current));
  
    label.transition(t)
      .attr("fill-opacity", d => +labelVisible(d.current))
      .attrTween("transform", d => {
        const i = d3.interpolate(d.current, d.target);
        return t => labelTransform(i(t));
      });
  }
  
  function arcVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
  }
}
