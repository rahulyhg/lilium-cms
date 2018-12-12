import { h, Component } from 'preact';
import { Spinner } from '../layout/loading';
import API from '../data/api';

class EditionLevel extends Component {
    render() {
        return (
            <div class={"ep-level " + (this.props.active ? "" : "inactive")}>
                <div class="ep-flex-wrap">
                    <div class="ep-level-name">{this.props.section.displayname}</div>
                    <div class="ep-level-editions">
                        {this.props.editions.map(ed => (
                            <div class="ep-level-edition">{ed.displayname}</div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
}

export class EditionPicker extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading : true,
            value : props.initialValue || []
        }
    }

    componentDidMount() {
        API.get('/editions/all', {}, (err, json, r) => {
            this.setState({
                loading : false,

                levels : json.levels,
                sections : json.sections
            })
        });
    }

    componentWillReceiveProps(props) {
        if (props.value) {
            this.setState({ value : props.value })
        }
    }

    render() {
        if (this.state.loading) {
            return (
                <Spinner centered />
            );
        }

        return (
            <div class="edition-picker">
                { this.state.levels.map((lvl, i) => ( 
                    <EditionLevel editions={lvl.editions} section={lvl.section} level={lvl.level} active={i==0} />
                ))}
            </div>
        );
    }
}
