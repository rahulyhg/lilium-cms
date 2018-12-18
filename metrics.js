const METRICS = {};

class Metric {
    constructor(displayname, unit, type) {
        this.displayname = displayname || "Unknown metric";
        this.unit = unit || "unit";
        this.type = type || "count";

        this.reset();
    }

    reset() {
        this.oldValue = this.value;

        switch (this.type) {
            case "deep":
                this.value = {};
                break;

            case "array":
                this.values = [];
                this.value = 0;
                break;

            case "avg":
                this.oldValue = this.value;
                this.value = [];

            case "count": 
            default: 
                this.oldValue = this.value;
                this.value = 0;
        }

    }

    setValue(value) {
        this.value = value;
    }

    toString() {
        return this.displayname + " " + this.unit;
    }
}

class Metrics {
    create(metric, displayname, unit, type) {
        METRICS[metric] = new Metric(displayname, unit, type);
    }

    setDeep(metric, key, value) {
        METRICS[metric].value[key] = value;
    }

    plusDeep(metric, key) {
        METRICS[metric].value[key]++;
    }

    minusDeep(metric, key) {
        METRICS[metric].value[key]--;
    }

    plus(metric) {
        METRICS[metric].value++;
    }

    minus(metric) {
        METRICS[metric].value--;
    }

    push(metric, item) {
        METRICS[metric].push(item);
    }

    pushAvg(metric, value) {
        const m = METRICS[metric];
        m.values.push(value);
        m.value = m.values.reduce((acc, cur) => acc + cur) / m.values.length;
    }

    reset(metric) {
        METRICS[metric].reset();
    }

    set(metric, value) {
        METRICS[metric].setValue(value);
    }

    get(metric) {
        return METRICS[metric];
    }

    report() {
        return METRICS;
    }

    livevar(cli, levels, params, sendback) {
        if (!cli.hasRight('admin')) {
            return cli.refuse();
        }

        if (levels[0] == "get") {
            sendback({ metric : METRICS[levels[1]] });
        } else if (levels[0] == "dump") {
            sendback({ metrics : METRICS });
        } else {
            cli.throwHTTP(404, "Undefined top level", true);
        }
    }
}

module.exports = new Metrics();
