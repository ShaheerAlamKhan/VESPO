// Data processing and manipulation functions
class DataProcessor {
    constructor() {
        this.rawData = null;
        this.processedData = null;
        this.BASE_URL = 'https://vitaldb.net/api';  // VitalDB API base URL
    }

    async loadData() {
        try {
            // First find cases with required tracks
            const caseIds = await this.findCases(['ECG_II', 'ART', 'PLETH', 'HR']);
            
            // Load data for the first N cases (limit for visualization performance)
            const casesToLoad = caseIds.slice(0, 10);
            const loadedData = [];
            
            for (const caseId of casesToLoad) {
                const caseData = await this.loadCase(caseId);
                if (caseData) {
                    loadedData.push(caseData);
                }
            }

            this.rawData = loadedData;
            this.processData();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async findCases(trackNames) {
        try {
            const tracksParam = trackNames.join(',');
            const response = await fetch(`${this.BASE_URL}/cases?tracks=${tracksParam}`);
            const data = await response.json();
            return data.cases || [];
        } catch (error) {
            console.error('Error finding cases:', error);
            return [];
        }
    }

    async loadCase(caseId) {
        try {
            // Load case metadata
            const metaResponse = await fetch(`${this.BASE_URL}/case/${caseId}/meta`);
            const metadata = await metaResponse.json();

            // Load vital signs data
            const dataResponse = await fetch(`${this.BASE_URL}/case/${caseId}/data`);
            const vitalData = await dataResponse.json();

            return {
                caseId,
                metadata,
                vitalData
            };
        } catch (error) {
            console.error(`Error loading case ${caseId}:`, error);
            return null;
        }
    }

    processData() {
        if (!this.rawData) return;
        
        this.processedData = this.rawData.map(record => ({
            id: record.caseId,
            surgicalApproach: record.metadata.approach,
            duration: this.calculateDuration(
                record.metadata.operationStartTime, 
                record.metadata.operationEndTime
            ),
            vitals: {
                ecg: record.vitalData.ECG_II,
                art: record.vitalData.ART,
                pleth: record.vitalData.PLETH,
                hr: record.vitalData.HR
            }
        }));
    }

    filterData(filters) {
        if (!this.processedData) return [];

        return this.processedData.filter(record => {
            return (!filters.surgicalApproach || record.surgicalApproach === filters.surgicalApproach) &&
                   (!filters.demographics || this.matchesDemographic(record, filters.demographics));
        });
    }

    calculateDuration(startTime, endTime) {
        return new Date(endTime) - new Date(startTime);
    }

    matchesDemographic(record, demographicFilter) {
        // Implement demographic filtering logic
        return true; // Placeholder
    }
}

// Create global instance
const dataProcessor = new DataProcessor();
