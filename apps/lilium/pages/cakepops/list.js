import { h, Component } from "preact";
import { BigList } from '../../widgets/biglist';
import { Link } from '../../routing/link';
import dateformat from 'dateformat';

const STATUS_TO_TEXT = {
    expired : "Expired",
    live : "Live",
    creation : "Draft",
    default : "Unknown status"
}
const CakepopSingleStatus = props => (
    <span class={"cakepop-status cakepop-status-" + props.status}>
        {STATUS_TO_TEXT[props.status] || STATUS_TO_TEXT.default}
    </span>
);

class CakepopSingle extends Component {
    render(){
        return (
            <div class="cakepop-list-item">
                <Link linkStyle="block" href={"/cakepop/edit/" + this.props.item._id}>
                    <div class="cakepop-list-item-container">
                        <b>
                            <span>{this.props.item.title}</span>
                            <CakepopSingleStatus expiry={this.props.item.expiry} status={this.props.item.status} />
                        </b>

                        <div>Running until {dateformat(this.props.item.expiry, 'mmmm, dd yyyy - HH:MM')}</div>
                        <div>Open {this.props.item.read} times</div>
                    </div>
                </Link>
            </div>
        );
    }
}

const TOOLBAR_CONFIG = {
    id : "cakepoplst",
    title : "FILTERS",
    fields : [
        { type : "text", name : "search", title : "Search" },
        { type : "select", name : "status", title : "Status", options : [
            { text : "All", value : "" },
            { text : "Draft / Finished", value : "draft" },
            { text : "Live", value : "live" },
        ] }
    ]
}

export default class CakepopsList extends Component {
    constructor(props) {
        super(props);
        this.state = {

        };
    }

    render() {
        return (
            <div class="cakepops-big-list">
                <BigList endpoint="/cakepop/bunch" listitem={CakepopSingle} toolbar={TOOLBAR_CONFIG} />
            </div>
        );
    }
}