// visualization.js
import { updateAlternativePlot } from './alternativePlot.js';
import { updateSunburst } from './sunburst.js';
import { updateBoxPlot } from './boxplot.js';
import { updateWordCloud } from './wordcloud.js';

// Create a namespace for all visualization functions
const visualization = {
  updateAlternativePlot: (data, filters, metrics, dimensions) => {
    console.log('Starting alternative plot update with:', {
      dataLength: data.length,
      filters,
      dimensions
    });
    try {
      return updateAlternativePlot(data, filters, metrics, dimensions);
    } catch (error) {
      console.error('Error in updateAlternativePlot:', error);
      const container = document.getElementById('visualization');
      if (container) {
        container.innerHTML = `
          <div class="text-red-500 p-4 text-center">
            <p>Error displaying visualization. Please try again.</p>
            <p class="text-sm mt-2">${error.message}</p>
          </div>
        `;
      }
      // Make sure to hide loading spinner on error
      document.getElementById("loading").style.display = "none";
    }
  },

  updateSunburst: (data, filters, metrics, dimensions) => {
    console.log('Starting sunburst update with:', {
      dataLength: data.length,
      filters,
      dimensions
    });
    try {
      return updateSunburst(data, filters, metrics, dimensions);
    } catch (error) {
      console.error('Error in updateSunburst:', error);
      const container = document.getElementById('visualization');
      if (container) {
        container.innerHTML = `
          <div class="text-red-500 p-4 text-center">
            <p>Error displaying visualization. Please try again.</p>
            <p class="text-sm mt-2">${error.message}</p>
          </div>
        `;
      }
      document.getElementById("loading").style.display = "none";
    }
  },

  updateBoxPlot: (data, filters, metrics, dimensions) => {
    console.log('Starting boxplot update with:', {
      dataLength: data.length,
      filters,
      dimensions
    });
    try {
      return updateBoxPlot(data, filters, metrics, dimensions);
    } catch (error) {
      console.error('Error in updateBoxPlot:', error);
      const container = document.getElementById('visualization');
      if (container) {
        container.innerHTML = `
          <div class="text-red-500 p-4 text-center">
            <p>Error displaying visualization. Please try again.</p>
            <p class="text-sm mt-2">${error.message}</p>
          </div>
        `;
      }
      document.getElementById("loading").style.display = "none";
    }
  },

  updateWordCloud: (data) => {
    console.log('Starting word cloud update with data length:', data.length);
    try {
      return updateWordCloud(data);
    } catch (error) {
      console.error('Error in updateWordCloud:', error);
      const container = document.getElementById('wordcloud');
      if (container) {
        container.innerHTML = `
          <div class="text-red-500 p-4 text-center">
            <p>Error displaying word cloud. Please try again.</p>
            <p class="text-sm mt-2">${error.message}</p>
          </div>
        `;
      }
    }
  }
};

// Export the visualization object
export { visualization };