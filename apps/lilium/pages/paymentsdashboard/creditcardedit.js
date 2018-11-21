import { h, Component } from 'preact';
import { CreditCard } from './creditcard';
import { TextField, ButtonWorker, SelectField } from '../../widgets/form';
import { castNotification } from '../../layout/notifications';

export class CreditCardEdit extends Component {
    constructor(props) {
        super(props);
        this.modified = {};
        this.state = {
            cc: props.cc || {},
            inserting: props.inserting
        };

        this.dateSegmentRegEx = new RegExp('(^[0-9]{1,2}$)');
        this.cardNumberRegEx = new RegExp('(^[0-9]{16})$');
        this.cvcRegEx = new RegExp('^[0-9]{3}$');
        this.numberReplaceRegEx = new RegExp('([^0-9]+)', 'g');

        this.errors = [];
    }
    
    componentWillReceiveProps(props) {
        const newState = {};
        if (props.hasOwnProperty('cc')) newState.cc = props.cc || {};
        if (props.hasOwnProperty('inserting')) newState.inserting = props.inserting;

        this.setState(newState);
    }

    saveCreditCard(done) {
        if (!this.errors.length) {
            const cb = this.state.inserting ? this.props.onCreate : this.props.onEdit;
            cb && cb(this.modified, done);
        } else {
            castNotification({
                title: 'Invalid Fields',
                message: 'Some fields are still invalid',
                type: 'warning'
            });

            done && done();
        }

        console.log(this.errors);;
        
    }

    fieldEdited(name, val, old, valid) {
        this.modified[name] = val;

        if (valid) {
            if (this.errors.length) {
                const i = this.errors.indexOf(name);
                
                if (i >= 0) {
                    this.errors.splice(i, 1);
                }
            }
        } else {
            if (!this.errors.includes(name)) {
                this.errors.push(name);
            }
        }
        
        const cc = this.state.cc;
        cc[name] = val;
        this.setState({ cc });
    }

    render(props, state) {
        if (state.cc || state.inserting) {
            return (
                <div id="credit-card-edit">
                    <CreditCard {...state.cc} />
                    <div id="credit-card-form">
                        <TextField value={state.cc.number} initialValue={state.cc.number} placeholder='Credit Card Number' name='number' onChange={this.fieldEdited.bind(this)}
                                    validate={value => this.cardNumberRegEx.test(value)} format={value => value.replace(this.numberReplaceRegEx, '')} />
                        <div className='flex'>
                            <TextField value={state.cc.expiryMonth} initialValue={state.cc.expiryMonth} placeholder='Expiry Month' name='expiryMonth' onChange={this.fieldEdited.bind(this)}
                                        validate={value => this.dateSegmentRegEx.test(value) && parseInt(value) <= 12 } />
                            <TextField value={state.cc.expiryYear} initialValue={state.cc.expiryYear} placeholder='Expiry Year' name='expiryYear' onChange={this.fieldEdited.bind(this)}
                                        validate={value => this.dateSegmentRegEx.test(value)} />
                        </div>
                        <div className="flex" id='bottom-line'>
                            <TextField value={state.cc.cvc} initialValue={state.cc.cvc} placeholder='CVC' name='cvc' onChange={this.fieldEdited.bind(this)}
                                        validate={value => this.cvcRegEx.test(value)} />
                            <SelectField value={state.cc.currency} initialValue={state.cc.currency} placeholder='Currency' name='currency' onChange={this.fieldEdited.bind(this)}
                                        options={[{ displayname: 'CAD' }, { displayname: 'USD' }]} />
                        </div>
                        <ButtonWorker text={state.inserting ? 'Create' : 'Save'} theme='purple' type='fill' work={this.saveCreditCard.bind(this)} />
                        {
                            !state.inserting ? (
                                <ButtonWorker text='Delete' theme='red' work={props.onDelete.bind(this)} style={{ float: 'right' }} />
                            ) : null
                        }
                    </div>
               </div>
            );
        } else {
            return null;
        }
    }
}
