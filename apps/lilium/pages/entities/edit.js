import { Component, h } from 'preact';
import API from '../../data/api';
import { Spinner } from '../../layout/loading'
import { TextField, MultitagBox } from '../../widgets/form'

export default class Entity extends Component {
    constructor(props) {
        super(props);

        this.state = { loading: true, entity: {} };
    }

    componentDidMount() {
        API.getMany(
            [{ endpoint:'/entities/single/' + this.props.entityId }, { endpoint: '/sites/all/simple' }, { endpoint: '/role' }],
            (err, data) => {
                if (Object.values(err).filter(x => x).length == 0) {
                    this.setState({
                        loading: false,
                        entity: data['/entities/single/' + this.props.entityId].entity,
                        roles: data['/role'],
                        sites: data['/sites/all/simple']
                    });
                    console.log(this.state);
                } else {
                    log('Entities.edit', 'Error fetching the requested entity', 'err');
                    console.log(err);
                }
            }
        );
    }

    render() {
        if (!this.state.loading) {
            return (
                <div id="entities">
                    <h1>Edit</h1>
                    <div id="info" style={{ width: '75vw', margin: '0 auto' }}>
                        <img src={this.state.entity.avatarURL} alt={`${this.state.entity.displayname}'s profile picture`} className="profile-picture"/>
                        <TextField name='displayname' initialValue={this.state.entity.displayname} placeholder='Display Name' />
                        <TextField name='username' initialValue={this.state.entity.username} placeholder='Username' />
                        <TextField name='email' initialValue={this.state.entity.email} placeholder='Email address' type='email' />
                        <TextField name='phone' initialValue={this.state.entity.phone} placeholder='Phone number' type='phone' />
                        <MultitagBox name='roles' initialValue={this.state.entity.roles} placeholder='Roles' />
                        <MultitagBox name='sites' initialValue={this.state.entity.roles} placeholder='Sites' />
                    </div>
                </div>
            );
        } else {
            return (
                <Spinner />
            );
        }
    }
}
