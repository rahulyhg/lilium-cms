import { h, Component } from 'preact'
import { ButtonWorker, EditableText } from '../../widgets/form';
import dateformat from 'dateformat';

/**
 * Extracts the date part of an ISO datetime string
 * @param {string} date ISO date string to format
 */
const formatDate = date => {
    return date ? dateformat(new Date(date), 'yyyy-mm-dd') : '';
}

export const PendingPaymentCard = props => (
    <div className={`pending-payment-card ${props.selected ? 'selected': ''}`} onClick={() => { props.onClick(props.contractor._id) }}>
        <SelectionBox onClick={props.toggleSelected.bind(this, props.contractor._id)} />
        <div className='contractor-info'>
            <img src={props.contractor.avatarURL} alt="" className='contractor-avatar' />
            <div>
                <h4 className='contractor-name'>{props.contractor.displayname}</h4>
                <p className='payment-text-detail'>{props.contractor.owed} {props.contractor.currency.toUpperCase()} for {props.contractor.articles.length} articles</p>
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

export const PaymentNothingSelected = props => (
    <div class="payment-nothing-selected report-viewer template-viewer">
        <div class="template-message">
            <i class="fal fa-money-check money-svg"></i>
            <h3>Contractor payment management</h3>
            <p>Select one or multiple contractors in the sidebar.</p>
        </div>
    </div>
);

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
        if (props.contractorPayment) {
            this.setState({ contractorPayment: props.contractorPayment });
        }
    }

    render(props, state) {
        const paymentTextDetail = `Owed ${props.contractorPayment.owed} ${props.contractorPayment.currency} for ${props.contractorPayment.articles.length} articles`;
        const paymentPeriod = state.contractorPayment.articles.length > 1 ? 
            `From ${formatDate(state.contractorPayment.articles[0].date)} to ${formatDate(state.contractorPayment.articles[state.contractorPayment.articles.length - 1].date)}` : 
            `For ${formatDate(state.contractorPayment.articles[0].date)}`;

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
                        <ButtonWorker text={`Pay ${props.contractorPayment.owed} ${props.contractorPayment.currency.toUpperCase()}`} theme='purple' type='fill'
                                        work={props.payContractors.bind(this)} sync={true} />
                    </div>
                </div>

                <PaymentArticlesSummary contractor={props.contractorPayment} changeArticleWorth={this.props.changeArticleWorth.bind(this)} />
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
            <div class="pad10">
                <div className="card payment-summary">
                    {
                        props.displayContractorInfo ? (
                            <div className='contractor-info-multi-item'>
                                <img src={props.contractor.avatarURL} />
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
                                    <td>
                                        <EditableText initialValue={article.worth} name='worth' type='number' min={0} defaultValue={0}
                                                         onChange={this.props.changeArticleWorth.bind(this, this.props.contractor._id, article._id)} />
                                    </td>
                                </tr>
                            ))
                        }
                    </table>
                </div>
            </div>
        );
    }
}

class PaymentTotal extends Component {
    render(props) {
        return props.total ? (
            <div class="payment-total">
                {props.total} {props.currency.toUpperCase()}
            </div>
        ) : null;
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
                    <h1>{props.contractorPayments.length} contractors selected</h1>

                    <div class="payment-totals">
                        <PaymentTotal total={props.totalCAD} currency="CAD" />
                        <PaymentTotal total={props.totalUSD} currency="USD" />
                    </div>

                    <div class="payment-avatar-list">
                        {
                            props.contractorPayments.map(x => (
                                <img src={x.avatarURL} title={x.displayname + ", paid in " + (x.currency.toUpperCase())} class="payment-multi-thumbnail" />
                            ))
                        }
                    </div>

                    <ButtonWorker text={`Pay ${props.contractorPayments.length} contractors`} theme='purple' type='fill' work={props.payContractors.bind(this)} sync={true} />                    
                </div>
                <div id="payment-breakdown-list">
                    {
                        props.contractorPayments.map(contractor => (
                            <PaymentArticlesSummary contractor={contractor} key={contractor._id} changeArticleWorth={this.props.changeArticleWorth.bind(this)} displayContractorInfo />
                        ))
                    }
                </div>
            </div>
        );
    }
}
