import { h, Component } from "preact";
import { AnimeNumber } from '../../widgets/animenumber';
import API from '../../data/api';

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
        API.get("");
    }

    render() {
        return (
            <div>

            </div>
        );
    }
}
