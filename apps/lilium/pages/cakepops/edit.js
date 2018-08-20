import { h, Component } from "preact";
import API from '../../data/api';
import { Spinner } from '../../layout/loading';
import { TextField, CheckboxField, SelectField } from '../../widgets/form';
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
                    error : err || "Not found"
                });
            }
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
                <TextField initialValue={this.coldState.title} placeholderType="inside" style={styles.title} placeholder="Cakepop identifier" />
                <TextEditor content={this.coldState.content} />
                <TextField multiline={true} initialValue={this.coldState.stylesheet} placeholder="Custom Stylesheet" />
                <CheckboxField initialValue={this.coldState.auto} placeholder="Automatically popup on next reload" />
                <TextField initialValue={this.coldState.expiry} placeholder="Expiry" type="date" />
                <SelectField initialValue={this.coldState.status} placeholder="Status" options={[
                    { displayname : "Draft", value : "creation" },
                    { displayname : "Live", value : "live" }
                ]} />
            </div>
        )
    }
}