// dataProcessing.js
import Papa from 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm'

class DataProcessor {
    constructor() {
        this.rawData = [];
        this.processedData = [];
        this.API_URL = 'https://api.vitaldb.net/cases';
    }

    async fetchData() {
        try {
            const response = await fetch(this.API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const csvText = await response.text();
            Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    this.rawData = results.data;
                    this.processData();
                    return results.data;
                },
                error: (error) => {
                    console.error('Error parsing CSV:', error);
                }
            });
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    }

    // Helper functions for data conversion
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
        return duration > 0 ? duration : null;
    }

    // Inside your processData method in dataProcessing.js, modify the mapping function
processData() {
    this.processedData = this.rawData
        .filter(record => {
            // Filter records with valid essential fields
            return Boolean(
                record?.caseid &&
                this.safeNumber(record?.age) &&
                this.safeNumber(record?.bmi) &&
                record?.asa &&
                this.safeNumber(record?.opstart) &&
                this.safeNumber(record?.opend) &&
                record?.department
            );
        })
        .map(record => ({
            caseid: record.caseid,
            department: record.department,
            dx: record.dx, // Add this line to preserve diagnosis data
            optype: record.optype, // Add operation type
            opname: record.opname, // Add operation name
            approach: record.approach, // Add approach
            riskFactors: {
                age: this.safeNumber(record.age),
                bmi: this.safeNumber(record.bmi),
                asa: this.convertASA(record.asa),
                emergency: record.emop === "1" || record.emop === 1 ? 1 : 0
            },
            outcomes: {
                duration: this.calculateDuration(
                    this.safeNumber(record.opstart),
                    this.safeNumber(record.opend)
                ),
                icu_days: this.safeNumber(record.icu_days),
                death_inhosp: record.death_inhosp === "1" || record.death_inhosp === 1 ? 1 : 0
            }
        }))
        .filter(record => {
            // Additional validation of processed data
            return (
                record.riskFactors.age > 0 && record.riskFactors.age < 120 &&
                record.riskFactors.bmi > 10 && record.riskFactors.bmi < 100 &&
                record.riskFactors.asa >= 1 && record.riskFactors.asa <= 6 &&
                record.outcomes.duration > 0 &&
                (record.outcomes.icu_days === null || record.outcomes.icu_days >= 0)
            );
        });
}

    getFilteredData(filters = {}) {
        console.log('Getting filtered data with filters:', filters);
        
        let filteredData = this.processedData;
        
        // Filter by emergency if specified
        if (filters.emergency !== '') {
            filteredData = filteredData.filter(record => 
                record.riskFactors.emergency === parseInt(filters.emergency)
            );
        }
    
        // Filter by department if specified
        if (filters.department) {
            filteredData = filteredData.filter(record => 
                record.department === filters.department
            );
        }
    
        console.log('Filtered data:', filteredData);
        return filteredData;
    }

    getMetricRange(metric) {
        const values = this.processedData.map(record => {
            const [category, field] = metric.split('.');
            return record[category][field];
        }).filter(value => value !== null);

        return {
            min: Math.min(...values),
            max: Math.max(...values),
            mean: values.reduce((a, b) => a + b, 0) / values.length
        };
    }

    getUniqueValues(category, field) {
        return [...new Set(this.processedData.map(record => 
            record[category][field]
        ))].filter(value => value !== null);
    }
    // Add this to your dataProcessor.js file temporarily (for debugging)
getFilteredData(filters = {}) {
    console.log('Getting filtered data with filters:', filters);
    
    let filteredData = this.processedData;
    
    // Filter by emergency if specified
    if (filters.emergency !== '') {
        filteredData = filteredData.filter(record => 
            record.riskFactors.emergency === parseInt(filters.emergency)
        );
    }

    // Filter by department if specified
    if (filters.department) {
        filteredData = filteredData.filter(record => 
            record.department === filters.department
        );
    }

    // Debug: Check the structure of the first item
    if (filteredData.length > 0) {
        console.log('First filtered data item:', filteredData[0]);
    }
    
    return filteredData;
}
}

export const dataProcessor = new DataProcessor();