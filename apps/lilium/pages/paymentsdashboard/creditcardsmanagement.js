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
            selectedCard: undefined
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
        this.setState({ selectedCard });
    }

    deleteSelectedCard(done) {
        API.delete('/creditcards/' + this.state.selectedCard._id, {}, (err, data, r) => {
            if (r.status == 200 && data.ok) {
                const creditCards = this.state.creditCards;
                const i = creditCards.findIndex(card => card._id == this.state.selectedCard._id);
                if (i >= 0) {
                    creditCards.splice(i, 1);
                    this.setState({creditCards});
                }
                castNotification({
                    title: 'Credit Card Removed',
                    type: 'success'
                });
            }

            done && done();
        });
    }

    render(props, state) {
        return (
            <div id="credit-cards-management">
                <Modal visible={state.deleteCardModalVisible} title='Remove Credit Card'>

                </Modal>
                <div id="credit-card-list">
                    <div id="cc-list-controls">
                        <ButtonWorker text='New' theme='blue' />
                    </div>
                    {
                        state.creditCards.map(cc => (
                            <CreditCard {...cc} onClick={this.cardSelected.bind(this)} key={cc._id} />
                        ))
                    }
                </div>
                <div id="credit-card-details-pane">
                    {
                        state.selectedCard ? (
                            <CreditCardEdit cc={state.selectedCard} onDelete={this.deleteSelectedCard.bind(this)} />
                        ) : (
                            <h2>Select a credit card to edit it</h2>
                        )
                    }
                </div>
            </div>
        );
    }
}
