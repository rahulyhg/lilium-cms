import { h, Component } from 'preact';
import { Link } from '../../routing/link';
import API from "../../data/api";

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
            },
            page : 1,
            max : 25,
            posts : []
        };
    }

    componentDidMount() {
        log('Publishing', 'Fetching list of posts using the API', 'detail');
        API.get("/publishing/bunch", {
            filters : this.state.filters,
            page : this.state.page,
            max : this.state.max
        }, (err, data) => {
            this.setState({
                posts : data.items
            });
        });
    }

    render() {
        return (
            <div>
                {this.state.posts.map(post => (
                    <div key={post._id}>
                        <Link href={"/publishing/write/" + post._id}>
                            {post.headline}
                        </Link>
                    </div>
                ))}
            </div>
        )
    }
}