import { h, Component } from 'preact';
import { TextField, ButtonWorker, MediaPickerField, SelectField } from '../../widgets/form';
import { TextEditor } from '../../widgets/texteditor';
import { Spinner } from '../../layout/loading';
import { castNotification } from '../../layout/notifications';
import Modal from '../../widgets/modal';

import API from '../../data/api';

const MULTIPLE_VALUE_STRING = "[Multiple values]";
const DEFAULT_LANGUAGES = [
    { code : "en", displayname : "English" },
    { code : "fr", displayname : "Français" }
];

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
            language : props.languages[0].code 
        };

        this.stage = {};
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
                log('Edition', 'Saved edition field ' + name + ' of ' + this.props.editions.length + ' editions with language ' + this.state.language, 'success');
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
            log('Edition', 'Saved native field ' + name + ' of edition ' + this.props.editions[0]._id + ' with language ' + this.state.language, 'success');
        });
    }

    mergeLanguages(done) {
        const { mergeInto, mergeFrom } = this.stage;

        if (mergeInto && mergeFrom) {
            this.stage = {};
            this.props.editions[0].lang[mergeInto] = {...this.props.editions[0].lang[mergeFrom]};

            API.put('/editions/mergelanguages/' + this.props.editions[0]._id, { mergeInto, mergeFrom }, () => {
                this.setState({ modal_mergeLanguage : false });
                done();
            });
        } else {
            done();
        }
    }

    duplicateSingle(done) {
        API.post('/editions/duplicate/' + this.props.editions[0]._id, {}, (err, json, r) => {
            if (json && json._id) {
                castNotification({
                    title : "Edition duplicated",
                    message : "The edition was successfully duplicated, and is now selected.",
                    type : 'success'
                });

                this.props.onDup(json && json._id);
            } else {

            }
        });
    }

    deleteEdition(done) {
        const { deleteReplaceWith } = this.stage;

        if (deleteReplaceWith) {
            this.stage = {};

            API.delete('/editions/replacewith/' + deleteReplaceWith, {
                toDelete : this.props.editions.map(x => x._id)
            }, (err, json, r) => {
                this.props.editions[0].removed = true;
                this.setState({ modal_deleteEdition : false });
                done();
                this.props.onDelete();

                if (json && json.nModified) {
                    castNotification({
                        title : "Edition removed",
                        message : json.nModified + " articles were edited and will use a new edition instead of this one.",
                        type : 'success'
                    });
                }
            });
        } else {
            done();
        }
    }

    render() {
        return (
            <div class="manage-editions">
                <div class="edition-language-picker">
                    { this.props.languages.map(lang => (
                        <div onClick={this.changeLanguage.bind(this, lang.code)} class={"edition-lang-pick " + (this.state.language == lang.code ? "selected" : "")}>
                            {lang.displayname}
                        </div>
                    )) }
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
                        <p>Multiple native fields cannot be edited at the same time.</p>
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
                            <ButtonWorker sync theme="red" type="outline" text="Delete edition" work={() => this.setState({ modal_deleteEdition : true })} />
                            <ButtonWorker sync theme="white" type="outline" text="Duplicate edition" work={() => this.duplicateSingle()} />
                            <ButtonWorker sync theme="white" type="outline" text="Merge languages" work={() => this.setState({ modal_mergeLanguage : true })} />
                            <ButtonWorker sync theme="white" type="outline" text="Change level" />
                        </div>
                    ) : (
                        <div>
                            <h3>Manage multiple editions</h3>
                            <ButtonWorker sync theme="red" type="outline" text="Delete editions"  work={() => this.setState({ modal_deleteEdition : true })} />
                            <ButtonWorker sync theme="white" type="outline" text="Change level" />
                        </div>
                    ) }
                </div>

                <Modal title="Merge languages" visible={this.state.modal_mergeLanguage} onClose={ () => this.setState({ modal_mergeLanguage : false }) }>
                    <p>Merge language </p>
                    <SelectField initialValue={this.state.language} name="merge-language-from" options={this.props.languages.map(x => ({ displayname : x.displayname, value : x.code }))} onChange={(name, value) => this.stage.mergeFrom = value} />
                    <p>into</p>
                    <SelectField name="merge-language-into" options={this.props.languages.map(x => ({ displayname : x.displayname, value : x.code }))} onChange={(name, value) => this.stage.mergeInto = value} />
                    
                    <ButtonWorker theme="blue" type="fill" text="Merge" work={this.mergeLanguages.bind(this)}  />
                </Modal>

                <Modal title="Delete edition" visible={this.state.modal_deleteEdition} onClose={ () => this.setState({ modal_deleteEdition : false }) }>
                    <p>Deleting an edition is irreversible, and will require you to select an edition to replace this one in case it was assigned to one or many articles.</p>
                    <h3>Replace edition with</h3>
                    <SelectField name="delete-edition-replace" options={
                        this.props.allEditions.map(x => ({ displayname : x.displayname, value : x._id }))
                    } onChange={(name, value) => this.stage.deleteReplaceWith = value} />

                    <ButtonWorker theme="red" type="fill" text="Delete edition" work={this.deleteEdition.bind(this)} />
                </Modal>
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
                languages : [...DEFAULT_LANGUAGES],
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

    onDelete() {
        API.get('/editions/all', {}, (err, data) => this.setState({
            levels : data.levels,
            sections : data.sections,
            selectedEditions : []
        }));
    }

    onDup(newid) {
        API.get('/editions/all', {}, (err, data) => {
            const newed = data.levels[this.state.selectedLevel].editions.find(x => x._id == newid)
            newed.selected = true;
            this.setState({
                levels : data.levels,
                sections : data.sections,
                selectedEditions : [newed]
            });
        });
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
                        <EditionEdit 
                            onDelete={this.onDelete.bind(this)}
                            onDup={this.onDup.bind(this)}

                            level={this.state.selectedLevel} 
                            languages={this.state.languages} 
                            theme={this.state.theme} 
                            editions={this.state.selectedEditions} 
                            allEditions={this.state.levels[this.state.selectedLevel].editions} /> 
                    ) }
                </div>
            </div>
        );
    }
}
