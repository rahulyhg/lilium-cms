const db = require('./includes/db');
const configlib = require('./config');

const REPORT_PRESET_COLLECTION = "ctorreppresets";

class ContractorReport {
    static get defaultFilters() {
        const now = new Date();
        const defaultPast = new Date(now.getFullYear(), 0, 1, 0, 0, 0);

        return {
            daterange : [defaultPast, now],
            totalrange : [0, Infinity]
        };
    }

    constructor(filt = {}, type) {
        const filters = Object.assign(ContractorReport.defaultFilters, filt);

        const $match = {
            $and : [
                { date : { $gt : filters.daterange[0] } },
                { date : { $lt : filters.daterange[1] } },
                { total : { $gt : filters.totalrange[0] } },
                { total : { $lt : filters.totalrange[1] } },
            ],
            valid : true
        };

        if (filters.currency) {
            $match.currency = filters.currency;
        }


        this.pipeline = [
            { $match }
        ];

        switch (type) {
            case "invoices":
                this.pipeline.push(
                    { $lookup : { as : "to", from : "entities", localField : "to", foreignField : "_id" } },
                    { $project : { _id : 0, number : 1, total : 1, at : 1, "to._id" : 1, "to.displayname" : 1, "to.avatarURL" : 1, currency : 1, transactionid : 1 } },
                    { $sort : { at : -1 } }
                );

                this.columns = [
                    { name : "Invoice Number", field : "number", type : "number" },
                    { name : "Amount", field : "total", type : "number" },
                    { name : "Currency", field : "currency", type : "string" },
                    { name : "Contractor", field : "to", type : "contractor" }
                ];
                break;

            case "date":
                this.pipeline.push(
                    { $group : { 
                        _id : { year : { $year : "$date" }, day : { $dayOfYear : "$date" }, currency : "$currency" },
                        total : { $sum : "$total" },
                        invoices : { $sum : 1 },
                    } },
                    { $project : { total : 1, invoices : 1, currency : "$_id.currency", year : "$_id.year", day : "$_id.day" } },
                    { $sort : { day : -1 } }
                );

                this.columns = [
                    { name : "Year", field : "year", type : "number" },
                    { name : "Day of year", field : "day", type : "number" },
                    { name : "Currency", field : "currency", type : "string" },
                    { name : "Invoices", field : "invoices", type : "number" },
                    { name : "Total", field : "total", type : "number" },
                ];

                break;

            case "contractors":
                this.pipeline.push(
                    { $group : { _id : {"to" : "$to", "currency" : "$currency"}, total : { $sum : "$total" }, invoices : { $push : "$number" },  } },
                    { $lookup : { as : "to", from : "entities", localField : "_id.to", foreignField : "_id" } },
                    { $project : { total : 1, invoices : { $size : "$invoices" }, currency : "$_id.currency", _id : 0, "to.displayname" : 1, "to.avatarURL" : 1, "to._id" : 1 } },
                );

                this.columns = [
                    { name : "Contractor", field : "to", type : "contractor" },
                    { name : "Total", field : "currency", type : "string" },
                    { name : "Invoices", field : "invoices", type : "number" }
                ];

                break;
        }
    }

    generate(done) {
        db.join(configlib.default(), 'contractorinvoices', this.pipeline, arr => {
            done({ data : arr, columns : this.columns });
        });
    }
}

class ContractorReportController {
    adminPOST(cli) {

    }

    adminPUT(cli) {

    }

    adminDELETE(cli) {

    }

    livevar(cli, levels, params, sendback) {
        if (cli.hasRight('generate-reports') && cli.hasRight('manage-contractors')) {
            if (levels[0] == "generate") {
                const reporttype = levels[1];
                const report = new ContractorReport(params.filters, reporttype);

                return report.generate(report => sendback({ report }));
            } else if (levels[0] == "presets") {
                return db.findToArray(configlib.default(), REPORT_PRESET_COLLECTION, {  }, (err, presets) => {
                    sendback({ presets })
                });
            } else {
                return cli.throwHTTP(404, 'No such level', true);
            }
        }


    }
}

module.exports = new ContractorReportController();
