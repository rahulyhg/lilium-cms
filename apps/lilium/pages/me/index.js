import { h, Component } from "preact";
import API from '../../data/api';

export default class ProfilePage extends Component {
    constructor(props) {
        super(props);

        this.state = { user: undefined, err: undefined };
    }

    componentWillMount() {
        API.get('/entities/me', {}, (err, user) => {
            if (!err && user) {
                this.setState({ user });
                console.log(this.state);
            } else {
                console.log(err);
                this.setState({ err });x
            }
        });
    }

    render() {
        if (!this.state.err && this.state.user) {
            return (
                <div id="profile-header">
                    <img src="" />
                    <h3 id="user-name">{this.state.user.username}</h3>
                    <h4 id="first-name">{this.state.user.firstname}</h4>
                    <h4 id="last-name">{this.state.user.lastname}</h4>
                </div>
            );   
        } else {
            return (
                <div id="profile-error">
                    <h3>There was an error when trying to retrieve your user info, are you logged in?</h3>
                </div>
            );
        }
    }
}
