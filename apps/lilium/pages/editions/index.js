import { h, Component } from 'preact';
import { TextField } from '../../widgets/form';
import { Spinner } from '../../layout/loading';

import API from '../../data/api';

const EditionSectionDropDown = props => props.open ? (
    <div>
        <div class="section-picker-open">
            {
                props.sections.map(sec => (
                    <div class="single-section-to-pick" onClick={() => props.switchLevel(sec.level)}>
                        <b>{sec.displayname}</b>
                    </div>
                ))
            }
        </div>
    </div>
) : (
    <div>
        <div class="section-header" onClick={() => props.toggleOpenState(true)}>
            <b>{props.sections[props.level].displayname}</b>
            <i class="far fa-chevron-down"></i>
        </div>
    </div>
);

export default class EditionPage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading : true,
            draweropen : false
        };
    }

    componentDidMount() {
        API.get('/editions/all', {}, (err, data) => this.setState({ 
            levels : data.levels, 
            sections : data.sections, 
            selectedLevel : 0, 
            loading : false 
        }));
    }

    render() {
        if (this.state.loading) {
            return (<Spinner centered />)
        }

        return (
            <div class="editions-management">
                <div class="editions-sidebar">
                    <EditionSectionDropDown 
                        switchLevel={selectedLevel => this.setState({ selectedLevel, draweropen : false })}
                        toggleOpenState={draweropen => this.setState({ draweropen })} 

                        sections={this.state.sections} 
                        open={this.state.draweropen}
                        level={this.state.selectedLevel} />
                </div>
                <div class="editions-editview">
                    
                </div>
            </div>
        );
    }
}
