import { h, Component } from 'preact';
import { CreditCard } from './creditcard';
import { TextField, ButtonWorker } from '../../widgets/form';

export class CreditCardEdit extends Component {
    constructor(props) {
        super(props);
        this.state = {
            cc: props.cc
        }
    }
    
    componentWillReceiveProps(props) {
        if (props.cc) this.setState({ cc: props.cc });
    }

    saveCreditCard() {

    }

    fieldEdited(name, val) {
        const cc = this.state.cc;
        cc[name] = val;
        this.setState({ cc });
    }

    render(props, state) {
        if (state.cc) {
            return (
                <div id="credit-card-edit">
                    <CreditCard {...state.cc} />
                    <div id="credit-card-form">
                        <TextField value={state.cc.number} initialValue={state.cc.number} placeholder='Credit Card Number' name='number' onChange={this.fieldEdited.bind(this)} />
                        <div id="expiry-date-edit">
                            <TextField value={state.cc.expiryMonth} initialValue={state.cc.expiryMonth} placeholder='Expiry Month' name='expiryMonth' onChange={this.fieldEdited.bind(this)} />
                            <TextField value={state.cc.expiryYear} initialValue={state.cc.expiryYear} placeholder='Expiry Year' name='expiryYear' onChange={this.fieldEdited.bind(this)} />
                        </div>
                        <TextField value={state.cc.cvc} initialValue={state.cc.cvc} placeholder='CVC' name='cvc' onChange={this.fieldEdited.bind(this)} />
                        <ButtonWorker text='Save' theme='purple' work={this.saveCreditCard.bind(this)} />
                    </div>
               </div>
            );
        } else {
            return null;
        }
    }
}
