import { h, Component } from 'preact';

function parseSource(post) {
    if (post.url.includes('/amp')) {
        return "amp";
    }

    switch (post.source) {
        case "fb-media-manager":
            return "Facebook paid";

        case "(direct)":
            return "Direct";
    }

    return post.source;
}

function genSpecial(post) {
    if (post.home) {
        return "homepage";
    }

    return "";
}

export default class BigList extends Component {
    render() {
        if (!this.props.posts) {
            return (<div></div>);
        }

        return (
            <div>
                <ul>
                    {this.props.posts.map(post => (
                        <li key={post.url}>
                            <div className="list-item-count">{post.count}</div>
                            <div className="list-item-detail">
                                <a href={post.url} target="_blank">{post.title}</a>
                                <div>
                                    <span className="list-item-source">{parseSource(post)}</span>
                                    <span className="list-item-site">{post.sitename}</span>
                                    <span className="list-item-special">{genSpecial(post)}</span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
}
