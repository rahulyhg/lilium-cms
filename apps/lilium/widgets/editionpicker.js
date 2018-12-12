import { h, Component } from 'preact';
import { Spinner } from '../layout/loading';
import API from '../data/api';

class EditionLevel extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value : props.value
        };
    }

    componentWillReceiveProps(props) {
        this.setState({ value : props.value })
    }

    clickedOn(edition) {
        this.props.onSelect(
            this.state.value == edition ? undefined : edition, 
            this.props.level
        );
    }

    render() {
        return (
            <div class="ep-level">
                <div class="ep-flex-wrap">
                    <div class="ep-level-name">{this.props.section.displayname}</div>
                    <div class="ep-level-editions">
                        {this.props.editions.map(ed => (
                            <div class={"ep-level-edition " + (this.state.value == ed._id ? "selected" : "")} onClick={this.clickedOn.bind(this, ed._id)}>
                                {ed.displayname}
                            </div>
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

    editionClicked(ed, level) {
        let value = [...this.state.value];
        if (ed) {
            value[level] = ed;
        } else {
            value = value.splice(0, level);
        }

        this.props.onChange(this.props.name, value);
    }

    render() {
        if (this.state.loading) {
            return (
                <Spinner centered />
            );
        }

        return (
            <div class="edition-picker">
                { this.state.levels.map((lvl, i) => this.state.value.length >= i ? ( 
                    <EditionLevel onSelect={this.editionClicked.bind(this)} 
                        editions={lvl.editions} section={lvl.section} value={this.state.value[i]}
                        level={lvl.level} />
                ) : null )}
            </div>
        );
    }
}
