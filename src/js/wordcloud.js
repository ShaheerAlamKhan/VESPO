// wordcloud.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import d3Cloud from "https://esm.sh/d3-cloud@1.2.5";

export function updateWordCloud(rawData) {
  d3.select("#wordcloud").select("svg").remove();
  
  const diagnoses = rawData.map(d => d.dx).filter(Boolean);
  const phraseCounts = d3.rollups(
    diagnoses,
    group => group.length,
    phrase => phrase.toLowerCase()
  );
  phraseCounts.sort(([, a], [, b]) => d3.descending(a, b));
  const wordsData = phraseCounts.map(([phrase, count]) => ({ text: phrase, count }));
  
  const width = 640, height = 400;
  const maxCount = d3.max(wordsData, d => d.count);
  
  const layout = d3Cloud()
    .size([width, height])
    .words(wordsData)
    .padding(5)
    .rotate(() => 0)
    .font("sans-serif")
    .fontSize(d => Math.sqrt(d.count) * 15)
    .on("end", draw);
  
  layout.start();
  
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
  
  function draw(words) {
    const svg = d3.select("#wordcloud")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("font-family", "sans-serif")
      .attr("text-anchor", "middle");
  
    const g = svg.append("g")
      .attr("transform", `translate(${width/2},${height/2})`);
  
    g.selectAll("text")
      .data(words)
      .enter()
      .append("text")
      .attr("class", "wordcloud-text")
      .style("font-size", d => `${d.size}px`)
      .style("font-weight", "bold")
      // Increase fill opacity by multiplying by 1.5 (capped at 1)
      .style("fill-opacity", d => Math.min(1, (d.count / maxCount) * 1.5))
      .attr("text-anchor", "middle")
      .attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
      .text(d => d.text)
      .on("mouseover", function(event, d) {
        tooltip.style("opacity", 1)
          .html(`${d.text}: ${d.count} occurrences`)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 10 + "px");
      })
      .on("mouseout", function() {
        tooltip.style("opacity", 0);
      });
  }
}
