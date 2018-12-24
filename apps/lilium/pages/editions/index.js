import { h, Component } from 'preact';
import { TextField } from '../../widgets/form';
import { Spinner } from '../../layout/loading';

import API from '../../data/api';

class EditionSectionDropDown extends Component {
    constructor(props) {
        super(props);
        this.state = {
            open : props.open,
            editions : props.section.editions,
            section : props.section
        };
    }

    componentWillReceiveProps(props) {
        this.setState({ editions : props.section.editions, section : props.section }); 
    }

    editionClicked(ed) {
        this.props.editionClicked(this.state.section.level, ed);
    }

    render() {
        return (
            <div>
                <div class="section-header">
                    <b>{this.state.section.displayname}</b>
                </div>
                <div>
                    { this.state.open ? this.state.editions.map(ed => (
                        <div onClick={this.editionClicked.bind(this, ed)}>
                            <div class="edition-select-box-wrap">
                                <div class="edition-select-box">
                                    {ed.checked ? <i class="fa far-check"></i> : null}
                                </div>
                            </div>
                            <div class="edition-item-details">
                                <div class="edition-display-name">{ed.displayname}</div>
                                <small class="edition-display-slug">{ed.slug}</small>
                            </div>
                        </div>
                    )) : null }
                </div>
            </div>
        )
    }
}

export default class EditionPage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading : true
        }
    }

    componentDidMount() {
        API.get('/editions/all', {}, (err, data) => {
            this.setState({ levels : data.levels, sections : data.sections, loading : false });
        });
    }

    render() {
        if (this.state.loading) {
            return (<Spinner centered />)
        }

        return (
            <div>
                <div class="editions-sidebar">
                    { this.state.levels.map(section => ( <EditionSectionDropDown section={section} /> )) }
                </div>
                <div class="editions-editview">
                    
                </div>
            </div>
        );
    }
}
