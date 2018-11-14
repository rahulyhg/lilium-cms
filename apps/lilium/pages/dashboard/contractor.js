import { h, Component } from "preact";
import { Spinner } from '../../layout/loading';
import { AnimeNumber } from '../../widgets/animenumber';
import { ChartGraph } from '../../widgets/chart';
import API from '../../data/api';
import dateformat from 'dateformat';

class ContractorHistoricalInvoiceItem extends Component {
    onClick() {
        window.open("/contractorinvoice/" + this.props.invoice.number);
    }

    render(props) {
        return (
            <div class="dashboard-contractor-invoice-list-item" onClick={this.onClick.bind(this)}>
                <div class="dashboard-contractor-invoice-bill-icon">
                    <i class="fal fa-money-bill-alt"></i>
                </div>
                <div class="dashboard-contractor-invoice-item-details">
                    <b>{ props.invoice.total } { props.invoice.currency.toUpperCase() }</b>
                    <small>{ dateformat(new Date(props.invoice.at), 'mmmm dd, yyyy') }</small>
                </div>
            </div>
        );
    }
}

class ContractorHistorical extends Component {
    componentDidMount() {
        API.get("/contractorspayments/invoices", {}, (err, json, r) => {
            this.setState({ history : json });
        });

        API.get("/contractorspayments/nextpayout", {}, (err, json, r) => {
            this.setState({ nextpayout : json });
        });
    }

    render() {
        if (!this.state.history) {
            return (<Spinner centered={true} />)
        }

        return (
            <div>
                <div style={{ display: 'flex', marginBottom: 10 }}>
                    <div class="dashboard-contractor-triple-flex dashboard-ponglink-graph-wrap">
                        <h2>Next payout amount</h2>
                        <span>{ this.state.nextpayout ? (<AnimeNumber number={this.state.nextpayout.amount} duration={600} unit={" " + (liliumcms.session.currency || "CAD")} />) : <Spinner centered={true} /> }</span>
                    </div>
                    <div class="dashboard-contractor-triple-flex dashboard-ponglink-graph-wrap">
                        <h2>Pending articles</h2>
                        <span>{ this.state.nextpayout ? (<AnimeNumber number={this.state.nextpayout.totalposts} duration={600} unit={" posts"} />) : <Spinner centered={true} /> }</span>
                    </div>
                    <div class="dashboard-contractor-triple-flex dashboard-ponglink-graph-wrap">
                        <h2>Year to date</h2>
                        <span><AnimeNumber duration={600} number={this.state.history.filter(x => x.at > new Date(new Date().getFullYear(), 0, 1)).reduce((cur, acc) => cur + acc.total, 0)} unit={" " + (liliumcms.session.currency || "CAD")} /></span>
                    </div>
                </div>
                <div style={{ display: 'flex' }}>
                   <div class="dashboard-ponglink-graph-wrap" style={{ flexGrow : 1, marginRight : 20 }}>
                       <h2>Payout history</h2>
                       <div class="dashboard-payout-chart-wrapper" style={{ height: 350 }}>
                           <ChartGraph nowrap={true} chart={{
                               type : 'line',
                               data : {
                                   labels : this.state.history.map(x => dateformat(new Date(x.at), 'dd/mm/yy')),
                                   datasets : [{
                                       data : this.state.history.map(x => x.total),
                                       label : "Invoice total amount",
                                       backgroundColor : "#b48efb99"
                                   }]
                               },
                               options : {
                                   responsive : true,
                                   maintainAspectRatio: false,
                               }
                           }} />
                       </div>
                   </div>
                   <div class="dashboard-ponglink-graph-wrap" style={{ flex : '0 0 320px' }}>
                       <h2>Payments</h2>
                       <div class="" style={{ height: 350, overflowY: 'auto' }}>
                           {
                               this.state.history.map(invoice => (
                                   <ContractorHistoricalInvoiceItem invoice={invoice} />
                               ))
                           }
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export class ContractorTab extends Component {
    static get tabprops() {
        return {
            text : "Payments",
            right : "contractor",
            id : "contractor-payment"
        }
    }

    constructor(props) {
        super(props);
        this.state = {

        };
    }

    componentDidMount() {

    }

    render() {
        return (
            <div>
                <ContractorHistorical />
            </div>
        );
    }
}
