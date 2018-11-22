import { Component, h } from "preact";
import { castNotification } from "../../layout/notifications";
import { SelectField, ButtonWorker, CheckboxField, DatePicker } from "../../widgets/form";

import API from "../../data/api";
import Modal from "../../widgets/modal";

const now = new Date();

class ReportFieldWrapper extends Component {
    static get defaultPresets() {
        return [
            { text : "Year-to-date", value : "ytd", fields : {
                startdate : new Date(now.getFullYear(), 0, 1, 0, 0, 0),
                enddate : now
            } }, 
            {
              text : "Month-to-date", value : "mtd", fields : {
                startdate : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0),
                enddate : now
            } },
            {
              text : "Quarter-to-date", value : "qtd", fields : {
                startdate : new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1, 0, 0, 0),
                enddate : now
            } },
            { text : "Last year", value : "lastyear", fields : {
                startdate : new Date(now.getFullYear() -1 , 0, 1, 0, 0, 0),
                enddate : new Date(now.getFullYear() - 1, 11, 31, 0, 0, 0)
            } }, 
        ];
    }

    constructor(props) {
        super(props);
        this.state = {
            presets : ReportFieldWrapper.defaultPresets,
            filters : {
                startdate : new Date(now.getFullYear(), 0, 1, 0, 0, 0),
                enddate : now
            },
            reporttype : "contractors",
            currencies : []
        };
    }

    componentDidMount() {
        API.get('/money/currencies', {}, (err, { currencies }, r) => {
            this.setState({ currencies });
        });
    }

    selectPreset(name, value) {
        const preset = this.state.presets.find(x => x.value == value);
        this.setState({
            filters : Object.assign({...this.state.filters}, preset.fields)
        })
    }

    submitClicked(done) {
        this.props.onSubmit({
            filters : this.state.filters,
            reporttype : this.state.reporttype
        }, done);
    }

    reportTypeChanged(name, value) {
        this.setState({ reporttype : value })
    }
    
    fieldChanged(name, value) {
        const filters = this.state.filters;
        filters[name] = value;
        this.setState({
            filters : {...filters}
        });
    }

    render() {
        return (
            <div class="report-fields-form">
                <SelectField placeholder="Report preset" options={this.state.presets} name="preset" initialValue="ytd" onChange={this.selectPreset.bind(this)} />
                <hr />

                <div class="report-date-fields">
                    <DatePicker onChange={this.fieldChanged.bind(this)} enableTime={false} defaultDate={this.state.filters.startdate} value={this.state.filters.startdate} dateformat="Y-m-d" placeholder="Start date" name="startdate" />
                    <DatePicker onChange={this.fieldChanged.bind(this)} enableTime={false} defaultDate={this.state.filters.enddate} value={this.state.filters.enddate} dateformat="Y-m-d" placeholder="End date" name="enddate" />
                </div>
                <SelectField onChange={this.fieldChanged.bind(this)} placeholder="Currency" value={this.state.filters.currency} options={[
                    { text : "All", value : "" },
                    ...this.state.currencies.map(x => ({ text : x.displayname, value : x.code }))
                ]} name="currency" />

                <hr />

                <SelectField placeholder="Report type" onChange={this.reportTypeChanged.bind(this)} name="reporttype" value={this.state.reporttype} options={[
                    { text : "Grouped by contractors", value : "contractors" },
                    { text : "Grouped by date", value : "date" },
                    { text : "List of invoices", value : "invoices" }
                ]} />

                <div>
                    <ButtonWorker type="outline" theme="blue" text="Generate" work={this.submitClicked.bind(this)} />
                </div>
            </div>
        );
    }
};

class ReportView extends Component {
    render() {
        if (!this.state.report) {
            return (
                <div class="report-viewer template-viewer">
                    <div class="template-message">
                        <i class="fal fa-file-invoice-dollar money-svg"></i>
                        <h3>Contractor report generator</h3>
                        <p>Use the sidebar to generate a report.</p>
                    </div>
                </div>
            )
        }

        return (
            <div class="report-viewer">

            </div>
        )
    }
};

export default class ReportGenerator extends Component {
    constructor(props) {
        super(props);
        this.state = {
            report : undefined
        }
    }
    
    componentDidMount() {
        
    }

    onFormSubmit({ filters, reporttype }, done) {
        API.get('/contractorsreports/generate/' + reporttype, { filters }, (err, resp, r) => {
            done();
        });
    }
    
    render() {
        return (
            <div class="report-full-page">
                <div class="report-fields-side">
                    <ReportFieldWrapper onSubmit={this.onFormSubmit.bind(this)} />
                </div>
                <div class="report-viewer-side">
                    <ReportView report={this.state.report} />
                </div>
            </div>
        );
    }
}
