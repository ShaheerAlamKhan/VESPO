// visualization.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export class Visualization {
  constructor() {
    // Dimensions for scatter plot (also used by other views)
    this.width = 900;
    this.height = 500;
    this.margin = { top: 40, right: 100, bottom: 60, left: 60 };
    this.innerWidth = this.width - this.margin.left - this.margin.right;
    this.innerHeight = this.height - this.margin.top - this.margin.bottom;

    this.metrics = {
      // Risk Factors
      age: {
        label: "Patient Age (years)",
        format: (d) => (d ? `${d} years` : "N/A"),
      },
      bmi: {
        label: "BMI",
        format: (d) => (d ? d.toFixed(1) : "N/A"),
      },
      asa: {
        label: "ASA Score",
        format: (d) => (d ? `${d} ASA` : "N/A"),
      },
      // Outcomes
      duration: {
        label: "Surgery Duration (hours)",
        format: (d) => (d ? `${d.toFixed(2)} hours` : "N/A"),
      },
      approach: {
        label: "Surgery Approach",
        format: (d) => (d ? `${d}` : "N/A"),
        toNumeric: (d, categoryMap) =>
          categoryMap[d] !== undefined ? categoryMap[d] : NaN,
      },
      optype: {
        label: "Surgery Type",
        format: (d) => (d ? `${d}` : "N/A"),
        toNumeric: (d, categoryMap) =>
          categoryMap[d] !== undefined ? categoryMap[d] : NaN,
      },
      death_inhosp: {
        label: "Deaths",
        format: (d) => (d ? `${d.toFixed(0)} deaths` : "N/A"),
      },
    };

    this.setupVisualization();
  }

  setupVisualization() {
    // Create SVG container for the scatter plot view
    this.svg = d3
      .select("#visualization")
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height);

    // Create group for the plot area
    this.plotArea = this.svg
      .append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    // Initialize scales
    this.xScale = d3.scaleLinear().range([0, this.innerWidth]);
    this.yScale = d3.scaleLinear().range([this.innerHeight, 0]);

    // Create axes
    this.xAxis = this.plotArea
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${this.innerHeight})`);
    this.yAxis = this.plotArea.append("g").attr("class", "y-axis");

    // Add axis labels
    this.xLabel = this.plotArea
      .append("text")
      .attr("class", "x-label")
      .attr("text-anchor", "middle")
      .attr("x", this.innerWidth / 2)
      .attr("y", this.innerHeight + 40);
    this.yLabel = this.plotArea
      .append("text")
      .attr("class", "y-label")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -this.innerHeight / 2)
      .attr("y", -40);

    // Create tooltip for scatter plot
    this.tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    // Add legend for scatter plot
    this.setupLegend();
  }

  setupLegend() {
    const legend = this.svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${this.width - 120},20)`);

    // Emergency status legend for scatter plot
    legend
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 5)
      .attr("fill", "#2196F3");
    legend
      .append("text")
      .attr("x", 10)
      .attr("y", 5)
      .text("Non-Emergency");

    legend
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 20)
      .attr("r", 5)
      .attr("fill", "#ff4444");
    legend
      .append("text")
      .attr("x", 10)
      .attr("y", 25)
      .text("Emergency");
  }

  updateVisualization(data, filters) {
    console.log("Updating visualization with:", { data, filters });
    if (!data || !filters) {
      console.warn("Missing data or filters");
      return;
    }

    const xMetric = filters.riskFactor;
    const yMetric = filters.outcome;

    console.log("Metrics:", { xMetric, yMetric });
    console.log("Sample data point:", data[0]);

    // Get valid data points only
    const validData = data.filter(
      (d) =>
        d.riskFactors &&
        d.outcomes &&
        !isNaN(d.riskFactors[xMetric]) &&
        !isNaN(d.outcomes[yMetric])
    );

    console.log("Valid data points:", validData.length);

    if (validData.length === 0) {
      console.warn("No valid data points to display");
      return;
    }

    if (yMetric === "death_inhosp") {
      this.yScale.domain([0, 1]);
    } else {
      this.yScale.domain([
        0,
        d3.max(data, (d) => d.outcomes[yMetric]) * 1.1,
      ]);
    }

    // Update scales based on data ranges
    this.xScale.domain([
      d3.min(data, (d) => d.riskFactors[xMetric]) * 0.95,
      d3.max(data, (d) => d.riskFactors[xMetric]) * 1.05,
    ]);
    this.yScale.domain([
      0,
      d3.max(data, (d) => d.outcomes[yMetric]) * 1.1,
    ]);

    // Update axes
    this.xAxis.transition().duration(750).call(d3.axisBottom(this.xScale));
    this.yAxis.transition().duration(750).call(d3.axisLeft(this.yScale));

    // Update axis labels
    this.xLabel.text(this.metrics[xMetric].label);
    this.yLabel.text(this.metrics[yMetric].label);

    // Update scatter plot points
    const points = this.plotArea.selectAll(".point").data(data, (d) => d.caseid);
    const pointsEnter = points
      .enter()
      .append("circle")
      .attr("class", "point")
      .attr("r", 5)
      .attr("opacity", 0.6);
    points
      .merge(pointsEnter)
      .transition()
      .duration(750)
      .attr("cx", (d) => this.xScale(d.riskFactors[xMetric]))
      .attr("cy", (d) => this.yScale(d.outcomes[yMetric]))
      .attr("fill", (d) =>
        d.riskFactors.emergency ? "#ff4444" : "#2196F3"
      );
    points
      .exit()
      .transition()
      .duration(750)
      .attr("r", 0)
      .remove();

    // Update tooltips for scatter plot
    this.updateTooltips(xMetric, yMetric);
  }

  updateTooltips(xMetric, yMetric) {
    this.plotArea
      .selectAll(".point")
      .on("mouseover", (event, d) => {
        this.tooltip
          .style("opacity", 1)
          .html(`
            Department: ${d.department}<br/>
            ${this.metrics[xMetric].label}: ${this.metrics[xMetric].format(
            d.riskFactors[xMetric]
          )}<br/>
            ${this.metrics[yMetric].label}: ${this.metrics[yMetric].format(
            d.outcomes[yMetric]
          )}<br/>
            Emergency: ${d.riskFactors.emergency ? "Yes" : "No"}
          `)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", () => {
        this.tooltip.style("opacity", 0);
      });
  }

  // New method for rendering the sunburst view with hierarchical aggregation,
  // dynamic color schemes, on–arc labels, and a central hover label.
  updateSunburst(data, filters) {
    // Clear any existing SVG (e.g., the scatter plot)
    d3.select("#visualization").select("svg").remove();

    const width = 928;
    const height = width;
    const radius = width / 6;

    // Helper functions for binning age and BMI
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

    // Determine the selected metric:
    // For death mode, we now aggregate the actual number of deaths.
    // For duration mode, we sum the surgery hours.
    const metric = filters.outcome; // "death_inhosp" or "duration"

    // Build hierarchical data using the selected metric.
    function prepareSunburstData(data, metric) {
      const levels = [
        (d) => (d.riskFactors.emergency === 1 ? "Emergency" : "Non-Emergency"),
        (d) => d.riskFactors.optype || "Unknown Surgery Type",
        (d) => d.riskFactors.approach || "Unknown Approach",
        (d) => binAge(d.riskFactors.age),
        (d) => binBMI(d.riskFactors.bmi),
        (d) =>
          d.riskFactors.asa != null ? `ASA ${d.riskFactors.asa}` : "ASA Missing",
      ];
      if (metric === "death_inhosp") {
        // For death mode, each record contributes 0 or 1 death.
        const root = { name: "All", totalDeaths: 0, children: {} };
        data.forEach((d) => {
          let death = d.outcomes.death_inhosp; // 0 or 1
          let node = root;
          node.totalDeaths += death;
          levels.forEach((levelFn) => {
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
        // For duration, sum the duration values.
        const root = { name: "All", total: 0, children: {} };
        data.forEach((d) => {
          let value = d.outcomes.duration;
          let node = root;
          node.total += value;
          levels.forEach((levelFn) => {
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

    // Create the SVG container.
    const svg = d3
      .select("#visualization")
      .append("svg")
      .attr("viewBox", [-width / 2, -height / 2, width, width])
      .style("font", "10px sans-serif");

    // Add a central label for showing hovered values.
    const centralLabel = svg
      .append("text")
      .attr("class", "central-label")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", "2em")
      .style("fill", "#888")
      .style("pointer-events", "none")
      .style("visibility", "hidden");

    // Define color scheme.
    let color;
    if (metric === "death_inhosp") {
      // For death mode, use red for Emergency and blue for Non-Emergency.
      color = (d) => {
        const emergencyNode = d.ancestors().find((n) => n.depth === 1);
        return emergencyNode && emergencyNode.data.name === "Emergency"
          ? "red"
          : "blue";
      };
    } else {
      // For duration, use a default ordinal color scale.
      color = d3.scaleOrdinal(
        d3.quantize(
          d3.interpolateRainbow,
          Object.keys(hierarchicalData.children).length + 1
        )
      );
    }

    // Compute partition layout.
    const rootNode = d3
      .hierarchy(hierarchicalData)
      .sum((d) => d.value)
      .sort((a, b) => b.value - a.value);
    const partitionLayout = d3.partition().size([2 * Math.PI, rootNode.height + 1]);
    partitionLayout(rootNode);
    rootNode.each((d) => (d.current = d));

    const arc = d3
      .arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius * 1.5)
      .innerRadius((d) => d.y0 * radius)
      .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

    // Draw arcs.
    const path = svg
      .append("g")
      .selectAll("path")
      .data(rootNode.descendants().slice(1))
      .join("path")
      .attr("fill", (d) => {
        if (metric === "death_inhosp") {
          return color(d);
        } else {
          let current = d;
          while (current.depth > 1) current = current.parent;
          return color(current.data.name);
        }
      })
      .attr("fill-opacity", (d) =>
        arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0
      )
      .attr("pointer-events", (d) =>
        arcVisible(d.current) ? "auto" : "none"
      )
      .attr("d", (d) => arc(d.current))
      .on("click", clicked)
      .on("mouseover", (event, d) => {
        let valueText;
        if (metric === "death_inhosp") {
          valueText = d.data.value.toFixed(0) + " deaths";
        } else {
          valueText = d.data.value.toFixed(0) + " hrs";
        }
        centralLabel.text(valueText).style("visibility", "visible");
      })
      .on("mouseout", () => {
        centralLabel.style("visibility", "hidden");
      });

    // Show labels only if the arc is sufficiently large.
    function labelVisible(d) {
      return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
    }
    function labelTransform(d) {
      const x = ((d.x0 + d.x1) / 2) * (180 / Math.PI);
      const y = ((d.y0 + d.y1) / 2) * radius;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }
    const label = svg
      .append("g")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .style("user-select", "none")
      .selectAll("text")
      .data(rootNode.descendants().slice(1))
      .join("text")
      .attr("dy", "0.35em")
      .attr("fill-opacity", (d) => +labelVisible(d.current))
      .attr("transform", (d) => labelTransform(d.current))
      .text((d) => d.data.name);

    // Add a background reset circle so that clicking on whitespace resets the view.
    const parent = svg
      .append("circle")
      .datum(rootNode)
      .attr("r", radius)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("click", (event, d) => {
        clicked(event, rootNode);
      });

    function clicked(event, p) {
      rootNode.each((d) => {
        d.target = {
          x0:
            Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) *
            2 *
            Math.PI,
          x1:
            Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) *
            2 *
            Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth),
        };
      });

      const t = svg.transition().duration(event.altKey ? 7500 : 750);

      path.transition(t)
        .tween("data", (d) => {
          const i = d3.interpolate(d.current, d.target);
          return (t) => (d.current = i(t));
        })
        .attrTween("d", (d) => () => arc(d.current));

      label.transition(t)
        .attr("fill-opacity", (d) => +labelVisible(d.target))
        .attrTween("transform", (d) => () => labelTransform(d.current));
    }

    function arcVisible(d) {
      return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
    }
  }
}

export const visualization = new Visualization();
