import { Component, h } from 'preact';
import { ChartGraph } from '../../widgets/chart';

function ReportEntry(props) {
    return (
        <tr>
            <td class="contractor-props-avatar-col">
                <img src={props.entry.to.avatarURL} />
                <span>{props.entry.to.displayname}</span>
            </td>
            <td>{props.entry.invoices} invoices</td>
            <td>{props.entry.total} {props.entry.currency.toUpperCase()}</td>
        </tr>
    );
}

export class ContractorReport extends Component {
    constructor(props) {
        super(props);
        this.state = {
            sortedByAmount : [...props.report.data].sort((a, b) => b.total - a.total),
            sortedByDisplayname : props.report.data,
            csvlink : props.report.csv
        };
    }

    componentWillReceiveProps(props) {
        this.setState({
            sortedByAmount : [...props.report.data].sort((a, b) => b.total - a.total),
            sortedByDisplayname : props.report.data,
            csvlink : props.report.csv
        });
    }

    sortTable(col) {
        let sortedByDisplayname; 
        
        switch (col) {
            case "a-z" : sortedByDisplayname = [...this.props.report.data]; break;
            case "inv" : sortedByDisplayname = [...this.state.sortedByDisplayname].sort((a, b) => b.invoices - a.invoices); break;
            case "tot" : sortedByDisplayname = [...this.state.sortedByDisplayname].sort((a, b) => b.total - a.total); break;
        }
        this.setState({
            sortedByDisplayname
        });
    }

    render() {
        return (
            <div>
                <a class="contractor-report-download button" href={this.state.csvlink}>Download as CSV</a>
                <h1>Report - Grouped by contractor</h1>
                <h2>Top paid contractors</h2>
                <div class="contractor-report-graph-card">
                    <ChartGraph nowrap={true} chart={{
                        type : 'bar', 
                        data : {
                            labels : this.state.sortedByAmount.map(x => x.to.displayname),
                            datasets : [
                                { 
                                    data : this.state.sortedByAmount.map(x => x.total), 
                                    label : "Total paid",
                                    backgroundColor : this.state.sortedByAmount.map((_, i) => "rgba(191, 121, 208, " + (i/this.state.sortedByAmount.length) + ")").reverse()
                                }
                            ]
                        },
                        options : {
                            responsive : true,
                            scales : {
                                xAxes : [{ display: false }]
                            }
                        }
                    }}/>
                </div>
                <h2>Contractors sorted by A-Z, grouped by currency</h2>
                <div>
                    <table class="contractor-report-table card">
                        <thead>
                            <tr>
                                <th onClick={this.sortTable.bind(this, 'a-z')}>Contractor</th>
                                <th onClick={this.sortTable.bind(this, 'inv')}>Number of invoices</th>
                                <th onClick={this.sortTable.bind(this, 'tot')}>Amount paid</th>
                            </tr>
                        </thead>
                        <tbody>
                            { this.state.sortedByDisplayname.map(entry => (<ReportEntry entry={entry} key={entry.to._id} />)) }
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
}
