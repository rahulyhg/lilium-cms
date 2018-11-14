import { h, Component } from 'preact'

export class CreditCard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            
        }
    }
    
    componentDidMount() {
        
    }
    
    render(props, state) {
        return (
            <div className="credit-card monospace-font">
                <div className="card-data">
                    <span className="card-number">{props.number}</span>
                    <div className="card-expiry">
                        <span className="expiry-month">{props.expiryMonth}</span>
                        <span className="expiry-year">{props.expiryYear}</span>
                    </div>
                    <span className="cvc">{props.cvc}</span>
                </div>
            </div>
        );
    }
}