import { h, Component } from 'preact'
import { ButtonWorker, TextField } from '../../widgets/form';
import Modal from '../../widgets/modal';
import { Link } from '../../routing/link';
import { PendingPaymentCard, PaymentDetails, PaymentsBreakdown,  } from './pendingpayments';
import API from '../../data/api';
import { castNotification } from '../../layout/notifications';

export class PaymentsManagement extends Component {
    constructor(props) {
        super(props);
        this.token2fa;
        this.state = {
            pendingPayments: [], selectedPayments: [],
            paymentModalVisible: false,
            totalCAD: 0, totalUSD: 0
        }
    }
    
    static calculateTotalPayout(payments) {
        console.log('calculate payout:', payments);
        
        const payout = { totalCAD: 0, totalUSD: 0 };
        if (!payments || payments.length == 0) return payout;

        payout.totalCAD = payments.filter(c => c.currency && c.currency.toUpperCase() == 'CAD').reduce((a, b) => a + parseInt(b.owed), 0);
        payout.totalUSD = payments.filter(c => c.currency && c.currency.toUpperCase() == 'USD').reduce((a, b) => a + parseInt(b.owed), 0);

        return payout;
    }

    componentDidMount() {
        API.get('/contractorspayments/management/pending', {}, (err, data, r) => {
            if (r.status == 200) {
                const pendingPayments = data.contractors.filter(x => !x.beingPaid && x.stripeuserid);
                if (pendingPayments.length) {
                    const selectedPayments = [pendingPayments[0]];
                    this.setState({ pendingPayments, selectedPayments });
                }
            } else {
                log('PaymentDashboard', 'Error fetching pending payments', 'error');
            }
        });
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
                    this.setState({ selectedPayments });
                }
            } else {
                selectedPayments.push(contractorPayment);
                this.setState({ selectedPayments });
            }
        }
    }

    selectOne(contractorId) {
        const contractorPayment = this.state.pendingPayments.find(p => p._id == contractorId);
        if (contractorPayment) {
            const selectedPayments = [contractorPayment];
            this.setState({ selectedPayments });
        }
    }

    selectAll() {
        if (this.state.selectedPayments.length != this.state.pendingPayments.length) {
            const selectedPayments = [...this.state.pendingPayments];
            this.setState({ selectedPayments });
        } else {
            this.setState({ selectedPayments: [], totalCAD: 0, totalUSD: 0 });
        }
    }

    castPaymentModal() {
        this.setState({ paymentModalVisible: true });
    }

    payContractors(done) {
        if (this.state.selectedPayments) {
            API.post('/contractorspayments/generate/', { ids: this.state.selectedPayments.map(c => ({ id: c._id, currency: c.currency }) ), secret: this.token2fa }, (err, data, r) => {
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
        const payout = PaymentsManagement.calculateTotalPayout(state.selectedPayments);
        return (
            <div id="pending-payment-overviews">
                <Modal visible={state.paymentModalVisible} title='Pay Contractors'>
                    <h2>Pay contractors</h2>
                    <p>
                        You are about to pay <b>{`${payout.totalCAD} CAD + ${payout.totalUSD} USD to ${state.selectedPayments.length} contractor(s)`}</b>.
                        In order to proceed, please provide you <Link href='/me'><b>two factor authentication token</b></Link>.
                    </p>
                    <TextField placeholder='Two Factor Authentication token' onChange={(name, val) => { this.token2fa = val; }} />
                    <ButtonWorker text='Pay' theme='purple' type='fill' work={this.payContractors.bind(this)} />
                    <ButtonWorker text='Cancel' theme='red' type='outline' work={() => { this.setState({ paymentModalVisible: false }); }} sync={true} />
                </Modal>
                <div id="pending-payments-list">
                    <div id="list-controls">
                        <ButtonWorker text='Select all' sync={true} work={this.selectAll.bind(this)} theme='blue' type='outline' />
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
                                                totalCAD={payout.totalCAD} totalUSD={payout.totalUSD} />
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
        );
    }
}