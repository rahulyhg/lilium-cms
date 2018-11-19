import { h, Component } from 'preact';
import API from '../../data/api';
import Modal from '../../widgets/modal';
import { ButtonWorker } from '../../widgets/form';
import { CreditCard } from './creditcard';
import { CreditCardEdit } from './creditcardedit';
import { castNotification } from '../../layout/notifications';

export class CreditCardsManagement extends Component {
    constructor(props) {
        super(props);
        this.state = {
            deleteCardModalVisible: false,
            creditCards: [],
            selectedCard: undefined,
            inserting: false
        }
    }

    componentDidMount() {
        API.get('/creditcards', {}, (err, data, r) => {
            if (r.status == 200) {
                this.setState({ creditCards: data });
            }
        });
    }

    cardSelected(id) {
        const selectedCard = this.state.creditCards.find(cc => cc._id == id);
        this.setState({ selectedCard, inserting: false });
    }

    deleteSelectedCard(done) {
        API.delete('/creditcards/' + this.state.selectedCard._id, {}, (err, data, r) => {
            if (r.status == 200 && data.ok) {
                const creditCards = this.state.creditCards;
                const i = creditCards.findIndex(card => card._id == this.state.selectedCard._id);
                if (i >= 0) {
                    creditCards.splice(i, 1);
                    let newSelected;
                    if (i == creditCards.length - 1) {
                        newSelected = creditCards[i - 1];
                    } else {
                        newSelected = creditCards[i];
                    }
                    this.setState({creditCards, selectedCard: newSelected});
                }
                castNotification({
                    title: 'Credit Card Removed',
                    type: 'success'
                });
            }

            done && done();
        });
    }

    editSelectedCard(creditCard, done) {
        API.put('/creditcards/' + this.state.selectedCard._id, { ...creditCard }, (err, data, r) => {
            if (r.status == 200) {
                this.setState({ selectedCard: creditCard });
                castNotification({
                    title: 'Credit Card Modified',
                    type: 'success'
                });
            } else {
                castNotification({
                    title: 'Error Modifying Credit Card',
                    type: 'error'
                });
            }

            done && done();
        });
    }

    createCreditCard(creditCard, done) {
        API.post('/creditcards', {...creditCard}, (err, data, r) => {
            if (r.status == 200) {
                const creditCards = this.state.creditCards;
                creditCards.unshift(creditCard);
                this.setState({ creditCards, selectedCard: creditCards[0] });
                castNotification({
                    title: 'Credit Card Created',
                    type: 'success'
                });
            } else {
                castNotification({
                    title: 'Error inserting credit card',
                    type: 'error'
                });
            }

            done && done();
        });
    }

    render(props, state) {
        return (
            <div id="credit-cards-management">
                <div id="credit-card-list">
                    <div id="cc-list-controls">
                        <ButtonWorker text='New' theme='blue' sync={true} work={() => { this.setState({ selectedCard: undefined, inserting: true }); }} />
                    </div>
                    {
                        state.creditCards.map(cc => (
                            <div className={state.selectedCard && cc._id == state.selectedCard._id ? "selected" : ""} key={cc._id}>
                                <CreditCard {...cc} onClick={this.cardSelected.bind(this)} />
                            </div>
                        ))
                    }
                </div>
                <div id="credit-card-details-pane">
                    {
                        state.selectedCard || state.inserting ? (
                            <CreditCardEdit cc={state.selectedCard} inserting={state.inserting}
                                            onDelete={this.deleteSelectedCard.bind(this)}
                                            onEdit={this.editSelectedCard.bind(this)}
                                            onCreate={this.createCreditCard.bind(this)} />
                        ) : (
                            <h2>Select a credit card to edit it</h2>
                        )
                    }
                </div>
            </div>
        );
    }
}
