// dataProcessing.js
import Papa from 'papaparse';

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
        this.processedData = this.rawData.map(record => ({
            id: record.caseid,
            patientId: record.subjectid,
            surgery: {
                type: record.optype,
                name: record.opname,
                approach: record.approach,
                department: record.department,
                diagnosis: record.dx
            },
            timing: {
                duration: this.calculateDuration(record.opstart, record.opend),
                date: new Date(record.casestart)
            },
            patient: {
                age: record.age,
                sex: record.sex,
                bmi: record.bmi,
                asa: record.asa
            },
            vitals: {
                preop_hb: record.preop_hb,
                preop_plt: record.preop_plt,
                preop_na: record.preop_na,
                preop_k: record.preop_k
            },
            medications: {
                propofol: record.intraop_ppf,
                fentanyl: record.intraop_ftn,
                ephedrine: record.intraop_eph,
                phenylephrine: record.intraop_phe
            }
        }));
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