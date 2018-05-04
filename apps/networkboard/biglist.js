import { h, Component } from 'preact';

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
                            <b>{post.count}</b>
                            <a href={post.url} target="_blank">{post.title}</a>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
}
