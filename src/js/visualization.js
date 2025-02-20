import * as alternativePlot from "./alternativePlot.js";
import * as sunburst from "./sunburst.js";
import * as boxPlot from "./boxplot.js";
import * as wordCloud from "./wordcloud.js";

export const visualization = {
  updateAlternativePlot: alternativePlot.updateAlternativePlot,
  updateSunburst: sunburst.updateSunburst,
  updateBoxPlot: boxPlot.updateBoxPlot,
  updateWordCloud: wordCloud.updateWordCloud,
};