import { Component, h } from "preact";
import API from '../../data/api';
import { MultitagBox, EditableText, TextField, ButtonWorker } from '../../widgets/form';
import Modal from '../../widgets/modal';
import { BigList } from '../../widgets/biglist';

class Role extends Component {
    constructor(props) {
        super(props);

        this.state = { role: this.props.item }
    }

    editField(name, value) {
        const payload = {};
        payload[name] = value;
        API.post('/role/quickedit/' + this.state.role._id, payload, (err, data, r) => {
            if (r.status == 200 &&data.ok) {
                const role = this.state.role;
                role[name] = value;
                this.setState({ role });
            } else {
                log('Role', 'Error editing role', 'err');
            }
        });
    }

    render() {
        return (
            <div class="card flex">
                <div className="role" style={{ padding: '4px 12px' }}>
                    <EditableText initialValue={this.state.role.displayname} name='displayname'onChange={this.editField.bind(this)} />
                    <EditableText initialValue={this.state.role.name} name='name' onChange={this.editField.bind(this)} />
                </div>
    
                <MultitagBox initialValue={this.state.role.rights} name='rights' onChange={this.editField.bind(this)} />
            </div>
        );
    }
}

export class RolesList extends Component {
    constructor(props) {
        super(props);

        this.values = {};
        this.state = { roles: [], createModalVisible: props.modalShown || false};
    }

    componentDidMount() {

    }

    createRole() {
        API.post('/role/create', this.values, (err, data, r) => {
            if (r.status == 200) {
                const roles = this.state.roles;
                roles.push(this.values);
                this.setState({ roles });
                log('Role', 'Role added', 'success');
            }
        });
    }

    render() {
        return (
            <div id="roles-management">
                <Modal visible={this.state.createModalVisible} title='Create a role' onChange={(name, val) => { this.values[name] = val; }} >
                    <TextField name='displayname' placeholder='Display Name' onChange={(name, val) => { this.values[name] = val; }} />
                    <TextField name='name' placeholder='Name' onChange={(name, val) => { this.values[name] = val; }} />
                    <MultitagBox name='rights' placeholder='Rights' onChange={(name, val) => { this.values[name] = val; }} />
                    <hr />
                    <ButtonWorker text='Create Role' work={() => {this.createRole(); this.setState({ createModalVisible: false })} } />
                </Modal>
                <div id="roles-management-header">
                    <h1 style={{ display: 'inline-block' }}>Roles Management</h1>
                    <ButtonWorker text='Create Role' style={{ float: 'right', margin: '16px' }} work={done => { this.setState({ createModalVisible: true }); done && done(); } } />
                </div>
                <div id="roles">
                    <BigList endpoint="/role/bunch" listitem={Role}  />
                </div>
            </div>
        )
    }
}
