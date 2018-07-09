import { h, Component } from "preact";
import API from "../../data/api";

export default class PublishingTab extends Component {
    constructor(props) {
        super(props);

        this.state = { 
            filters : {
                search : "",
                status : "",
                author : "",
                isSponsored : "",
                sort : "updated"
            },
            page : 1,
            max : 25,
            items : []
        };
    }

    componentDidMount() {
        API.get("/publishing/bunch", {
            filters : this.state.filters,
            page : this.state.page,
            max : this.state.max
        }, (err, data) => {
            this.setState({
                items : data.items
            });
        });
    }

    render() {
        return (
            <div id="publishing-tab">
                {this.state.items.map(post => (
                    <div key={post._id}>
                        {post.headline}
                    </div>
                ))}
            </div>
        );
    }
}