import { h, Component } from "preact";
import { addAction } from '../../layout/lys';
import { registerOverlay, dismissOverlay, castOverlay } from '../../overlay/overlaywrap';
import { castNotification } from '../../layout/notifications';
import API from '../../data/api';

import CakepopListPage from './list';
import CakepopEditPage from './edit';
import { navigateTo } from "../../routing/link";

const styles = {
    overlay : {
        position: "fixed",
        top: 0, bottom: 0, left: 0, right: 0,

        zIndex : 12,
        textAlign: 'center'
    },
    overlaytitle : {
        fontSize: 92,
        textAlign : 'center',
        color : "#af7bf1",
        marginTop : 100,
        textShadow : "0px 2px 0px rgb(89, 63, 123)"
    },
    input : {
        fontSize: 32,
        padding: "10px 15px",
        margin: "auto",
        display: "block",
        textAlign: "center",
        marginTop: 30,
        color : "#333",
        width: 640,
        boxSizing : "border-box"
    },
    actionwrap : {
        width: 640, textAlign: "right", margin: "20px auto"
    },
    overlaybuttons : {
        marginLeft : 12,
        fontSize : 18,
        cursor: "pointer"
    }
}

class CreateOverlay extends Component {
    constructor(props) {
        super(props);
        this.state = {

        };
    }

    updateValue(ev) {
        this.value = ev.target.value.trim();
    }

    createCakepop() {
        if (this.value) {
            API.post('/cakepop/new', {
                displayname : this.value
            }, (err, data, r) => {
                if (err || !data || r.status != 200) {
                    castNotification({
                        type : "error",
                        title : "Could not create Cakepop",
                        message : "The Cakepop could not be created. " + err
                    })
                } else {
                    navigateTo("/cakepop/edit/" + data.id);
                }
            });
        } else {
            castNotification({
                type : "warning",
                title : "Missing title",
                message : "You must provide a display title to create a Cakepop."
            })
        }
    }

    dismiss() {
        dismissOverlay();
    }

    render() {
        return (
            <div id="create-cakepop-overlay" class="light-food-pattern" style={styles.overlay}>
                <div style={styles.overlaytitle} class="font2">Create Cakepop</div>
                <input style={styles.input} onChange={this.updateValue.bind(this)} class="font2" placeholder="Provide a Cakepop title" />
                <div style={styles.actionwrap}>
                    <b onClick={this.dismiss.bind(this)} style={styles.overlaybuttons}>Dismiss</b>
                    <b onClick={this.createCakepop.bind(this)} style={styles.overlaybuttons}>Create</b>
                </div>
            </div>
        );
    }
}

export default class CakepopsPage extends Component {
    constructor(props) {
        super(props);
        this.state = {

        };
    }

    static componentDidRegister() {
        log('Cakepop', 'Called register static method from URL Renderer', 'success');
        addAction({
            action : "#create",
            command : "cakepop,popup",
            displayname : "Cakepop",
            execute : () => {
                castOverlay('create-cakepop');
            }
        });

        registerOverlay('create-cakepop', CreateOverlay);
    }

    render() {
        switch (this.props.levels[0]) {
            case "edit" : return (<CakepopEditPage id={this.props.levels[1]} />);
            default : return (<CakepopListPage />);
        }
    }
}