import { h, Component } from 'preact'
import { ButtonWorker } from '../../widgets/form';

/**
 * Extracts the date part of an ISO datetime string
 * @param {string} date ISO date string to format
 */
const formatDate = date => {
    return date ?  date.substring(0, 10) : '';
}

export const PendingPaymentCard = props => (
    <div className={`pending-payment-card ${props.selected ? 'selected': ''}`} onClick={() => { props.onClick(props.contractor._id) }}>
        <SelectionBox onClick={props.toggleSelected.bind(this, props.contractor._id)} />
        <div className='contractor-info'>
            <img src={props.contractor.avatarURL} alt="" className='contractor-avatar' />
            <div>
                <h4 className='contractor-name'>{props.contractor.displayname}</h4>
                <p className='payment-text-detail'>{`Owed ${props.contractor.owed} ${props.contractor.currency} for ${props.contractor.articles.length} articles`}</p>
            </div>
        </div>
    </div>
);

export const SelectionBox = props => (
    <div className="selection-box-wrapper">
        <div role='checkbox' className="payment-selection-boc" onClick={e => { e.stopPropagation(); props.onClick && props.onClick(); }}>
            <i className="fa fa-check"></i>
        </div>
    </div>
)

export class PaymentDetails extends Component {
    constructor(props) {
        super(props);
        const contractorPayment = props.contractorPayment;
        contractorPayment.articles.sort((a, b) => a < b);
        this.state = {
            contractorPayment
        }
    }

    componentWillReceiveProps(props) {
        if (props.payment) {
            this.setState({ payment: props.contractorPayment });
        }
    }

    render(props, state) {
        const paymentTextDetail = `Owed ${props.contractorPayment.owed} ${props.contractorPayment.currency} for ${props.contractorPayment.articles.length} articles`;
        const paymentPeriod = `From ${formatDate(state.contractorPayment.articles[0].date)} to ${formatDate(state.contractorPayment.articles[state.contractorPayment.articles.length - 1].date)}`;
        return (
            <div id="payment-details">
                <div id="payment-details-header">
                    <img src={props.contractorPayment.avatarURL} alt="" className='contractor-avatar' />
                    <div id="detailled-payment-info">
                        <h2 className='contractor-name'>{props.contractorPayment.displayname}</h2>
                        <p className='payment-text-detail'>{paymentTextDetail}</p>
                        <p id="payment-period">{paymentPeriod}</p>
                    </div>
                    <div id="pay-individual">
                        <ButtonWorker text={`Pay ${props.contractorPayment.owed} ${props.contractorPayment.currency}`} theme='purple' type='fill'
                                        work={props.payContractors.bind(this)} sync={true} />
                    </div>
                </div>

                <PaymentArticlesSummary contractor={props.contractorPayment} />
            </div>
        );
    }
}

class PaymentArticlesSummary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            
        }
    }

    render(props, state) {
        return (
            <div className="card payment-summary">
                {
                    props.displayContractorInfo ? (
                        <div className='contractor-info small'>
                            <img src={props.contractor.avatarURL} alt="" className='contractor-avatar' />
                            <h2 className='contractor-name'>{props.contractor.displayname}</h2>
                        </div>
                    ) : null
                }
                <table className="articles-summary">
                    <tr>
                        <th>Headline</th>
                        <th>Pages</th>
                        <th>Date</th>
                        <th>{`Value (${props.contractor.currency})`}</th>
                    </tr>
                    {
                        props.contractor.articles.map(article => (
                            <tr>
                                <td title={article.title}>{article.title}</td>
                                <td>{article.pages}</td>
                                <td>{formatDate(article.date)}</td>
                                <td>{article.worth}</td>
                            </tr>
                        ))
                    }
                </table>
            </div>
        );
    }
}

export class PaymentsBreakdown extends Component {
    constructor(props) {
        super(props);
    }

    componentWillReceiveProps(newProps) {
        const newState = {};
        if (newProps.contractorPayments) newState.contractorPayments = newProps.contractorPayments;
        if (newProps.totalCAD) newState.totalCAD = newProps.totalCAD;
        if (newProps.totalUSD) newState.totalUSD = newProps.totalUSD;

        this.setState(newState);
    }

    render(props, state) {
        return (
            <div className="payments-breakdown">
                <div id="breakdown-header">
                    <div>
                        <h1>Total Payout:</h1>
                    </div>
                    <div id="total-cad">
                        <h1>{`${props.totalCAD} CAD`}</h1>
                    </div>
                    <div id="total-usd">
                        <h1>{`${props.totalUSD} USD`}</h1>      
                    </div>
                    <ButtonWorker text='Pay All' theme='purple' type='fill' work={props.payContractors.bind(this)} sync={true} />                    
                </div>
                <div id="payment-breakdown-list">
                    {
                        props.contractorPayments.map(contractor => (
                            <PaymentArticlesSummary contractor={contractor} key={contractor._id} displayContractorInfo />
                        ))
                    }
                </div>
            </div>
        );
    }
}
