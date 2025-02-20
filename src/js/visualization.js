// visualization.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
// Updated import: use esm.sh to ensure a proper ES module for d3-cloud.
import d3Cloud from "https://esm.sh/d3-cloud@1.2.5";

export class Visualization {
  constructor() {
    this.width = 1000;
    this.height = 500;
    this.margin = { top: 40, right: 100, bottom: 60, left: 60 };
    this.innerWidth = this.width - this.margin.left - this.margin.right;
    this.innerHeight = this.height - this.margin.top - this.margin.bottom;

    this.metrics = {
      age: {
        label: "Patient Age (years)",
        format: (d) => (d ? `${d} years` : "N/A"),
        unit: "years"
      },
      bmi: {
        label: "BMI",
        format: (d) => (d ? d.toFixed(1) : "N/A"),
      },
      asa: {
        label: "ASA Score",
        format: (d) => (d ? `${d} ASA` : "N/A"),
      },
      duration: {
        label: "Surgery Duration",
        format: (d) => (d ? `${d.toFixed(2)} hours` : "N/A"),
        unit: "hours"
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
        unit: "%"
      },
      sex: {
        label: "Sex",
        format: (d) => (d ? `${d}` : "N/A"),
      },
      department: {
        label: "Department",
        format: (d) => (d ? `${d}` : "N/A"),
      }
    };

    this.setupVisualization();
  }

  setupVisualization() {
    // Create SVG container for scatter plot
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

    // Add axis labels with additional class "axis-label"
    this.xLabel = this.plotArea
      .append("text")
      .attr("class", "x-label axis-label")
      .attr("text-anchor", "middle")
      .attr("x", this.innerWidth / 2)
      .attr("y", this.innerHeight + 40);
    this.yLabel = this.plotArea
      .append("text")
      .attr("class", "y-label axis-label")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -this.innerHeight / 2)
      .attr("y", -40);

    // Create tooltip for scatter plot and word cloud hover events
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
      .attr("transform", `translate(${this.width - 140},20)`);

