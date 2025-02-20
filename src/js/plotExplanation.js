import React from 'react';

const PlotExplanation = ({ plotType }) => {
  const explanations = {
    scatter: (
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
          Understanding the Bee Plot
        </h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          The Bee Plot visualizes individual cases as points, where each point represents a single surgical case. 
          The X-axis shows your selected risk factor (e.g., age, BMI, ASA score), while the Y-axis displays 
          the chosen outcome measure. Red points indicate emergency cases, while blue points represent planned 
          procedures. The clustering of points shows common patterns and relationships between risk factors 
          and outcomes.
        </p>
      </div>
    ),
    sunburst: (
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
          Understanding the Sunburst Plot
        </h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          The Sunburst Plot shows hierarchical relationships in your surgical data. Starting from the center, 
          each ring represents a different category: emergency status, surgery type, approach, age group, BMI 
          category, and ASA score. The size of each segment indicates the relative number of cases or total 
          duration. Click on any segment to zoom in and explore that specific subset of data. Click the center 
          to zoom out.
        </p>
      </div>
    ),
    boxplot: (
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
          Understanding the Box Plot
        </h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          The Box Plot displays the distribution of outcomes across different groups. Each box shows the median 
          (middle line), quartiles (box edges), and range (whiskers) of the selected outcome measure. The box 
          contains 50% of the data, while whiskers extend to show the full range excluding outliers. This helps 
          visualize how outcomes vary across different categories or ranges of your selected risk factor.
        </p>
      </div>
    )
  };

  return explanations[plotType] || null;
};

const Attribution = () => (
  <div className="fixed bottom-4 right-4 text-gray-400 dark:text-gray-600 text-sm">
    Made by Shaheer Khan
  </div>
);

export { PlotExplanation, Attribution };