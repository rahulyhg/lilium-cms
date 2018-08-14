import { h, Component } from 'preact';
import API from '../../data/api';

class ThemeCard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selected : props.active || false
        }
    }

    componentWillReceiveProps(props) {
        this.setState({ selected : props.active || false });
    }

    componentDidMount() {

    }

    render() {
        return (
            <div class={"theme-card" + (this.state.selected ? " selected" : "")}>
                {this.props.theme.dName}
            </div>
        )
    }
}

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
                <div class="theme-card-list">
                    {this.state.themes.map(x => (
                        <ThemeCard theme={x} active={x.uName == this.state.current.uName} />
                    ))}
                </div>
            </div>
        );
    }
}