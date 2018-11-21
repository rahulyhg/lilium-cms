import { Component, h } from "preact";
import API from "../../data/api";
import { castNotification } from "../../layout/notifications";
import Modal from "../../widgets/modal";
import { SelectField, ButtonWorker, CheckboxField } from "../../widgets/form";

export default class ReportGenerator extends Component {
    constructor(props) {
        super(props);
        this.state = {
            
        }
    }
    
    componentDidMount() {x
        
    }
    
    render() {
        return (
            <div>Payments report</div>
        );
    }
}