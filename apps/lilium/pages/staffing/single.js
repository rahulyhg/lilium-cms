import { h, Component } from "preact";
import API from "../../data/api";
import { Link } from '../../routing/link';
import { BigList, BigListToolBarBuilder } from '../../widgets/biglist';
import { Spinner } from '../../layout/loading';
import { ButtonWorker, TextField, SelectField, DatePicker } from '../../widgets/form';
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
        API.get('/money/currencies', {}, (err, json, r) => {
            this.currencies = json.currencies;
            this.loadFromState();
        });
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
                    <h2>Employee information</h2>
                    <TextField placeholder="Legal Full Name" name="legalname" autosave={true} savemethod="put" endpoint={"/staffing/edit/" + this.state.staffid} initialValue={this.state.staff.legalname} />
                    <TextField placeholder="Permanent address" name="address" autosave={true} savemethod="put" endpoint={"/staffing/edit/" + this.state.staffid} initialValue={this.state.staff.address} />
                    <TextField placeholder="Social Security Number" name="ssn" autosave={true} savemethod="put" endpoint={"/staffing/edit/" + this.state.staffid} initialValue={this.state.staff.ssn} />
                    <TextField placeholder="Phone number" name="phone" autosave={true} savemethod="put" endpoint={"/staffing/edit/" + this.state.staffid} initialValue={this.state.staff.phone || this.state.staff.entity.phone} type="phone" />

                    <h2>Employment</h2>
                    <TextField placeholder="Position" name="position" autosave={true} savemethod="put" endpoint={"/staffing/edit/" + this.state.staffid} initialValue={this.state.staff.position} />
                    <SelectField placeholder="Schedule" name="schedule" autosave={true} savemethod="put" endpoint={"/staffing/edit/" + this.state.staffid} initialValue={this.state.staff.schedule} options={
                        [{ value : "parttime", text : "Part time" }, { value : "fulltime", text : "Full time" }, { value : "contractor", text : "Contractor" }]
                    } />
                    <div class="single-staff-double-field">
                        <TextField placeholder="Rate" name="rate" autosave={true} savemethod="put" endpoint={"/staffing/edit/" + this.state.staffid} initialValue={this.state.staff.rate} />
                        <SelectField placeholder="Currency" name="currency" autosave={true} savemethod="put" endpoint={"/staffing/edit/" + this.state.staffid} initialValue={this.state.staff.currency} options={
                            this.currencies.map(cur => ({ value : cur.code, text : cur.displayname + " (" + cur.code.toUpperCase() + ")" }))
                       } />
                    </div>
                    <DatePicker placeholder="Start date" name="startdate" autosave={true} savemethod="put" endpoint={"/staffing/edit/" + this.state.staffid} initialValue={this.state.staff.startdate} />

                    {
                        this.state.staff.entity.stripeuserid ? (<div>
                            <div class="field-wrap">
                                <h2>Stripe</h2>
                                <b class="placeholder">Stripe User ID</b>
                                <div>{ this.state.staff.entity.stripeuserid }</div>
                            </div>
                        </div>) : null
                    }
                </div>
            </div>
        )
    }
}
