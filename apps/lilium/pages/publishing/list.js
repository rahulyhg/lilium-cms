import { h, Component } from 'preact';
import { Link } from '../../routing/link';
import API from "../../data/api";
import { BigList } from '../../widgets/biglist'

class PostListItem extends Component {
    render() {
        return (
            <div>
                <Link href={"/publishing/write/" + this.props.item._id}>
                    { this.props.item.status } : {this.props.item.headline}
                </Link>
            </div>
        )
    }
}

export default class ListView extends Component {
    constructor(props) {
        super(props);

        this.state = { 
            filters : {
                search : "",
                status : "",
                author : "",
                isSponsored : "",
                sort : "updated"
            }
        };
    }

    showdrafts() {
        const filters = this.state.filters;
        filters.status = "draft";

        this.setState({ filters })
    }

    render() {
        return (
            <div>
                <button onClick={this.showdrafts.bind(this)}>Only show drafts</button>
                <BigList listitem={PostListItem} endpoint="/publishing/biglist" filters={this.state.filters} />
            </div>
        )
    }
}