import { h, Component } from 'preact';
import { TextField } from '../../widgets/form';
import { Spinner } from '../../layout/loading';

import API from '../../data/api';

class EditionSectionDropDown extends Component {
    constructor(props) {
        super(props);
        this.state = {
            open : false,
            selectedLevel : props.selectedLevel || 0
        };
    }

    componentWillReceiveProps(props) {
        this.setState({ selectedLevel : props.selectedLevel }); 
    }

    levelClicked(level) {
        this.props.levelClicked(level);
    }

    render() {
        return (
            <div>
                <div class="section-header">
                    <b>{this.props.sections[this.state.selectedLevel].displayname}</b>
                    <i class="far fa-chevron-down"></i>
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
        };
    }

    componentDidMount() {
        API.get('/editions/all', {}, (err, data) => {
            this.setState({ levels : data.levels, sections : data.sections, selectedLevel : 0, loading : false });
        });
    }

    changeLevel(selectedLevel) {
        this.setState({ selectedLevel })
    }   

    render() {
        if (this.state.loading) {
            return (<Spinner centered />)
        }

        return (
            <div class="editions-management">
                <div class="editions-sidebar">
                    <EditionSectionDropDown levelClicked={this.changeLevel.bind(this)} sections={this.state.sections} level={this.state.selectedLevel} />
                </div>
                <div class="editions-editview">
                    
                </div>
            </div>
        );
    }
}
