import { h, Component } from 'preact'
import { TabView, Tab } from '../../widgets/tabview';
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
                                    <PendingPaymentCard {...contractor} key={contractor._id} selected={!!state.selectedPayments.find(p => p._id == contractor._id)}
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
                                        <PaymentDetails {...state.selectedPayments[0]} />
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

class PendingPaymentCard extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }
    
    componentDidMount() {
        
    }
    
    render(props) {
        return (
            <div className={`pending-payment-card ${props.selected ? 'selected': ''}`} onClick={() => { props.onClick(props._id) }}>
                <div className="contractor-info">
                    <img src={props.avatarURL} alt="" className='contractor-avatar' />
                    <h4 className='contractor-name'>{props.displayname}</h4>
                </div>
                <div className="payment-info">
                    <p className='payment-text-detail'>{`Owed ${props.owed} ${props.currency} for ${props.articles.length} articles`}</p>
                </div>
                <div role='checkbox' className="payment-selection-boc" onClick={e => { e.stopPropagation(); props.toggleSelected(props._id); }}></div>
            </div>
        );
    }
}

class PaymentDetails extends Component {
    constructor(props) {
        super(props);
        this.state = {
            payment: props.payment || {}
        }
    }
    
    componentDidMount() {
        
    }
    
    componentWillReceiveProps(props) {
        if (props.payment) {
            this.setState({ payment: props.payment });
        }
    }

    render() {
        return (
            <div>Payment Details</div>
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
