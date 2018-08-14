import { h, Component } from 'preact';
import API from '../../data/api';

export default class ThemeSettings extends Component {
    constructor(props) {
        super(props);
        this.state = {
            ready : false
        }
    }

    componentDidMount() {
        API.getMany([
            { endpoint : "/themes/all" },
            { endpoint : "/themes/current" }
        ], (err, resp) => {
            this.setState({ themes : resp["/themes/all"], current : resp["/themes/current"], ready : true });
        })
    }

    render() {
        if (!this.state.ready) {
            return (<div>Loading</div>);
        }

        return (
            <div id="theme-settings-page">
                <h1>Themes</h1>
                <div>
                    {this.state.themes.map(x => (
                        <div>
                            {x.dName}
                        </div>
                    ))}
                </div>
            </div>
        );
    }
}