import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export class EnhancedWordCloud {
  constructor(options = {}) {
    // Configuration options
    this.width = options.width || 800;
    this.height = options.height || 500;
    this.maxFontSize = options.maxFontSize || 50;
    this.minFontSize = options.minFontSize || 18;
    // Lower padding so words can be closer or even touching
    this.padding = options.padding !== undefined ? options.padding : 1;
    this.minCaseThreshold = options.minCaseThreshold || 3;
    this.maxWords = options.maxWords || 20;
    this.fontFamily = options.fontFamily || "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif";
  }

  initialize(containerId) {
    // Clear any existing content
    this.container = d3.select(containerId).html("");

    // Optional header
    this.container.append("h3")
      .text("Top Diagnosis Categories")
      .style("color", "#2c3e50")
      .style("margin-bottom", "15px");

    // Create an SVG container (responsive with viewBox)
    this.svg = this.container
      .append("div")
      .attr("class", "wordcloud-svg-container")
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .style("max-width", "100%")
      .style("height", "auto");

    // Main group (we’ll place words in a sub-group so we can scale/translate them afterward)
    this.g = this.svg.append("g");

    // Tooltip for interactivity
    this.tooltip = d3.select("body").append("div")
      .attr("class", "wordcloud-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "#fff")
      .style("padding", "10px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", "1000");
  }

  update(data) {
    if (!data || data.length === 0) {
      this.showNoDataMessage("No data available");
      return;
    }

    // Categorize the diagnoses
    const categorizedData = this.categorizeDiagnoses(data);
    if (Object.keys(categorizedData).length === 0) {
      this.showNoDataMessage("No diagnosis data available for the selected filters");
      return;
    }

    // Convert to array and filter by threshold
    let words = Object.entries(categorizedData)
      .filter(([_, count]) => count >= this.minCaseThreshold)
      .map(([text, count]) => ({
        text,
        count,
        size: this.calculateFontSize(count, Object.values(categorizedData))
      }));

    // Sort by frequency (descending) and limit to top N
    words.sort((a, b) => d3.descending(a.count, b.count));
    words = words.slice(0, this.maxWords);

    // Clear any previous content
    this.g.selectAll("*").remove();

    // Color scale
    const colorScale = d3.scaleOrdinal()
      .domain(words.map(d => d.text))
      .range(d3.schemeSet2);

    // Measure each word’s dimensions using a temporary text element
    const tempText = this.g.append("text")
      .attr("font-family", this.fontFamily)
      .style("visibility", "hidden");

    words.forEach(d => {
      tempText.text(d.text).attr("font-size", `${d.size}px`);
      const bbox = tempText.node().getBBox();
      d.width = bbox.width;
      d.height = bbox.height;
    });
    tempText.remove();

    // Tetris-style layout in a single cluster from the center
    const bounds = { width: this.width, height: this.height };
    const placedWords = [];

    // Try to place each word, expanding out from the center
    words.forEach(d => {
      if (this.findTetrisPosition(d, placedWords, bounds, { x: 0, y: 0 })) {
        placedWords.push(d);
      } else {
        console.log("Could not place word:", d.text);
      }
    });

    // Create a sub-group for all words so we can scale them
    const wordGroup = this.g.append("g").attr("class", "wordcloud-words");

    // Render the words
    const wordSelection = wordGroup.selectAll("g.word")
      .data(placedWords)
      .enter()
      .append("g")
      .attr("class", "word")
      .style("cursor", "pointer")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .on("mouseover", (event, d) => {
        // Highlight
        d3.select(event.currentTarget).select("rect")
          .transition().duration(200)
          .style("opacity", 1)
          .style("filter", "brightness(1.1)");
        d3.select(event.currentTarget).select("text")
          .transition().duration(200)
          .attr("font-weight", "bold")
          .style("filter", "drop-shadow(0px 0px 2px rgba(255,255,255,0.7))");

        // Tooltip
        const totalCases = placedWords.reduce((sum, w) => sum + w.count, 0);
        const percentage = ((d.count / totalCases) * 100).toFixed(1);
        this.tooltip
          .style("opacity", 1)
          .html(`
            <div style="font-weight:bold;margin-bottom:5px;font-size:14px;">${d.text}</div>
            <div><strong>Cases:</strong> ${d.count}</div>
            <div><strong>Percentage:</strong> ${percentage}%</div>
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", (event, d) => {
        d3.select(event.currentTarget).select("rect")
          .transition().duration(200)
          .style("opacity", 0.85)
          .style("filter", "none");
        d3.select(event.currentTarget).select("text")
          .transition().duration(200)
          .attr("font-weight", d.count > d3.quantile(placedWords.map(w => w.count), 0.75) ? "bold" : "normal")
          .style("filter", "none");
        this.tooltip.style("opacity", 0);
      });

    // Background rectangle (Tetris-like block)
    wordSelection.append("rect")
      .attr("x", d => -d.width / 2 - 2)
      .attr("y", d => -d.height / 2 - 2)
      .attr("width", d => d.width + 4)
      .attr("height", d => d.height + 4)
      .attr("rx", 4)
      .attr("ry", 4)
      .style("fill", d => colorScale(d.text))
      .style("opacity", 0.85);

    // Word text
    wordSelection.append("text")
      .attr("font-size", "0px") // start small for animation
      .attr("font-family", this.fontFamily)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "white")
      .text(d => d.text)
      .transition()
      .duration(600)
      .attr("font-size", d => d.size);

    // Finally, fit the cluster to the container so there are no big empty margins
    this.fitToContainer(wordGroup, placedWords);

    // Show summary stats
    this.showSummaryStats(placedWords);
  }

  // --- Scale and center the placed words so they fill the container ---
  fitToContainer(group, words) {
    if (!words.length) return;
    const margin = 5;

    // Compute bounding box of all placed words
    const minX = d3.min(words, d => d.x - d.width / 2 - 2);
    const maxX = d3.max(words, d => d.x + d.width / 2 + 2);
    const minY = d3.min(words, d => d.y - d.height / 2 - 2);
    const maxY = d3.max(words, d => d.y + d.height / 2 + 2);

    const w = maxX - minX;
    const h = maxY - minY;

    // Scale to fit the SVG dimensions
    const scale = Math.min(
      this.width / (w + margin * 2),
      this.height / (h + margin * 2)
    );

    // Translate so that (minX, minY) moves to the origin, then center
    const offsetX = -minX - w / 2;
    const offsetY = -minY - h / 2;

    group.attr(
      "transform",
      `translate(${this.width / 2},${this.height / 2})
       scale(${scale})
       translate(${offsetX},${offsetY})`
    );
  }

  // --- Tetris layout from the center (no quadrants) ---
  findTetrisPosition(word, placedWords, bounds, start) {
    // Smaller gridStep so words can be close
    const gridStep = 3;
    const maxRadius = Math.max(bounds.width, bounds.height) / 2;

    // Expand outward from start.x, start.y
    for (let distance = 0; distance <= maxRadius; distance += gridStep) {
      for (let i = -distance; i <= distance; i += gridStep) {
        for (let j of [-distance, distance]) {
          for (const [x, y] of [
            [start.x + i, start.y + j],
            [start.x + j, start.y + i]
          ]) {
            word.x = x;
            word.y = y;
            // Check if in bounds
            if (Math.abs(word.x) + word.width / 2 > bounds.width / 2 ||
                Math.abs(word.y) + word.height / 2 > bounds.height / 2) {
              continue;
            }
            // Check collision
            if (!placedWords.some(p => this.checkCollision(word, p))) {
              return true; // Found a spot
            }
          }
        }
      }
    }
    return false;
  }

  checkCollision(w1, w2) {
    return (
      Math.abs(w1.x - w2.x) < ((w1.width + w2.width) / 2 + this.padding) &&
      Math.abs(w1.y - w2.y) < ((w1.height + w2.height) / 2 + this.padding)
    );
  }

  // --- Data Processing ---
  categorizeDiagnoses(data) {
    const categoryMap = {
      'Cancer': ['cancer', 'carcinoma', 'tumor', 'malignant', 'neoplasm', 'sarcoma', 'leukemia', 'lymphoma', 'myeloma'],
      'Cardiovascular': ['heart', 'cardiac', 'coronary', 'artery', 'arterial', 'vascular', 'venous', 'vein', 'atrial', 'ventricular', 'aortic', 'aneurysm', 'angina', 'hypertension', 'hypotension'],
      'Respiratory': ['lung', 'pulmonary', 'respiratory', 'asthma', 'copd', 'pneumonia', 'bronchitis', 'pleural', 'pneumothorax'],
      'Gastrointestinal': ['gastric', 'intestinal', 'bowel', 'colon', 'rectal', 'appendicitis', 'colitis', 'crohn', 'gallbladder', 'liver', 'hepatic', 'pancreatic', 'hernia', 'gastritis', 'ulcer'],
      'Musculoskeletal': ['bone', 'joint', 'muscle', 'tendon', 'fracture', 'arthritis', 'spinal', 'vertebral', 'disc', 'osteo'],
      'Neurological': ['brain', 'neural', 'cerebral', 'stroke', 'seizure', 'epilepsy', 'parkinson', 'alzheimer', 'dementia', 'neuralgia'],
      'Genitourinary': ['kidney', 'renal', 'bladder', 'urinary', 'prostate', 'testicular', 'uterine', 'ovarian', 'cervical', 'nephritic'],
      'Endocrine': ['diabetes', 'thyroid', 'adrenal', 'pituitary', 'hormonal', 'metabolic'],
      'Infectious': ['infection', 'bacterial', 'viral', 'fungal', 'sepsis', 'abscess', 'cellulitis'],
      'Skin Disease': ['dermatitis', 'psoriasis', 'cellulitis', 'melanoma', 'rash', 'wound']
    };

    const specificDiagnoses = [
      'Breast cancer', 'Lung cancer', 'Colorectal cancer', 'Prostate cancer',
      'Heart attack', 'Stroke', 'Heart failure', 'Atrial fibrillation',
      'Diabetes', 'Hypertension', 'Pneumonia', 'Kidney disease',
      'Appendicitis', 'Gallstones', 'Kidney stones', 'Herniated disc'
    ];

    const rawCounts = {};
    data.forEach(record => {
      if (record && record.dx) {
        const dx = record.dx.trim();
        rawCounts[dx] = (rawCounts[dx] || 0) + 1;
      }
    });

    const categoryCounts = {};
    // First, add specific diagnoses
    specificDiagnoses.forEach(spec => {
      const matches = Object.keys(rawCounts).filter(dx =>
        dx.toLowerCase().includes(spec.toLowerCase())
      );
      const count = matches.reduce((sum, dx) => sum + rawCounts[dx], 0);
      if (count > 0) categoryCounts[spec] = count;
    });

    // Then, map remaining diagnoses
    Object.entries(rawCounts).forEach(([diagnosis, count]) => {
      if (specificDiagnoses.some(spec => diagnosis.toLowerCase().includes(spec.toLowerCase()))) return;
      let matched = false;
      const lowerDx = diagnosis.toLowerCase();
      for (const [category, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(keyword => lowerDx.includes(keyword))) {
          categoryCounts[category] = (categoryCounts[category] || 0) + count;
          matched = true;
          break;
        }
      }
      if (!matched && count >= this.minCaseThreshold) {
        categoryCounts[diagnosis] = count;
      }
    });
    return categoryCounts;
  }

  calculateFontSize(count, allCounts) {
    const minCount = d3.min(allCounts.filter(c => c >= this.minCaseThreshold));
    const maxCount = d3.max(allCounts);
    if (minCount === maxCount) {
      return (this.maxFontSize + this.minFontSize) / 2;
    }
    // Power scale for better differentiation
    return this.minFontSize +
      Math.pow((count - minCount) / (maxCount - minCount), 0.4) *
      (this.maxFontSize - this.minFontSize);
  }

  // --- Summary & Fallback Methods ---

  showSummaryStats(words) {
    this.container.select(".wordcloud-stats").remove();
    const statsContainer = this.container.append("div")
      .attr("class", "wordcloud-stats")
      .style("background-color", "#f8f9fa")
      .style("padding", "15px")
      .style("border-radius", "6px")
      .style("margin-top", "10px")
      .style("font-size", "14px");

    const totalCases = words.reduce((sum, w) => sum + w.count, 0);
    const uniqueCategories = words.length;

    statsContainer.append("div")
      .style("font-weight", "bold")
      .style("font-size", "16px")
      .style("margin-bottom", "10px")
      .style("color", "#2c3e50")
      .text("Top Diagnosis Categories");

    statsContainer.append("div")
      .html(`Total Cases: <span style="font-weight:600">${totalCases}</span>`)
      .style("margin-bottom", "5px");

    statsContainer.append("div")
      .html(`Categories Shown: <span style="font-weight:600">${uniqueCategories} of ${this.maxWords}</span>`)
      .style("margin-bottom", "10px");

    const topItems = words.slice().sort((a, b) => d3.descending(a.count, b.count)).slice(0, 5);
    const topSection = statsContainer.append("div").style("margin-top", "10px");
    topSection.append("div")
      .style("font-weight", "600")
      .style("margin-bottom", "5px")
      .text("Top 5 Categories:");
    const topList = topSection.append("div")
      .style("display", "flex")
      .style("flex-direction", "column")
      .style("gap", "5px");

    topItems.forEach((item, i) => {
      topList.append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .html(`
          <span style="font-weight:bold;margin-right:5px;color:#2c3e50">${i + 1}.</span>
          <span style="flex-grow:1">${item.text}</span>
          <span style="font-weight:600;color:#3498db">
            ${item.count} (${((item.count / totalCases) * 100).toFixed(1)}%)
          </span>
        `);
    });
  }

  showNoDataMessage(message = "No data available") {
    this.g.selectAll("*").remove();
    this.g.append("text")
      .attr("x", this.width / 2)
      .attr("y", this.height / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("fill", "#555")
      .text(message);
    this.container.select(".wordcloud-stats").remove();
  }
}

// Optionally export a single instance
export const enhancedWordCloud = new EnhancedWordCloud();
