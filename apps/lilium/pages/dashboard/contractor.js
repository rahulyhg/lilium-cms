import { h, Component } from "preact";
import { Spinner } from '../../layout/loading';
import { AnimeNumber } from '../../widgets/animenumber';
import { ChartGraph } from '../../widgets/chart';
import API from '../../data/api';
import dateformat from 'dateformat';

class ContractorHistorical extends Component {
    componentDidMount() {
        API.get("/contractorspayments/invoices", {}, (err, json, r) => {
            this.setState({ history : json });
        });
    }

    render() {
        if (!this.state.history) {
            return (<Spinner centered={true} />)
        }

        return (
            <div>
                <div>
                    <div class="dashboard-graph-wrap">
                        <h2>Payment history</h2>
                        <div style={{ position: 'relative', height: 350 }} class="dashboard-contractor-payment-history-chart">
                            <ChartGraph nowrap={true} chart={{
                                type : "line",
                                data : {
                                    labels : this.state.history.map(x => dateformat(new Date(x.at), 'dd/mm/yy')),
                                    datasets : [{
                                        data : this.state.history.map(x => x.total),
                                        label : "Amount paid",
                                        backgroundColor : "#b48efb77"
                                    }]
                                },
                                options : {
                                    responsive : true,
                                    maintainAspectRatio: false,
                                    cubicInterpolationMode : 'monotone'
                                }
                            
                            }} />
                        </div>
                    </div>
                </div>
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
