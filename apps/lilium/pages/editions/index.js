import { h, Component } from 'preact';
import { TextField } from '../../widgets/form';
import { Spinner } from '../../layout/loading';

import API from '../../data/api';

const EditionSectionDropDown = props => props.open ? (
    <div class="section-picker-open">
        {
            props.sections.map(sec => (
                <div key={sec._id} class="single-section-to-pick" onClick={() => props.switchLevel(sec.level)}>
                    <b>{sec.displayname}</b>
                </div>
            ))
        }
    </div>
) : (
    <div class="section-header">
        <div class="section-header-click-area" onClick={() => props.toggleOpenState(true)}>
            <b>{props.level.displayname}</b>
            <i class="far fa-chevron-down"></i>
        </div>
    </div>
);

const EditionList = props => (
    <div class="edition-list">
        { props.editions.map(ed => (<div class={"editions-sidebar-single " + (ed.selected ? "selected" : "")} onClick={() => props.selectEdition(ed)}>
            <div class="ed-single-check">
                <i class="far fa-check"></i>
            </div>
            <div class="ed-single-text">
                <b>{ed.displayname}</b>
                <small>/{"../".repeat(props.level)}{ed.slug}</small>
            </div>
        </div>)) }
    </div>
);

export default class EditionPage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading : true,
            draweropen : false,
            selectedEditions : []
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

    toggleSelectedEdition(ed) {
        const arr = [...this.state.selectedEditions];
        const index = arr.findIndex(x => x._id == ed._id);
        index == -1 ? arr.push(ed) : arr.splice(index, 1); 
        ed.selected = !ed.selected;

        this.setState({ selectedEditions : arr })
    }

    switchLevel(selectedLevel) {
        this.state.selectedEditions.forEach(x => x.selected = false);
        this.setState({ selectedLevel, draweropen : false, selectedEditions : [] })
    }

    render() {
        if (this.state.loading) {
            return (<Spinner centered />)
        }

        return (
            <div class="editions-management">
                <div class="editions-sidebar">
                    <EditionSectionDropDown 
                        switchLevel={selectedLevel => this.switchLevel(selectedLevel)}
                        toggleOpenState={draweropen => this.setState({ draweropen })} 

                        sections={this.state.sections} 
                        open={this.state.draweropen}
                        level={this.state.sections[this.state.selectedLevel]} />

                    <EditionList 
                        selectEdition={selectedEdition => this.toggleSelectedEdition(selectedEdition)}
                        selectedEditions={this.state.selectedEditions}
                        level={this.state.selectedLevel} 
                        editions={this.state.levels[this.state.selectedLevel].editions} />
                </div>
                <div class="editions-editview">
                    <p>{this.state.selectedEditions.map(x => x.displayname).join(', ')}</p>
                </div>
            </div>
        );
    }
}
