import { h, Component } from 'preact'
import { BigList } from '../../widgets/biglist';
import { getSession } from '../../data/cache';
import dateformat from 'dateformat';

export class InvoicesHistory extends Component {
    constructor(props) {
        super(props);
        this.state = {
            
        }
    }

    static get TOOLBAR_CONFIG() {
        return {
            id : "invoiceshistorybiglistfilters",
            title : "Filters",
            fields : [
                { type : "text", name : "number", title : "Search" }
            ]
        };
    }
    
    render() {
        return (
            <div id="invoices-history">
                <BigList endpoint='/contractorspayments/management/invoices' listitem={InvoiceHistoryItem} toolbar={InvoicesHistory.TOOLBAR_CONFIG}
                        liststyle={{ display: 'block', overflow: 'scroll', height: '80%' }} loadmoreButton={LoadMoreInvoices} />
            </div>
        );
    }
}

const LoadMoreInvoices = props => (
    <div className="button outline blue" onClick={props.onClick}>Load More</div>
);

class InvoiceHistoryItem extends Component {
    constructor(props) {
        super(props);
    }

    componentWillMount() {
        this.contractor = getSession("entities").find(x => x._id == this.props.item.to) || {
            displayname : "Inactive user",
            avatarURL : "/static/media/lmllogo.png"
        };
    }

    render(props, state) {
        const status = props.item.valid ? 'valid' : 'invalid';
        return (
            <div className="invoice">
                <div className="invoice-number">
                    <a href={location.host + '/contractorinvoice/' + props.item.number} target='_blank'>
                        <span>{props.item.number}</span>
                    </a>
                </div>
                <div className="invoice-contractor">
                    <img src={this.contractor.avatarURL} alt=""/>
                    <span className="contractor-name">{this.contractor.displayname}</span>
                </div>
                <span className="invoice-total">{props.item.total + ' ' + props.item.currency.toUpperCase()}</span>
                <span className="invoice-date">{dateformat(this.props.item.date, 'mmmm, dd yyyy - HH:MM')}</span>
                <span className={"invoice-status " + status}>{status}</span>
            </div>
        );
    }
}
