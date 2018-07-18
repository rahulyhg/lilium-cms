import { h, Component } from "preact";
import API from '../../data/api';

const style = {
    header: {
        backgroundColor: '#2D153B',
        color: 'white',
        padding: '25px',
        display: 'flex',
        fontWeight: 'light',
        flexWrap: 'nowrap'
    },

    profilePicture: {
        width: '250px',
        height: '250px',
        objectFit: 'cover',
        border: '2px solid white',
        borderRadius: '50%',
        backgroundColor: '#333',
        overflow: 'hidden'
    },

    profileInfoWrapper: {
        marginLeft: '40px',
        borderLeft: '1px solid white',
        padding: '0px 30px'
    }
};

export default class ProfilePage extends Component {

    constructor(props) {
        super(props);

        this.state = { user: undefined, err: undefined };
    }

    componentWillMount() {
        API.get('/entities/me', {}, (err, user) => {
            if (!err && user) {
                console.log(user);
                this.setState({ user: user.user, err: undefined });
            } else {
                console.log(err);
                this.setState({ err });x
            }
        });
    }

    render() {
        if (this.state.user) {
            return (
                <div id="profile-header" style={style.header}>
                    <div id="profile-picture-wrapper">
                        <img src={this.state.user.avatarURL} id="profile-picture" style={style.profilePicture} />
                    </div>
                    <div id="profile-info-wrapper" style={style.profileInfoWrapper}>
                        <h1 id="user-name">{this.state.user.username}</h1>
                        <h1 id="first-name">{this.state.user.firstname}</h1>
                        <h1 id="last-name">{this.state.user.lastname}</h1>
                    </div>
                </div>
            );
        } else {
            return (
                <div id="profile-error">
                    <h3>There was an error when trying to retrieve your user info, are you logged in?</h3>
                </div>
            );
        }
    }
}
