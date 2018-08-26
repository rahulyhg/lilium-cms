import { h, Component } from "preact";
import API from '../../data/api';
import { Spinner } from '../../layout/loading';
import { TextField, CheckboxField, SelectField, DatePicker } from '../../widgets/form';
import { TextEditor } from '../../widgets/texteditor';

const styles = {
    title : {
        fontSize : 38,
        fontFamily : "'Yanone Kaffeesatz', sans-serif",
        padding : "12px 16px 8px"
    }
};

export default class CakepopEditPage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading : true
        };

        this.coldState = {};
    }

    componentDidMount() {
        API.get("/cakepop/single/" + this.props.id, {}, (err, data, r) => {
            if (data) {
                this.coldState = data;
                this.setState({
                    loading : false
                }); 
            } else {
                this.setState({
                    loading : false,
                    error : err || "Not found"
                });
            }
        });
    }

    changed(field, value) {
        this.coldState[field] = value;
        API.post('/cakepop/updateOneField/' + this.props.id, { field, value }, () => {
            log('Cakepop', 'Updated one field : ' + field, 'success');
        });
    }

    render() {
        if (this.state.error) {
            return (
                <div>Could not load cakepop : {this.state.error}</div>
            )
        }

        if (this.state.loading) {
            return (
                <div><Spinner /></div>
            );
        }
        
        return (
            <div class="cakepop-edit-page">
                <TextField     onChange={this.changed.bind(this)} name="title"      initialValue={this.coldState.title} placeholderType="inside" style={styles.title} placeholder="Cakepop identifier" />
                <TextEditor    onChange={this.changed.bind(this)} name="content"    content={this.coldState.content} style={{ marginBottom : 15 }} />
                <TextField     onChange={this.changed.bind(this)} name="stylesheet" multiline={true} initialValue={this.coldState.stylesheet} placeholder="Custom Stylesheet" />
                <DatePicker    onChange={this.changed.bind(this)} name="expiry"     initialValue={new Date(this.coldState.expiry)} format={x => x && x.getTime()} placeholder="Expiry" />
                <SelectField   onChange={this.changed.bind(this)} name="status"     initialValue={this.coldState.status} placeholder="Status" options={[
                    { displayname : "Draft", value : "creation" },
                    { displayname : "Live", value : "live" }
                ]} />

                <CheckboxField onChange={this.changed.bind(this)} name="auto"       initialValue={this.coldState.auto} placeholder="Automatically popup on next reload" />
            </div>
        )
    }
}