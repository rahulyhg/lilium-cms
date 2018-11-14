import { h, Component } from 'preact'
import { TabView, Tab } from '../../widgets/tabview';
import { ButtonWorker, TextField } from '../../widgets/form';
import API from '../../data/api';
import Modal from '../../widgets/modal';
import { castNotification } from '../../layout/notifications';
import { Link } from '../../routing/link';
import { SelectionBox, PendingPaymentCard, PaymentDetails, PaymentsBreakdown,  } from './pendingpayments';

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
            const selectedPayments = [contractorPayment];
            const payout = PaymentDashboard.calculateTotalPayout(selectedPayments);
            this.setState({ selectedPayments, ...payout });
        }
    }

    selectAll() {
        if (this.state.selectedPayments.length != this.state.pendingPayments.length) {
            const selectedPayments = [...this.state.pendingPayments];
            const payout = PaymentDashboard.calculateTotalPayout(selectedPayments);
            this.setState({ selectedPayments, ...payout });
        } else {
            this.setState({ selectedPayments: [], totalCAD: 0, totalUSD: 0 });
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
                    this.setState({ pendingPayments, selectedPayments: [pendingPayments[0]] || [], paymentModalVisible: false });
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
                            You are about to pay <b>{`${state.totalCAD} CAD + ${state.totalUSD} USD to ${state.selectedPayments.length} contractor(s)`}</b>.
                            In order to proceed, please provide you <Link href='/me'><b>two factor authentication token</b></Link>.
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
                                        <h4 id='no-selected-payment' className='card'>No selected payment</h4>
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
