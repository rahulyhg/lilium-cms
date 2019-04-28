const db = require('./db')
const config = require('./config')

const NETWORK_TABLE = ["entities", "cakepops", "fix", "decorations", "feed", "roles"];

class ReportGenerator {
    constructor(single) {
        this.report = single
        this.smap = ReportGenerator.createSMap();

        if (NETWORK_TABLE.includes(this.report.maincollection)) {
            this.report.site = config.default().id;
        }
        this.build();
    }

    static createSMap() {
        const date = new Date();
        const now = date.getTime();
        const day = 1000 * 60 * 60 * 24;

        const firstDayOfMonthDate = new Date(date.getFullYear(), date.getMonth(), 1);
        const firstDayOfYearDate = new Date(date.getFullYear(), 0, 1);
        const monthAgoDate = new Date(date.getFullYear(), date.getMonth() - 1);
        const yearAgoDate = new Date(date.getFullYear() - 1);

        const firstDayOfMonth = firstDayOfMonthDate.getTime();
        const firstDayOfYear = firstDayOfYearDate.getTime();
        const monthAgo = monthAgoDate.getTime();
        const yearAgo = yearAgoDate.getTime();

        return {
            "true" : true,
            "false" : false,

            DESC : -1, 
            ASC : 1,
            
            "24ago" : now - day, "24agoDate" : new Date(now - day),
            today : now - (now % day), todayDate : new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            yesterday : now - (now % day) - day, yesterdayDate : new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1),

            now, nowDate : date, 
            firstDayOfMonth, firstDayOfMonthDate, 
            firstDayOfYear, firstDayOfYearDate, 
            monthAgo, monthAgoDate,
            yearAgo, yearAgoDate
        };
    }

    parseField(value) {
        return !isNaN(value) ? parseInt(value) : this.smap.hasOwnProperty(value) ? this.smap[value] : value;
    }

    feedOperator(key, value) {
        if (!value || !value.trim()) {
            return this.parseField(key);
        }

        const operation = {};
        const keys = key.split(',');
        const values = value.split(',');

        for (let i = 0; i < keys.length; i++) {
            let val = values[i];
            if (val.includes(':')) {
                let split = val.split('|');
                val = {};

                split.forEach(kv => {
                    kv = kv.split(':');
                    val[kv[0]] = this.parseField(kv[1]); 
                });
            } else {
                val = this.parseField(val);
            }

            operation[keys[i]] = val; 
        }

        return operation;
    }

    build() {
        this.join = this.report.aggregation.map(x => {
            return {
                [x.method] : this.feedOperator(x.operator, x.value)
            };
        });

        const pFields = this.report.projection.split(',');
        const projection = { $project : { _id : 0} };
        pFields.forEach(f => {
            projection.$project[f] = 1
        });

        this.join.push(projection);
        return this;
    }

    generate(send) {
        db.rawCollection(this.report.site, this.report.maincollection, {}, (err, col) => {
            col.count({}, (err, total) => {
                col.aggregate(this.join, (err, cur) => cur.toArray((err, arr) => send(arr, total)));
            });
        });
    }
}

module.exports = ReportGenerator;
