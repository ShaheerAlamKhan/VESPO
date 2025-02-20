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

  generateCategoryMap(categoryField) {
    const uniqueValues = [
      ...new Set(this.rawData.map((record) => record[categoryField])),
    ].filter((value) => value !== null);
    return uniqueValues.reduce((map, value, index) => {
      map[value] = index + 1;
      return map;
    }, {});
  }

  convertCategoryToNumeric(categoryField, categoryValue) {
    if (!this.categoryMaps[categoryField]) {
      this.categoryMaps[categoryField] = this.generateCategoryMap(categoryField);
    }
    return this.categoryMaps[categoryField][categoryValue] !== undefined
      ? this.categoryMaps[categoryField][categoryValue]
      : null;
  }

  categoryMaps = {};

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
        if (!isValid) {
          console.log("Invalid record:", record);
        }
        return isValid;
      })
      .map((record) => ({
        caseid: record.caseid,
        department: record.department,
        riskFactors: {
          age: this.safeNumber(record.age),
          bmi: this.safeNumber(record.bmi),
          asa: this.convertASA(record.asa),
          emergency:
            record.emop === "1" || record.emop === 1 ? 1 : 0,
          approach: record.approach || "Unknown Approach",
          optype: record.optype || "Unknown Surgery Type",
        },
        outcomes: {
          duration: this.calculateDuration(
            this.safeNumber(record.opstart),
            this.safeNumber(record.opend)
          ),
          death_inhosp:
            record.death_inhosp === "1" || record.death_inhosp === 1
              ? 1
              : 0,
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
    const cacheKey = JSON.stringify(filters);
    if (this._filterCache && this._filterCache[cacheKey]) {
      console.log("Using cached filtered data");
      return this._filterCache[cacheKey];
    }
  
    let filteredData = this.processedData;
  
    if (filters.emergency !== "") {
      filteredData = filteredData.filter(
        (record) => record.riskFactors.emergency === parseInt(filters.emergency)
      );
    }
  
    if (filters.department) {
      filteredData = filteredData.filter(
        (record) => record.department === filters.department
      );
    }
  
    if (!this._filterCache) {
      this._filterCache = {};
    }
    this._filterCache[cacheKey] = filteredData;
    return filteredData;
  }
  
  getMetricRange(metric) {
    const values = this.processedData
      .map((record) => {
        const [category, field] = metric.split(".");
        return record[category][field];
      })
      .filter((value) => value !== null);

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      mean: values.reduce((a, b) => a + b, 0) / values.length,
    };
  }

  getUniqueValues(category, field) {
    return [
      ...new Set(
        this.processedData.map((record) => record[category][field])
      ),
    ].filter((value) => value !== null);
  }
}

export const dataProcessor = new DataProcessor();
