import { h, Component } from "preact";
import { Spinner } from '../../layout/loading';
import { AnimeNumber } from '../../widgets/animenumber';
import API from '../../data/api';
import dateformat from 'dateformat';

class ContractorHistorical extends Component {
    componentDidMount() {
        API.get("/contractorspayments/invoices/", {}, (err, json, r) => {
            this.setState({ history : json });
        });
    }

    render() {
        if (!this.state.history) {
            return (<Spinner centered={true} />)
        }

        return (
            <div>

            </div>
        );
    }

}

export class ContractorTab extends Component {
    static get tabprops() {
        return {
            text : "Payments",
            right : "contractor",
            id : "contractor-payment"
        }
    }

    constructor(props) {
        super(props);
        this.state = {

        };
    }

    componentDidMount() {

    }

    render() {
        return (
            <div>
                <ContractorHistorical />
            </div>
        );
    }
}
