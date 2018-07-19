import { h, Component } from "preact";
import API from '../../data/api';

const style = {
    header: {
        backgroundColor: '#2d153b',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21.184 20c.357-.13.72-.264 1.088-.402l1.768-.661C33.64 15.347 39.647 14 50 14c10.271 0 15.362 1.222 24.629 4.928.955.383 1.869.74 2.75 1.072h6.225c-2.51-.73-5.139-1.691-8.233-2.928C65.888 13.278 60.562 12 50 12c-10.626 0-16.855 1.397-26.66 5.063l-1.767.662c-2.475.923-4.66 1.674-6.724 2.275h6.335zm0-20C13.258 2.892 8.077 4 0 4V2c5.744 0 9.951-.574 14.85-2h6.334zM77.38 0C85.239 2.966 90.502 4 100 4V2c-6.842 0-11.386-.542-16.396-2h-6.225zM0 14c8.44 0 13.718-1.21 22.272-4.402l1.768-.661C33.64 5.347 39.647 4 50 4c10.271 0 15.362 1.222 24.629 4.928C84.112 12.722 89.438 14 100 14v-2c-10.271 0-15.362-1.222-24.629-4.928C65.888 3.278 60.562 2 50 2 39.374 2 33.145 3.397 23.34 7.063l-1.767.662C13.223 10.84 8.163 12 0 12v2z' fill='%239c5ab7' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        color: 'white',
        padding: '25px',
        display: 'flex',
        flexWrap: 'nowrap'
    },

    profilePicture: {
        width: '250px',
        height: '250px',
        objectFit: 'cover',
        border: '2px solid white',
        borderRadius: '50%',
        backgroundColor: '#333',
        overflow: 'hidden',
        cursor: 'pointer',
        ':hover': {
            borderColor: 'red'
        }
    },

    profileInfoWrapper: {
        display: 'flex',
        flexDirection: 'column',
        margin: '0px 40px',
        // borderLeft: '1px solid #9c5ab7',
        // borderRight: '1px solid #9c5ab7',
        padding: '0px 30px'
    },

    inputField: {
        fontWeight: '100',
        fontSize: '32px',
        color: 'white',
        backgroundColor: 'transparent',
        border: '0px',
        borderBottom: '0.5px ridge #9c5ab7',
        outlineColor: '#9c5ab7',
        padding: '4px 10px',
        margin: '8px'
    },

    textarea: {
        fontWeight: '200',
        fontSize: '16px',
        color: 'white',
        backgroundColor: 'transparent',
        border: '0px',
        borderBottom: '0.5px ridge #9c5ab7',
        outlineColor: '#9c5ab7',
        padding: '4px 10px',
        margin: '14px 8px 8px 8px',
        resize: 'none',
    },

    coreInfo: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
    },

    badges: {

    },

    
};

export default class ProfilePage extends Component {

    constructor(props) {
        super(props);

        this.state = { user: undefined, username: 'gabrielcardinal', err: undefined };
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
                    <div id="core-info" style={style.coreInfo}>
                        <div id="profile-picture-wrapper" style={style.coreInfo} >
                            <img src={this.state.user.avatarURL} id="profile-picture" style={style.profilePicture} />
                        </div>
                        <h3 id="username" style={{ alignSelf: 'center' }}>{`@${this.state.username}`}</h3>
                    </div>
                    <div id="profile-info-wrapper" style={style.profileInfoWrapper}>
                        <input type="text" style={style.inputField} value={this.state.user.displayname} />
                        <input type="text" style={style.inputField} value={this.state.user.jobtitle || ''} placeholder='Job Title'/>
                        <textarea name="description" className='change-placeholder' id="descriptichange-placeholderon" cols="30" rows="8" 
                                placeholder='Write a small introduction paragraph'
                                style={style.textarea}></textarea>
                    </div>
                    <div id="badges">
                        {
                            this.state.user.badges.map(badge => {
                                return (
                                    <span className="badge">
                                        {badge.displayname}
                                        <i className="badge-symbol"></i>
                                    </span>
                                );
                            })
                        }
                    </div>
                    <div id="other-info">
                        
                    </div>
                </div>
            );
        } else {
            return (
                <div id="profile-error">
                    <h3>There was an error when trying to retrieve your user info, are you loggedchange-placeholder in?</h3>
                </div>
            );
        }
    }
}
