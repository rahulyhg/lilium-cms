import { h, Component } from 'preact'
import { TabView, Tab } from '../../widgets/tabview';
import { ButtonWorker } from '../../widgets/form';
import API from '../../data/api';

export default class PaymentDashboard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            pendingPayments: [], selectedPayments: []
        }
    }
    
    componentDidMount() {
        API.get('/contractorspayments/management/pending', {}, (err, data, r) => {
            if (r.status == 200) {
                this.setState({ pendingPayments: data.contractors });
            } else {
                log('PaymentDashboard', 'Error fetching pending payments', 'error');
            }
        })
    }

    toggleSelected(contractorId) {
        const contractorPayment = this.state.pendingPayments.find(p => p._id == contractorId);
        if (contractorPayment) {
            const i = this.state.selectedPayments.findIndex(p => p == contractorPayment)
            const selectedPayments = this.state.selectedPayments;
            if (i != -1) {
                selectedPayments.splice(i, 1);
                this.setState({ selectedPayments });
            } else {
                selectedPayments.push(contractorPayment);
                this.setState({ selectedPayments });
            }
        }
    }
    
    selectOne(contractorId) {
        const contractorPayment = this.state.pendingPayments.find(p => p._id == contractorId);
        if (contractorPayment) {
            this.setState({ selectedPayments: [ contractorPayment ] });
        }
    }

    render(props, state) {
        return (
            <TabView>
                <Tab title='Pending Payments'>
                    <div id="pending-payment-overviews">
                        <div id="pending-payments-list">
                            {
                                state.pendingPayments.map(contractor => (
                                    <PendingPaymentCard contractor={contractor} key={contractor._id} selected={!!state.selectedPayments.find(p => p._id == contractor._id)}
                                                           onClick={this.selectOne.bind(this)} toggleSelected={this.toggleSelected.bind(this)} />
                                ))
                            }
                        </div>
                        <div id="payment-details-column">
                            {
                                state.selectedPayments.length > 1 ? (
                                    <PaymentsBreakdown payments={state.selectedPayments} />
                                ) : (
                                    state.selectedPayments.length != 0 ? (
                                        <PaymentDetails contractorPayment={state.selectedPayments[0]} />
                                    ) : (
                                        <h4>No selected payment</h4>
                                    )
                                )
                            }
                        </div>
                    </div>
                </Tab>
                <Tab title='Credit Cards'>
                    <h1>Credit card management</h1>
                </Tab>
            </TabView>
        );
    }
}

const ContractorInfo = props => (
    <div className={`contractor-info ${props.big ? 'big' : 'small'}`}>
        <img src={props.contractor.avatarURL} alt="" className='contractor-avatar' />
        {
            props.big ? (
                <h2 className='contractor-name'>{props.contractor.displayname}</h2>
            ) : (
                <h4 className='contractor-name'>{props.contractor.displayname}</h4>
            )
        }
    </div>
)

class PendingPaymentCard extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }
    
    componentDidMount() {
        
    }
    
    render(props) {
        return (
            <div className={`pending-payment-card ${props.selected ? 'selected': ''}`} onClick={() => { props.onClick(props.contractor._id) }}>
                <ContractorInfo contractor={props.contractor} />
                <div className="payment-info">
                    <p className='payment-text-detail'>{`Owed ${props.contractor.owed} ${props.contractor.currency} for ${props.contractor.articles.length} articles`}</p>
                </div>
                <div role='checkbox' className="payment-selection-boc" onClick={e => { e.stopPropagation(); props.toggleSelected(props.contractor._id); }}></div>
            </div>
        );
    }
}

export class PaymentDetails extends Component {
    constructor(props) {
        super(props);
        const contractorPayment = props.contractorPayment;
        contractorPayment.articles.sort((a, b) => a < b);
        this.state = {
            contractorPayment
        }

        console.log(this.state);
    }
    
    componentDidMount() {
        
    }
    
    componentWillReceiveProps(props) {
        if (props.payment) {
            this.setState({ payment: props.contractorPayment });
        }
    }

    formatDate(date) {
        return date.substring(0, 10);
    }

    render(props, state) {
        return (
            <div id="payment-details">
                <div id="payment-details-header">
                    <img src={props.contractorPayment.avatarURL} alt="" className='contractor-avatar' />
                    <div id="detailled-payment-info">
                        <h2 className='contractor-name'>{props.contractorPayment.displayname}</h2>
                        <p className='payment-text-detail'>{`Owed ${props.contractorPayment.owed} ${props.contractorPayment.currency} for ${props.contractorPayment.articles.length} articles`}</p>
                        <p id="payment-period">{`From ${this.formatDate(state.contractorPayment.articles[0].date)} to ${this.formatDate(state.contractorPayment.articles[state.contractorPayment.articles.length - 1].date)}`}</p>
                    </div>
                    <div id="pay-individual">
                        <ButtonWorker text={`Pay ${props.contractorPayment.owed} ${props.contractorPayment.currency}`} theme='purple' type='fill' />
                    </div>
                </div>
            </div>
        );
    }
}

class PaymentsBreakdown extends Component {
    constructor(props) {
        super(props);
        this.state = {
            payments: props.payments || []
        }
    }

    componentWillReceiveProps(prosp) {
        if (this.props.payments) {
            this.setState({ payments: props.payment });
        }
    }
    
    render() {
        return (
            <div>Multiple payments</div>
        );
    }
}
