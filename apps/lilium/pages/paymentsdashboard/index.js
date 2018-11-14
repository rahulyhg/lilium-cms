import { h, Component } from 'preact'
import { TabView, Tab } from '../../widgets/tabview';
import { ButtonWorker, TextField } from '../../widgets/form';
import API from '../../data/api';
import Modal from '../../widgets/modal';
import { castNotification } from '../../layout/notifications';

/**
 * Extracts the date part of an ISO datetime string
 * @param {string} date ISO date string to format
 */
const formatDate = date => {
    return date ?  date.substring(0, 10) : '';
}

export default class PaymentDashboard extends Component {
    constructor(props) {
        super(props);
        this.token2fa;
        this.state = {
            pendingPayments: [], selectedPayments: [],
            paymentModalVisible: false
        }
    }
    
    componentDidMount() {
        API.get('/contractorspayments/management/pending', {}, (err, data, r) => {
            if (r.status == 200) {
                this.setState({ pendingPayments: data.contractors.filter(x => !x.isBeingPaid), selectedPayments: [data.contractors[0] || undefined] });
            } else {
                log('PaymentDashboard', 'Error fetching pending payments', 'error');
            }
        });
    }


    static calculateTotalPayout(payments) {
        const payout = { totalCAD: 0, totalUSD: 0 };
        if (!payments) return payout;

        payout.totalCAD = payments.filter(c => c.currency && c.currency.toUpperCase() == 'CAD').reduce((a, b) => a + parseInt(b.owed), 0);
        payout.totalUSD = payments.filter(c => c.currency && c.currency.toUpperCase() == 'USD').reduce((a, b) => a + parseInt(b.owed), 0);

        return payout;
    }

    toggleSelected(contractorId) {
        const contractorPayment = this.state.pendingPayments.find(p => p._id == contractorId);
        if (contractorPayment) {
            const i = this.state.selectedPayments.findIndex(p => p == contractorPayment)
            const selectedPayments = this.state.selectedPayments;
            if (i != -1) {
                // Disallow 'unselect' when only one is selected
                if (this.state.selectedPayments.length > 1) {
                    selectedPayments.splice(i, 1);
                    const payout = PaymentDashboard.calculateTotalPayout(selectedPayments);
                    console.log(payout);
                    
                    this.setState({ selectedPayments, ...payout });
                }
            } else {
                selectedPayments.push(contractorPayment);
                const payout = PaymentDashboard.calculateTotalPayout(selectedPayments);
                this.setState({ selectedPayments, ...payout });
            }
        }
    }

    selectOne(contractorId) {
        const contractorPayment = this.state.pendingPayments.find(p => p._id == contractorId);
        if (contractorPayment) {
            this.setState({ selectedPayments: [ contractorPayment ] });
        }
    }

    selectAll() {
        if (this.state.selectedPayments.length != this.state.pendingPayments.length) {
            const selectedPayments = [...this.state.pendingPayments];
            this.setState({ selectedPayments });
        } else {
            this.setState({ selectedPayments: [] });
        }        
    }

    castPaymentModal() {
        this.setState({ paymentModalVisible: true });
    }

    payContractors(done) {
        if (this.state.selectedPayments) {
            API.post('/contractorspayments/generate/', { ids: this.state.selectedPayments.map(c => c._id), secret: this.token2fa }, (err, data, r) => {
                if (r.status == 200) {
                    let pendingPayments = this.state.pendingPayments;
                    pendingPayments = pendingPayments.filter(p => this.state.selectedPayments.findIndex(x => x._id == p._id) < 0);
                    this.setState({ pendingPayments, selectedPayments: [pendingPayments[0]] || undefined, paymentModalVisible: false });
                    done && done();
                    castNotification({
                        title: 'Payments sent to Stripe',
                        message: 'Payments sent to Stripe and are now pending',
                        type: 'info'
                    })
                } else if (r.status == 403) {
                    castNotification({
                        title: 'Forbidden, 2FA authentication failed',
                        message: 'The two factor authentication failed, make sure that you have 2FA enabled and that you provide the code provided by your 2FA application on your smartphone. Visit your profile page to enable 2FA',
                        type: 'error'
                    });
                } else {
                    castNotification({
                        title: 'Error while paying contractors',
                        type: 'error'
                    });
                }

                done && done();
            });
        }
    }

    render(props, state) {
        console.log(state);
        
        return (
            <TabView>
                <Tab title='Pending Payments'>
                    <Modal visible={state.paymentModalVisible} title='Pay Contractors'>
                        <h2>Pay contractors</h2>
                        <p>
                            You are about to pay <b>{`${state.totalCAD} CAD + ${state.totalUSD} USD to ${state.selectedPayments.length} contractors`}</b>.
                            In order to proceed, please provide you <b>two factor authentication token</b>.
                        </p>
                        <TextField placeholder='Two Factor Authentication token' onChange={(name, val) => { this.token2fa = val; }} />
                        <ButtonWorker text='Pay' theme='purple' type='fill' work={this.payContractors.bind(this)} />
                        <ButtonWorker text='Cancel' theme='red' type='outline' work={() => { this.setState({ paymentModalVisible: false }); }} sync={true} />
                    </Modal>
                    <div id="pending-payment-overviews">
                        <div id="pending-payments-list">
                            <div id="list-controls">
                                <SelectionBox onClick={this.selectAll.bind(this)} />
                                <h4>Select All</h4>
                            </div>
                            <div className="scroll">
                                {
                                    state.pendingPayments.map(contractor => (
                                        <PendingPaymentCard contractor={contractor} key={contractor._id} selected={!!state.selectedPayments.find(p => p._id == contractor._id)}
                                                                onClick={this.selectOne.bind(this)} toggleSelected={this.toggleSelected.bind(this, contractor._id)} />
                                    ))
                                }
                            </div>
                        </div>
                        <div id="payment-details-column">
                            {
                                state.selectedPayments.length > 1 ? (
                                    <PaymentsBreakdown contractorPayments={state.selectedPayments} payContractors={this.castPaymentModal.bind(this)}
                                                        totalCAD={state.totalCAD} totalUSD={state.totalUSD} />
                                ) : (
                                    state.selectedPayments.length != 0 ? (
                                        <PaymentDetails contractorPayment={state.selectedPayments[0]} payContractors={this.castPaymentModal.bind(this)} />
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

const PendingPaymentCard = props => (
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
)

const SelectionBox = props => (
    <div className="selection-box-wrapper">
        <div role='checkbox' className="payment-selection-boc" onClick={e => { e.stopPropagation(); props.onClick && props.onClick(); }}></div>
    </div>
)

class PaymentDetails extends Component {
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

export class PaymentArticlesSummary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            
        }
    }
    
    componentDidMount() {
        
    }
    
    remove(done) {

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

class PaymentsBreakdown extends Component {
    constructor(props) {
        super(props);
    }

    componentWillReceiveProps(props) {
        if (this.props.contractorPayments) {
            this.setState({ contractorPayments: props.contractorPayments });
        }
    }

    render(props, state) {
        console.log(props, state);
        
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
