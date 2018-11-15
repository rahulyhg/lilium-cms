import { h, Component } from "preact";
import API from "../../data/api";
import { Link } from '../../routing/link';
import { BigList, BigListToolBarBuilder } from '../../widgets/biglist';

const StaffListHeader = props => (
    <div class="tr staff-list-header">
        <div class="th">Legal name</div>
        <div class="th">Email</div>
        <div class="th">Status</div>
        <div class="th">Phone</div>
    </div>
);

class StaffListItem extends Component {
    render() {
        return (
            <div class="tr staff-list-row">
                <div class="td">
                    <Link href={"/staffing/single/" + this.props.item._id}>
                        <img class="staff-list-avatar" src={this.props.item.entity.avatarURL} />
                        <span class="staff-list-name">{ this.props.item.legalname }</span>
                    </Link>
                </div>
                <div class="td">{ this.props.item.entity.email }</div>
                <div class="td staff-list-status">
                    <i class={"staff-list-status-bubble status-" + this.props.item.status}></i>
                    <span>{ this.props.item.status }</span>
                </div>
                <div class="td">{ this.props.item.entity.phone }</div>
            </div>
        );
    }
}

export default class ListView extends Component {
    constructor(props) {
        super(props);
    }

    static get TOOLBAR_CONFIG() {
        return {
            id : "StaffingListTb",
            title : "Filters",
            fields : [
                { type : "text", name : "search", title : "Search by name" },
                { type : "select", name : "status", title : "Status", options : [
                    { value : "active", text : "Employed" },
                    { value : "terminated", text : "Terminated" },
                    { value : "everyone", text : "Everyone" }
                ] }
            ]
        };
    }

    render() {
        return (
            <div>
                <BigList topElement={StaffListHeader} listitem={StaffListItem} endpoint="/staffing/bunch" toolbar={ListView.TOOLBAR_CONFIG} liststyle={{ display: 'table', width: '100%', padding: 0 }} />
            </div>
        );  
    }
};
