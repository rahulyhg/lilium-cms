const db = require('./db');
const fs = require('fs');
const dateformat = require('dateformat');
const configlib = require('./config');
const pathlib = require('path');
const mkdirp = require('mkdirp');
const Json2csvParser = require('json2csv').Parser;

class ContractorReport {
    static get defaultFilters() {
        const now = new Date();
        const defaultPast = new Date(now.getFullYear(), 0, 1, 0, 0, 0);

        return {
            startdate : defaultPast,
            enddate : now,
            totalrange : [0, Infinity]
        };
    }

    constructor(_c, filt = {}, type) {
        this._c = _c;
        this.type = type;
        const filters = Object.assign(ContractorReport.defaultFilters, filt);

        const $match = {
            $and : [
                { date : { $gt : new Date(filters.startdate) } },
                { date : { $lt : new Date(filters.enddate) } },
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

                break;

            case "contractors":
                this.pipeline.push(
                    { $group : { _id : {"to" : "$to", "currency" : "$currency"}, total : { $sum : "$total" }, invoices : { $push : "$number" },  } },
                    { $lookup : { as : "to", from : "entities", localField : "_id.to", foreignField : "_id" } },
                    { $unwind : "$to" },
                    { $project : { total : 1, invoices : { $size : "$invoices" }, currency : "$_id.currency", _id : 0, "to.displayname" : 1, "to.avatarURL" : 1, "to._id" : 1 } },
                    { $sort : { "to.displayname" : 1 } }
                );

                break;
        }
    }

    toCSV() {
        let fields;
        let data;

        switch (this.type) {
            case "contractors":
                fields = ["Contractor", "Amount paid", "Currency"];
                data = this.data.map(x => ({ 
                    "Contractor" : x.to.displayname, 
                    "Amount paid" : x.total, 
                    "Currency" : x.currency 
                }));
                break;
            case "date":
                break;
            case "invoices":
                break;
        }

        const parser = new Json2csvParser({ fields });
        return parser.parse(data);
    }

    generate(done) {
        db.join(configlib.default(), 'contractorinvoices', this.pipeline, arr => {
            this.data = arr;
            const csvstring = this.toCSV();

            const csvpath = pathlib.join(this._c.server.html, 'ctorreport');
            mkdirp(csvpath, () => {
                const filename = "report-" + this.type + "-" + Math.random().toString(16).substring(2) + "-" + dateformat(new Date(), 'dd-mm-yyyy-HH-MM') + ".csv";
                
                fs.writeFile(pathlib.join(csvpath, filename), csvstring, { encoding : 'utf8' }, () => {
                    const csvurl = this._c.server.url + '/ctorreport/' + filename;

                    done({ data : arr, csv : csvurl });
                });
            });
        });
    }
}

module.exports = ContractorReport;
