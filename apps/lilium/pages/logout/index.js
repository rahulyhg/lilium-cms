import { h, Component } from 'preact';
import API from '../../data/api';

export default class LogoutScreen extends Component {
    componentDidMount() {
        document.location = "/logout";
    }

    render() {
        return (
            <div>
                <h1>Logging out...</h1>
            </div>
        );
    }
}