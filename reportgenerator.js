class ContractorReport {
    static get defaultFilters() {
        const now = new Date();
        const defaultPast = new Date(now.getFullYear(), 0, 1, 0, 0, 0);

        return {
            daterange : [defaultPart, now],
            currency : 'cad',
            totalrange : [0, Infinity]
        };
    }

    constructor(filters = {}, options = {}) {
        this.filters = Object.assign(ContractorReport.defaultFilters, filters);
        this.
    }

    generate() {

    }
}

class ReportGenerator {
    livevar(cli, levels, params, sendback) {
        if (levels[0] == 'presets') {

        } else if (levels[0] == '') {
            
        }
    }

    adminPOST(cli) {

    }

    adminPUT(cli) {

    }

    adminDELETE(cli) {

    }
}

module.exports = new ReportGenerator();

