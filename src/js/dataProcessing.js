// dataProcessing.js
import Papa from 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm'

class DataProcessor {
    constructor() {
        this.rawData = [];
        this.processedData = [];
        this.API_URL = 'https://api.vitaldb.net/cases';
    }

    // Fetch data from VitalDB API
    async fetchData() {
        try {
            const response = await fetch(this.API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Parse CSV data using PapaParse
            const csvText = await response.text();
            const parsedData = Papa.parse(csvText, {
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

    // Process raw data into a format suitable for D3
    processData() {
        this.processedData = this.rawData
            .filter(record => {
                // Enhanced null/undefined/NaN checking for critical fields
                return Boolean(
                    record?.caseid && 
                    record?.subjectid &&
                    record?.department &&
                    !isNaN(parseFloat(record?.age)) &&
                    !isNaN(parseFloat(record?.opstart)) && 
                    !isNaN(parseFloat(record?.opend)) &&
                    parseFloat(record?.opend) > parseFloat(record?.opstart) // Ensure valid duration
                );
            })
            .map(record => {
                // Helper function to safely parse numbers
                const safeNumber = (value) => {
                    const parsed = parseFloat(value);
                    return !isNaN(parsed) ? parsed : null;
                };
    
                // Helper function to safely parse strings
                const safeString = (value) => value || null;
    
                return {
                    id: safeString(record.caseid),
                    patientId: safeString(record.subjectid),
                    surgery: {
                        type: safeString(record.optype),
                        name: safeString(record.opname),
                        approach: safeString(record.approach),
                        department: safeString(record.department),
                        diagnosis: safeString(record.dx)
                    },
                    timing: {
                        duration: this.calculateDuration(
                            safeNumber(record.opstart), 
                            safeNumber(record.opend)
                        ),
                        date: record.casestart ? new Date(record.casestart) : null
                    },
                    patient: {
                        age: safeNumber(record.age),
                        sex: safeString(record.sex),
                        bmi: safeNumber(record.bmi),
                        asa: safeString(record.asa)
                    },
                    vitals: {
                        preop_hb: safeNumber(record.preop_hb),
                        preop_plt: safeNumber(record.preop_plt),
                        preop_na: safeNumber(record.preop_na),
                        preop_k: safeNumber(record.preop_k)
                    },
                    medications: {
                        propofol: safeNumber(record.intraop_ppf),
                        fentanyl: safeNumber(record.intraop_ftn),
                        ephedrine: safeNumber(record.intraop_eph),
                        phenylephrine: safeNumber(record.intraop_phe)
                    }
                };
            });
    }

    // Helper function to calculate duration
    calculateDuration(start, end) {
        return end - start;
    }

    // Get data filtered by specific criteria
    getFilteredData(filters = {}) {
        return this.processedData.filter(record => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true; // Skip empty filters
                
                // Handle nested objects in our data structure
                const keys = key.split('.');
                let recordValue = record;
                for (const k of keys) {
                    recordValue = recordValue[k];
                }
                
                return recordValue === value;
            });
        });
    }

    // Get unique values for a specific field (useful for filters)
    getUniqueValues(field) {
        const keys = field.split('.');
        return [...new Set(this.processedData.map(record => {
            let value = record;
            for (const key of keys) {
                value = value[key];
            }
            return value;
        }))];
    }

    // Get summary statistics for a numerical field
    getFieldStatistics(field) {
        const values = this.processedData
            .map(record => {
                const keys = field.split('.');
                let value = record;
                for (const key of keys) {
                    value = value[key];
                }
                return value;
            })
            .filter(value => value != null && !isNaN(value));

        return {
            min: Math.min(...values),
            max: Math.max(...values),
            average: values.reduce((a, b) => a + b, 0) / values.length,
            count: values.length
        };
    }
}

// Export a single instance
export const dataProcessor = new DataProcessor();