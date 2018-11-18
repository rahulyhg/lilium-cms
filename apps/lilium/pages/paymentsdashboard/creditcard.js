import { h, Component } from 'preact'
import API from '../../data/api';

export class CreditCard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            scheme: '',
            number: props.number || 'XXXXXXXXXXXXXXXX',
            expiryMonth: '',
            expiryYear: '',
            cvc: '',
            currency: ''
        }
    }

    componentDidMount() {
        API.get('/creditcards/identifycc', { digits: this.props.number.substring(0, 6) }, (err, data, r) => {
            if (r.status == 200) {
                this.setState({ scheme: data.scheme, bank: data.bank_name });
            }
        });
    }

    componentWillReceiveProps(props) {
        this.setState(props);
    }

    render(props, state) {
        const numberGroups = [];
        if (props.number) {
            for (let i = 0; i < 4; i++) {
                const group = props.number.substring(i * 4, i * 4 + 4);
                numberGroups.push(group);
            }
        }
        return (
            <div className="credit-card monospace-font" onClick={props.onClick && props.onClick.bind(this, props._id)}>
                {
                    state.scheme ? (<i className={`scheme-logo fa-3x fab fa-cc-${state.scheme}`}></i>) : null
                }
                {
                    state.bank ? (<p className='card-bank-name'>{state.bank.toLowerCase()}</p>) : null
                }
                <div className="card-data">
                    <p className="card-number">
                        {
                            numberGroups.map(group => (
                                <span className="number-group">{group}</span>
                            ))
                        }
                    </p>
                    <div className="secondary-info">
                        <div className="card-expiry">
                            <p>
                                <sup>Erpiry date: </sup>
                                <span className="expiry-month">{props.expiryMonth && props.expiryMonth.padStart(2, '0')}</span>
                                /
                                <span className="expiry-year">{props.expiryYear && props.expiryYear.padStart(2, '0')}</span>
                            </p>
                        </div>
                        <p className="cvc">
                            <sup>CVC: </sup>
                            <span>{props.cvc}</span>
                        </p>
                    </div>
                </div>
            </div>
        );
    }
}
