// dataProcessing.js
import Papa from "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm";

class DataProcessor {
  constructor() {
    this.rawData = [];
    this.processedData = [];
    this.API_URL = "https://api.vitaldb.net/cases";
  }

  async fetchData() {
    try {
      const cacheKey = "vitaldbCases";
      const cacheTimestampKey = "vitaldbCases_timestamp";
      const cacheDuration = 3600 * 1000; // 1 hour in milliseconds
      let csvText;
      const cachedData = localStorage.getItem(cacheKey);
      const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
      if (cachedData && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp) < cacheDuration)) {
        console.log("Using cached data");
        csvText = cachedData;
      } else {
        const response = await fetch(this.API_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        csvText = await response.text();
        localStorage.setItem(cacheKey, csvText);
        localStorage.setItem(cacheTimestampKey, Date.now().toString());
      }
      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            this.rawData = results.data;
            this.processData();
            resolve(results.data);
          },
          error: (error) => {
            console.error("Error parsing CSV:", error);
            reject(error);
          },
        });
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }

  safeNumber(value) {
    const num = parseFloat(value);
    return !isNaN(num) ? num : null;
  }

  convertASA(asa) {
    if (!asa) return null;
    const match = asa.toString().match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }

  calculateDuration(start, end) {
    if (!start || !end) return null;
    const duration = end - start;
    return duration > 0 ? duration / 3600 : null;
  }

  processData() {
    console.log("Raw data before processing:", this.rawData.length);
    
    this.processedData = this.rawData
      .filter((record) => {
        const isValid = Boolean(
          record?.caseid &&
          this.safeNumber(record?.age) > 0 &&
          this.safeNumber(record?.bmi) > 0 &&
          this.safeNumber(record?.opstart) >= 0 &&
          this.safeNumber(record?.opend) > 0 &&
          record?.department
        );
        return isValid;
      })
      .map((record) => ({
        caseid: record.caseid,
        department: record.department,
        riskFactors: {
          age: this.safeNumber(record.age),
          bmi: this.safeNumber(record.bmi),
          asa: this.convertASA(record.asa),
          emergency: record.emop === "1" || record.emop === 1 ? 1 : 0,
          approach: record.approach || "Unknown Approach",
          optype: record.optype || "Unknown Surgery Type",
        },
        outcomes: {
          duration: this.calculateDuration(
            this.safeNumber(record.opstart),
            this.safeNumber(record.opend)
          ),
          death_inhosp: record.death_inhosp === "1" || record.death_inhosp === 1 ? 1 : 0,
        },
      }))
      .filter((record) => {
        return (
          record.riskFactors.age > 0 &&
          record.riskFactors.age < 120 &&
          record.riskFactors.bmi > 10 &&
          record.riskFactors.bmi < 100 &&
          record.outcomes.duration > 0
        );
      });
    
    console.log("Processed data after filtering:", this.processedData.length);
  }

  getFilteredData(filters = {}) {
    console.log("Getting filtered data with filters:", filters);
    console.log("Available processed data:", this.processedData.length);
    
    let filteredData = [...this.processedData];

    // Check data validity
    if (!Array.isArray(filteredData) || filteredData.length === 0) {
      console.error("No valid data available for filtering");
      return [];
    }

    // Only apply filters that are explicitly provided and not undefined/null
    if (filters.riskFactor && filters.outcome) {
      // Filter based on metric availability
      filteredData = filteredData.filter(record => {
        // For department, check the department field directly
        if (filters.riskFactor === "department") {
          return record.department !== undefined && 
                 record.outcomes[filters.outcome] !== undefined;
        }
        // For other risk factors, check in riskFactors object
        return record.riskFactors[filters.riskFactor] !== undefined && 
               record.outcomes[filters.outcome] !== undefined;
      });
    }

    console.log("Filtered data count:", filteredData.length);
    return filteredData;
  }
}

export const dataProcessor = new DataProcessor();