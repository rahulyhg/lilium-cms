import { h, Component } from 'preact';
import { CreditCard } from './creditcard';
import { TextField } from '../../widgets/form';

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

    render(props, state) {
        if (state.cc) {
            return (
                <div id="credit-card-edit">
                    <CreditCard {...state.cc} />
                    <div id="credit-card-form">
                        <TextField value={state.cc.number} initialValue={state.cc.number} placeholder='Credit Card Number' name='number' />
                        <TextField value={state.cc.expiryMonth} initialValue={state.cc.expiryMonth} placeholder='Expiry Month' name='expiryMonth' />
                        <TextField value={state.cc.expiryYear} initialValue={state.cc.expiryYear} placeholder='Expiry Year' name='expiryYear' />
                        <TextField value={state.cc.cvc} initialValue={state.cc.cvc} placeholder='CVC' name='cvc' />
                    </div>
               </div>
            );
        } else {
            return null;
        }
    }
}