    // Non-Emergency Legend
    legend
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 5)
      .attr("fill", "#2196F3")
      .attr("class", "legend-circle non-emergency");
    legend
      .append("text")
      .attr("x", 10)
      .attr("y", 5)
      .text("Non-Emergency")
      .attr("class", "legend-text");

    // Emergency Legend
    legend
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 20)
      .attr("r", 5)
      .attr("fill", "#ff4444")
      .attr("class", "legend-circle emergency");
    legend
      .append("text")
      .attr("x", 10)
      .attr("y", 25)
      .text("Emergency")
      .attr("class", "legend-text");
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

    this.xScale.domain([
      d3.min(data, (d) => d.riskFactors[xMetric]) * 0.95,
      d3.max(data, (d) => d.riskFactors[xMetric]) * 1.05,
    ]);
    this.yScale.domain([
      0,
      d3.max(data, (d) => d.outcomes[yMetric]) * 1.1,
    ]);

    this.xAxis.transition().duration(750).call(d3.axisBottom(this.xScale));
    this.yAxis.transition().duration(750).call(d3.axisLeft(this.yScale));

    this.xLabel.text(this.metrics[xMetric].label);
    this.yLabel.text(this.metrics[yMetric].label);
    // this.yLabel.text(`${this.metrics[yMetric].label} (${this.metrics[yMetric].unit})`);

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

  updateSunburst(data, filters) {
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
        (d) => (d.riskFactors.emergency === 1 ? "Emergency" : "Non-Emergency"),
        (d) => d.riskFactors.optype || "Unknown Surgery Type",
        (d) => d.riskFactors.approach || "Unknown Approach",
        (d) => binAge(d.riskFactors.age),
        (d) => binBMI(d.riskFactors.bmi),
        (d) =>
          d.riskFactors.asa != null ? `ASA ${d.riskFactors.asa}` : "ASA Missing",
      ];
      if (metric === "death_inhosp") {
        const root = { name: "All", totalDeaths: 0, children: {} };
        data.forEach((d) => {
          let death = d.outcomes.death_inhosp;
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

    const svg = d3
      .select("#visualization")
      .append("svg")
      .attr("viewBox", [-width / 2, -height / 2, width, width])
      .style("font", "10px sans-serif");

    const centralLabel = svg
      .append("text")
      .attr("class", "central-label")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", "2em")
      .style("fill", "#888")
      .style("pointer-events", "none")
      .style("visibility", "hidden");

    let color;
    if (metric === "death_inhosp") {
      color = (d) => {
        const emergencyNode = d.ancestors().find((n) => n.depth === 1);
        return emergencyNode && emergencyNode.data.name === "Emergency"
          ? "red"
          : "blue";
      };
    } else {
      color = d3.scaleOrdinal(
        d3.quantize(
          d3.interpolateRainbow,
          Object.keys(hierarchicalData.children).length + 1
        )
      );
    }

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
      .attr("class", "sunburst-label")
      .attr("dy", "0.35em")
      .attr("fill-opacity", (d) => +labelVisible(d.current))
      .attr("transform", (d) => labelTransform(d.current))
      .text((d) => d.data.name);

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

  // updateBarchart(data, filters) {
  //   d3.select("#visualization").select("svg").remove();

  //   function binAge(age) {
  //     if (age < 20) return "<20";
  //     else if (age < 40) return "20-39";
  //     else if (age < 60) return "40-59";
  //     else if (age < 80) return "60-79";
  //     else return "80+";
  //   }
  //   function binBMI(bmi) {
  //     if (bmi < 18.5) return "Underweight";
  //     else if (bmi < 25) return "Normal";
  //     else if (bmi < 30) return "Overweight";
  //     else return "Obese";
  //   }

  //   const xMetric = filters.riskFactor;
  //   const yMetric = filters.outcome;

  //   console.log("Metrics:", { xMetric, yMetric });
  //   console.log("Sample data point:", data[0]);

  //   if (yMetric === "death_inhosp") {
  //     this.yScale.domain([0, 1]);
  //   } else {
  //     this.yScale.domain([
  //       0,
  //       d3.max(data, (d) => d.outcomes[yMetric]) * 1.1,
  //     ]);
  //   }

  //   // Group data by age or bmi if xMetric is either of these
  //   let groupedData;
  //   if (xMetric === 'age') {
  //     // Bin age using binAge function
  //     groupedData = d3.group(data, d => binAge(d.riskFactors.age));
  //   } else if (xMetric === 'bmi') {
  //     // Bin BMI using binBMI function
  //     groupedData = d3.group(data, d => binBMI(d.riskFactors.bmi));
  //   } else {
  //     // Default behavior: group by original risk factor
  //     groupedData = d3.group(data, d => d.riskFactors[xMetric]);
  //   }

  //   const categoryAverages = Array.from(groupedData, ([key, values]) => {  
  //     const avg = d3.mean(values, d => d.outcomes[yMetric]);
      
  //     return {
  //       key: key,
  //       value: avg
  //     };
  //   });

  //   if (yMetric === 'death_inhosp') {
  //     categoryAverages.forEach(d => {
  //       d.value *= 100;
  //     })
  //   }

  //   categoryAverages.sort((a, b) => {
  //     if (a.key < b.key) return -1;
  //     if (a.key > b.key) return 1;
  //     return 0;
  //   });

  //   console.log('Category averages:', categoryAverages);

  //   // Categorical x-axis
  //   const uniqueCategories = categoryAverages.map(d => d.key);  // Get unique categories
  //   this.xScale = d3.scaleBand()  // Use scaleBand for categorical axis
  //       .domain(uniqueCategories)
  //       .range([0, this.innerWidth])
  //       .padding(0.1);  // Optional: Adjust padding

  //   this.yScale.domain([0, d3.max(categoryAverages, d => d.value) * 1.1]);

  //   // Create SVG container for the bar chart
  //   const svg = d3.select("#visualization").append("svg")
  //     .attr("width", this.width)
  //     .attr("height", this.height);

  //   // Create plot area group
  //   const plotArea = svg.append("g")
  //   .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

  // // Create bars for category averages
  //   const bars = plotArea.selectAll(".bar")
  //     .data(categoryAverages, d => d.key);  // Use category key as a unique identifier
  
  //   // Enter new bars
  //   const barsEnter = bars.enter()
  //   .append("rect")
  //   .attr("class", "bar")
  //   .attr("x", d => this.xScale(d.key))
  //   .attr("y", d => this.yScale(d.value))
  //   .attr("width", this.xScale.bandwidth())
  //   .attr("height", d => this.innerHeight - this.yScale(d.value))
  //   .attr("fill", "#2196F3")
  //   .attr("opacity", 0.6)
  //   .on("mouseover", (event, d) => {  // Arrow function used here
  //     d3.select(event.currentTarget).attr("fill", "#1976D2");
  //     tooltip.transition().duration(200).style("opacity", .9);
  //     tooltip.html(`Category: ${d.key}<br>Avg ${this.metrics[yMetric].label}: 
  //       ${d.value.toFixed(2)} ${this.metrics[yMetric].unit}`)
  //       .style("left", (event.pageX + 5) + "px")
  //       .style("top", (event.pageY - 28) + "px");
  //   })
  //   .on("mouseout", function() {
  //     d3.select(this).attr("fill", "#2196F3");
  //     tooltip.transition().duration(200).style("opacity", 0);
  //   });

  //   // Merge and transition bars
  //   bars.merge(barsEnter)
  //     .transition()
  //     .duration(750)
  //     .attr("x", d => this.xScale(d.key))
  //     .attr("y", d => this.yScale(d.value))
  //     .attr("width", this.xScale.bandwidth())
  //     .attr("height", d => this.innerHeight - this.yScale(d.value));
  
  //   // Remove old bars
  //   bars.exit()
  //     .transition()
  //     .duration(750)
  //     .attr("height", 0)
  //     .remove();
    
  //    // Create and transition axes
  //   const xAxisGroup = plotArea.append("g")
  //   .attr("class", "x-axis")
  //   .attr("transform", `translate(0, ${this.innerHeight})`); // Position the x-axis at the bottom

  //   const yAxisGroup = plotArea.append("g")
  //     .attr("class", "y-axis");

  //   // Transition for axes
  //   xAxisGroup.transition().duration(750).call(d3.axisBottom(this.xScale));
  //   yAxisGroup.transition().duration(750).call(d3.axisLeft(this.yScale));
    
  //   // Adding axis labels
  //   // X-axis label
  //   svg.append("text")
  //   .attr("class", "x-label")
  //   .attr("transform", `translate(${this.width / 2}, ${this.height - this.margin.bottom + 40})`)
  //   .style("text-anchor", "middle")
  //   .text(this.metrics[xMetric].label);

  //   // Y-axis label
  //   svg.append("text")
  //     .attr("class", "y-label")
  //     .attr("transform", "rotate(-90)")  // Rotate for vertical label
  //     .attr("x", -this.innerHeight / 2)
  //     .attr("y", this.margin.left - 40)
  //     .style("text-anchor", "middle")
  //     .text(`${this.metrics[yMetric].label} (${this.metrics[yMetric].unit})`);
  
  //   // Tooltip for hover effects
  //   const tooltip = d3.select("body").append("div")
  //     .attr("class", "tooltip")
  //     .style("opacity", 0);
  // }
     
  updateBarchart(data, filters) {
    d3.select("#visualization").select("svg").remove();

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

    const xMetric = filters.riskFactor;
    const yMetric = filters.outcome;

    // Group data by emergency status and then by age/bmi/risk factor
    let groupedData;
    if (xMetric === 'age') {
      groupedData = d3.group(data, d => d.riskFactors.emergency, d => binAge(d.riskFactors.age));
    } else if (xMetric === 'bmi') {
      groupedData = d3.group(data, d => d.riskFactors.emergency, d => binBMI(d.riskFactors.bmi));
    } else {
      groupedData = d3.group(data, d => d.riskFactors.emergency, d => d.riskFactors[xMetric]);
    }

    // Calculate category averages for each emergency status and category (age/bmi)
    const categoryAverages = [];
    groupedData.forEach((statusGroup, status) => {
      statusGroup.forEach((values, category) => {
        const avg = d3.mean(values, d => d.outcomes[yMetric]);
        categoryAverages.push({ status, category, value: avg });
      });
    });

    console.log('Category averages:', categoryAverages);

    if (yMetric === 'death_inhosp') {
      categoryAverages.forEach(d => {
        d.value *= 100; // Convert to percentage if dealing with death_inhosp
      });
    }

    // Sort category averages
    categoryAverages.sort((a, b) => a.category < b.category ? -1 : a.category > b.category ? 1 : 0);

    // Categorical x-axis
    const uniqueCategories = Array.from(new Set(categoryAverages.map(d => d.category)));  // Get unique categories
    this.xScale = d3.scaleBand()
      .domain(uniqueCategories)
      .range([0, this.innerWidth])
      .padding(0.1);

    this.yScale.domain([0, d3.max(categoryAverages, (d) => d.value) * 1.1]);

    // Create SVG container for the bar chart
    const svg = d3.select("#visualization").append("svg")
      .attr("width", this.width)
      .attr("height", this.height);

    this.svg = svg; // Save reference for legend

    // Create plot area group
    const plotArea = svg.append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    // Bar width (with space between the two bars)
    const barWidth = this.xScale.bandwidth() / 3;

    // Create bars for each category and emergency status
    plotArea.selectAll(".bar")
      .data(categoryAverages)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => this.xScale(d.category) + barWidth + (d.status === 1 ? -barWidth / 2 : barWidth / 2))
      .attr("y", d => this.yScale(d.value))
      .attr("height", d => this.innerHeight - this.yScale(d.value))
      .attr("width", barWidth)
      .attr("opacity", 0.85)
      .attr("fill", d => d.status === 1 ? "#ff4444" : "#2196F3")  // Color for emergency vs non-emergency
      .on("mouseover", (event, d) => {  // Handle hover effect
        // Hover color change
        if (d.status === 1) {
          d3.select(event.currentTarget).attr("fill", "#D32F2F");  // Darker red for emergency
        } else {
          d3.select(event.currentTarget).attr("fill", "#1976D2");  // Blue for non-emergency
        }
        tooltip.transition().duration(200).style("opacity", .9);
        tooltip.html(`Category: ${d.category} ${this.metrics[xMetric].unit ? `${this.metrics[xMetric].unit}` : ''}
          <br>Avg ${this.metrics[yMetric].label}: ${d.value.toFixed(2)} ${this.metrics[yMetric].unit}
          <br>Emergency: ${d.status === 1 ? 'Yes' : 'No'}`)
          .style("left", (event.pageX + 5) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function(event, d) {
        // On mouseout, reset the color but keep emergency red color for the "emergency" bars
        if (d.status === 1) {
          d3.select(this).attr("fill", "#ff4444");  // Keep red for emergency
        } else {
          d3.select(this).attr("fill", "#2196F3");  // Keep blue for non-emergency
        }
        tooltip.transition().duration(200).style("opacity", 0);
      });

    // Create and transition axes
    const xAxisGroup = plotArea.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${this.innerHeight})`); // Position the x-axis at the bottom

    const yAxisGroup = plotArea.append("g")
      .attr("class", "y-axis");

    // Transition for axes
    xAxisGroup.transition().duration(750).call(d3.axisBottom(this.xScale));
    yAxisGroup.transition().duration(750).call(d3.axisLeft(this.yScale));

    // Adding axis labels
    svg.append("text")
      .attr("class", "x-label")
      .attr("transform", `translate(${this.width / 2}, 
        ${this.height - this.margin.bottom + 40})`)
      .style("text-anchor", "middle")
      .text(this.metrics[xMetric].label);

    svg.append("text")
      .attr("class", "y-label")
      .attr("transform", "rotate(-90)")  // Rotate for vertical label
      .attr("x", -this.innerHeight / 2)
      .attr("y", this.margin.left - 40)
      .style("text-anchor", "middle")
      .text(`${this.metrics[yMetric].label} (${this.metrics[yMetric].unit})`);

    // Tooltip for hover effects
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    // Call the setupLegend function to add the legend
    this.setupLegend();
  }

  // New method to create the diagnosis word cloud
  updateWordCloud(rawData) {
    // Remove any existing word cloud SVG inside the #wordcloud container
    d3.select("#wordcloud").select("svg").remove();

    // Extract non-empty diagnosis values (using the "dx" field)
    const diagnoses = rawData.map(d => d.dx).filter(Boolean);

    // Count each unique diagnosis phrase (ignoring case)
    const phraseCounts = d3.rollups(
      diagnoses,
      group => group.length,
      phrase => phrase.toLowerCase()
    );
    phraseCounts.sort(([, a], [, b]) => d3.descending(a, b));
    const wordsData = phraseCounts.map(([phrase, count]) => ({ text: phrase, count }));

    const width = 640, height = 400;
    const maxCount = d3.max(wordsData, d => d.count);

    // Set up the cloud layout
    const layout = d3Cloud()
      .size([width, height])
      .words(wordsData)
      .padding(5)
      .rotate(() => 0)
      .font("sans-serif")
      .fontSize(d => Math.sqrt(d.count) * 15)
      .on("end", draw);

    layout.start();

    const self = this; // preserve context for tooltip usage

    function draw(words) {
      const svg = d3.select("#wordcloud")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "middle");

      // Center the word cloud
      const g = svg.append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

      g.selectAll("text")
        .data(words)
        .enter()
        .append("text")
        .style("font-size", d => `${d.size}px`)
        .style("font-weight", "bold")
        .style("fill-opacity", d => d.count / maxCount)
        .attr("text-anchor", "middle")
        .attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
        .text(d => d.text)
        .on("mouseover", function(event, d) {
          self.tooltip
            .style("opacity", 1)
            .html(`${d.text}: ${d.count} occurrences`)
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY + 10 + "px");
        })
        .on("mouseout", function() {
          self.tooltip.style("opacity", 0);
        });
    }
  }
}

export const visualization = new Visualization();
