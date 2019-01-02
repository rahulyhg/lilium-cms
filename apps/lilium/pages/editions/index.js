import { h, Component } from 'preact';
import { TextField, ButtonWorker, MediaPickerField } from '../../widgets/form';
import { TextEditor } from '../../widgets/texteditor';
import { Spinner } from '../../layout/loading';

import API from '../../data/api';

const MULTIPLE_VALUE_STRING = "[Multiple values]";

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

class EditionEdit extends Component {
    constructor(props) {
        super(props);
        this.state = {
            language : "en"
        };
    }

    fieldClassFromType(type) {
        return TextField;
    }

    makeThemeField(field, editions) {
        const FieldClass = this.fieldClassFromType(field.type);

        const initValue = editions.every(
            x => x.lang[this.state.language][field.name] == editions[0].lang[this.state.language][field.name]
        ) ? editions[0].lang[this.state.language][field.name] : MULTIPLE_VALUE_STRING;

        return (<FieldClass 
            onChange={this.editionFieldChanged.bind(this)} 
            initialValue={initValue || ""} 
            name={field.name} 
            placeholder={field.displayname} 
            {...field.props} 
        />);
    }

    changeLanguage(language) {
        this.setState({ language });
    }

    editionFieldChanged(name, value) {
        if (!value.includes(MULTIPLE_VALUE_STRING)) {
            value = value._id || value;
            const payload = {
                ids : this.props.editions.map(x => x._id),

                name, value 
            };

            const url = `/editions/editionfield/${this.state.language}`;
            API.put(url, payload, (err, json, r) => {
                this.props.editions.forEach(ed => ed.lang[this.state.language][name] = value);
                log('Edition', 'Saved field ' + name + ' of ' + this.props.editions.length + ' editions with language ' + this.state.language, 'success');
            });
        }
    }

    nativeFieldChanged(name, value) {
        value = value._id || value;
        const payload = {
            name, value 
        };

        const url = `/editions/nativefield/${this.props.editions[0]._id}/${this.state.language}`;
        API.put(url, payload, (err, json, r) => {
            this.props.editions[0].lang[this.state.language][name] = value;
            log('Edition', 'Saved field ' + name + ' of edition ' + this.props.editions[0]._id + ' with language ' + this.state.language, 'success');
        });
    }

    render() {
        return (
            <div class="manage-editions">
                <div class="edition-language-picker">
                    <div onClick={this.changeLanguage.bind(this, 'en')} class={"edition-lang-pick " + (this.state.language == "en" ? "selected" : "")}>English</div>
                    <div onClick={this.changeLanguage.bind(this, 'fr')} class={"edition-lang-pick " + (this.state.language == "fr" ? "selected" : "")}>Français</div>
                </div>

                { this.props.editions.length == 1 ? (
                    <div class="card">
                        <h3>Native settings</h3>
                        <TextField onChange={this.nativeFieldChanged.bind(this)} placeholder="Display name" name="displayname" initialValue={this.props.editions[0].lang[this.state.language].displayname} />
                        <TextField onChange={this.nativeFieldChanged.bind(this)} placeholder="URL slug" name="slug" initialValue={this.props.editions[0].lang[this.state.language].slug} />
                        <TextEditor onChange={this.nativeFieldChanged.bind(this)} placeholder="Description" name="description" content={this.props.editions[0].lang[this.state.language].description || ""} />
                        <MediaPickerField onChange={this.nativeFieldChanged.bind(this)} placeholder="Icon" name="icon" initialValue={this.props.editions[0].lang[this.state.language].icon} size="small" />
                        <MediaPickerField onChange={this.nativeFieldChanged.bind(this)} placeholder="Featured image" name="featuredimage" initialValue={this.props.editions[0].lang[this.state.language].featuredimage} />
                    </div>
                ) : (
                    <div class="card">
                        <h3>Native settings</h3>
                        <p>Native fields of multiple editions cannot be edited at the same time.</p>
                    </div>
                ) }

                { this.props.theme.editionForm ? (
                    <div class="card">
                        <h3>{this.props.theme.dName || "Theme"} settings</h3>
                        { this.props.theme.editionForm.map(field => (
                            this.makeThemeField(field, this.props.editions)
                        )) }
                    </div>
                ) : null }

                <div class="card">
                    { this.props.editions.length == 1 ? (
                        <div>
                            <h3>Manage edition</h3>
                            <ButtonWorker theme="red" type="outline" text="Delete edition" />
                            <ButtonWorker theme="white" type="outline" text="Duplicate edition" />
                            <ButtonWorker theme="white" type="outline" text="Change level" />
                        </div>
                    ) : (
                        <div>
                            <h3>Manage multiple editions</h3>
                            <ButtonWorker theme="red" type="outline" text="Delete editions" />
                            <ButtonWorker theme="white" type="outline" text="Merge editions" />
                            <ButtonWorker theme="white" type="outline" text="Change level" />
                        </div>
                    ) }
                </div>
            </div>
        );
    }
}

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
        API.get('/themes/current', {}, (terr, theme) => {
            API.get('/editions/all', {}, (err, data) => this.setState({ 
                theme,

                levels : data.levels, 
                sections : data.sections, 
                selectedLevel : 0, 
                loading : false 
            }));
        });
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
                    { this.state.selectedEditions.length == 0 ? (
                        <div class="template-viewer">
                            <div class="template-message">
                                <i class="fal fa-books"></i>
                                <h3>Edition manager</h3>
                                <p>Use the sidebar to select editions.</p>
                            </div>
                        </div>
                    ) : (
                        <EditionEdit theme={this.state.theme} editions={this.state.selectedEditions} /> 
                    ) }
                </div>
            </div>
        );
    }
}
