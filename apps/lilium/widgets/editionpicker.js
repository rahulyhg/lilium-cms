import { h, Component } from 'preact';
import { Spinner } from '../layout/loading';
import API from '../data/api';

class EditionLevel extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value : props.value,
            editions : props.editions
        };

        this.editions = [...props.editions];
    }

    componentWillReceiveProps(props) {
        this.setState({ value : props.value });
    }

    clickedOn(edition) {
        this.props.onSelect(
            this.state.value == edition ? undefined : edition, 
            this.props.level
        );
    }

    searchClicked() {
        if (this.state.searching) {
            
        } else {
            this.setState({ searching : true }, () => {
                this.input.focus();
                this.input.addEventListener('blur', ev => {
                    if (!ev.target.value.trim()) {
                        this.setState({ searching : false, editions : [...this.editions] });
                    }
                });
            });
        }
    }

    searchKeyUp(ev) {
        if (ev.key == "Enter" && this.state.editions[0]) {
            this.clickedOn(this.state.editions[0]._id);
        } else {
            const filter = ev.target.value;
            this.setState({ editions : this.editions.filter(x => x.lang[this.props.language].displayname.toLowerCase().includes(filter.toLowerCase())) });
        }
    }

    render() {
        return (
            <div class="ep-level">
                <div class="ep-flex-wrap">
                    <div class="ep-level-name" onClick={this.searchClicked.bind(this)}>
                        { this.state.searching ? (
                            <input onKeyUp={this.searchKeyUp.bind(this)} type="text" ref={x => ( this.input = x )} class="ep-level-search" placeholder="Search for an edition" />
                        ) : (
                            <div>
                                <b>{this.props.section.displayname}</b>
                                <i class="fa fa-search"></i>
                            </div>
                        ) }
                    </div>
                    <div class="ep-level-editions">
                        { this.state.editions.length != 0 ? (this.state.editions.map(ed => (
                            <div class={"ep-level-edition " + (this.state.value == ed._id ? "selected" : "")} onClick={this.clickedOn.bind(this, ed._id)}>
                                {ed.lang[this.props.language].displayname}
                            </div>
                        ))) : (
                            <div class="ep-level-no-edition">
                                Nothing found
                            </div>
                        )}
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
            const willscroll = this.state.value.length < props.value.length;
            this.setState({ value : props.value }, () => {
                willscroll && this.el.scrollTo(1000, 0);
            });
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
            <div class="edition-picker" ref={x => (this.el = x)}>
                { this.state.levels.map((lvl, i) => this.state.value.length >= i ? ( 
                    <EditionLevel language={this.props.language} onSelect={this.editionClicked.bind(this)} 
                        editions={lvl.editions} section={lvl.section} value={this.state.value[i]}
                        level={lvl.level} />
                ) : null )}
            </div>
        );
    }
}
