// Data processing and manipulation functions
class DataProcessor {
    constructor() {
        this.rawData = null;
        this.processedData = null;
    }

    async loadData() {
        try {
            const response = await fetch('data/surgical_data.json');
            this.rawData = await response.json();
            this.processData();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    processData() {
        // Initial data processing
        if (!this.rawData) return;
        
        this.processedData = this.rawData.map(record => ({
            id: record.id,
            surgicalApproach: record.approach,
            duration: this.calculateDuration(record.startTime, record.endTime),
            // Add more processed fields
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
        // Convert times to Date objects and calculate difference
        return new Date(endTime) - new Date(startTime);
    }

    matchesDemographic(record, demographicFilter) {
        // Implement demographic filtering logic
        return true; // Placeholder
    }
}

// Create global instance
const dataProcessor = new DataProcessor();