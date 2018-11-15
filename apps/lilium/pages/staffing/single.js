import { h, Component } from "preact";
import API from "../../data/api";
import { Link } from '../../routing/link';
import { BigList, BigListToolBarBuilder } from '../../widgets/biglist';
import { Spinner } from '../../layout/loading';
import { ButtonWorker, TextField, SelectField } from '../../widgets/form';
import { revokeAccess, enableAccess } from '../../pages/entities/lib';

export default class SingleView extends Component {
    constructor(props) {
        super(props);
        this.state = {
            staffid : this.props.staffid,
            staff : undefined
        }
    }

    componentDidMount() {
        this.loadFromState();
    }

    componentWillReceiveProps(props) {
        if (props.staffid != this.props.staffid) {
            this.setState({ staff : undefined, staffid : props.staffid }, () => {
                this.loadFromState();
            })
        }
    }

    loadFromState() {
        API.get('/staffing/single/' + this.state.staffid, {}, (err, json, r) => {
            this.setState({ staff : json.staff });
        });
    }

    grant(done) {
        enableAccess(this.state.staff.entity, revoked => {
            this.loadFromState();
            done();
        });
    }

    revoke(done) {
        revokeAccess(this.state.staff.entity, revoked => {
            this.loadFromState();
            done();
        });
    }
    
    terminate(done) {
        API.delete('/staffing/terminate/' + this.state.staffid + '/' + this.state.staff.entity._id, {}, (err, json, r) => {
            this.loadFromState();
            done();
        });
    }

    restore(done) {
        API.put('/staffing/restore/' + this.state.staffid, {}, (err, json, r) => {
            this.loadFromState();
            done();
        });
    }

    onChange(name, value) {
    }

    render() {
        if (!this.state.staff) {
            return <Spinner centered={true} />
        }

        return (
            <div class="single-staff-wrap">
                <div class="single-staff-header">
                    <img src={this.state.staff.entity.avatarURL} />
                    <div class="single-staff-header-details">
                        <h2>{this.state.staff.legalname}</h2>
                        <div>
                            <small>{this.state.staff._id}</small>
                        </div>
                    </div>
                    <div class="single-staff-actions">
                        { this.state.staff.entity.revoked ? 
                            ( <ButtonWorker work={this.grant.bind(this)} text="Grant Access" theme="blue" type="outline" />) :
                            ( <ButtonWorker work={this.revoke.bind(this)} text="Revoke Access" theme="red" type="outline" />) 
                        }
                        { this.state.staff.status == "active" ?
                            ( <ButtonWorker work={this.terminate.bind(this)} text="Terminate" theme="red" type="fill" /> ) :
                            ( <ButtonWorker work={this.restore.bind(this)} text="Restore" theme="blue" type="fill" /> )
                        }
                    </div>
                </div>
                
                <div class="single-staff-form" style={{ maxWidth: 720, margin: "20px auto" }}>
                    <TextField placeholder="Legal Full Name" name="legalname" autosave={true} savemethod="put" endpoint={"/staffing/edit/" + this.state.staffid} initialValue={this.state.staff.legalname} />
                </div>
            </div>
        )
    }
}
