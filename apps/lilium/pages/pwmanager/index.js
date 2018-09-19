import { Component, h } from "preact";
import API from "../../data/api";
import { castNotification } from "../../layout/notifications";
import Modal from "../../widgets/modal";
import { TextField, ButtonWorker } from "../../widgets/form";

class Password extends Component {
    constructor(props) {
        super(props);
    }

    static generateRandom() {
        let generated = '';
        if (window.crypto && window.crypto.getRandomValues) {
            const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#[]{}$%&?()';
            console.log(charset.length);
            const passwordLength = Math.floor(Math.random() * (16 - 12)) + 12;
            console.log(passwordLength);
            let values = new Uint16Array(passwordLength);
            window.crypto.getRandomValues(values);
            for (let i = 0; i < passwordLength; i++) {
                console.log(i);
                console.log(values[i]);
                console.log(values[i] % charset.length);
                generated += charset[values[i] % charset.length];
            }
        }

        return generated;
    }

    render() {
        return (
            <div className="password">
                <h1>{this.props.name}</h1>
                <h2>{this.props.plaintext}</h2>
            </div>
        )
    }
}

export default class PwManager extends Component {
    constructor(props) {
        super(props);
        this.state = {
            categories: [],
            createCategoryModalVisible: false,
            createPasswordModalVisible: false
        };
    }

    static get pagesettings()  {
        return {
            title : "Password Manager"
        }
    }

    componentDidMount() {
        API.get('/pwmanager/categories', {}, (err, data, r) => {
            if (r.status == 200) {
                this.setState({ categories: data.categories });
            } else {
                castNotification({
                    title: 'Could not fetch passwords from the server',
                    type: 'error'
                })
            }
        })
    }

    render() {
        log('PwManager', 'Rendering PwManager pane with ' + this.props.levels.length + ' levels', 'detail');
        return (
            <div id="pw-manager" style={{ width: '800px', margin: 'auto' }}>
                <Modal visible={this.state.createCategoryModalVisible} title='Create a new password category'>
                    <TextField name='name' placeholder='Name' />
                    <ButtonWorker text='Create' />
                </Modal>

                <Modal visible={this.state.createPasswordModalVisible} title='Create a new password'>
                    <TextField name='name' placeholder='Name' />
                    <TextField name='plaintext' placeholder="Password (make sure it's secure)" initialValue={Password.generateRandom()} />
                    <p>
                        Lilium will attempt to autogenerate a password for you but it's possible that your browser does not support 
                        the necessary features. In that case, it's advised that you use a random string generator to generate a password
                        that is not vulnerable to dictionnary attacks and that is impossible to guess.
                    </p>
                    <ButtonWorker text='Create' />
                </Modal>
                <h1>Password Manager</h1>
                {
                    this.state.categories.map(category => (
                        <div className="card">
                            <div class="detail-head">
                                <h2>{category.name}</h2>
                                {
                                    category.passwords.map(password => (
                                        <Password name={password.name} plaintext={password.plaintext} />    
                                    ))
                                }
                                <div className="button" onClick={() => { this.setState({ createPasswordModalVisible: true }) }}>
                                    <span>Create a new password</span>
                                </div>
                            </div>
                        </div>
                    ))
                }
                <div className="button" onClick={() => { this.setState({ createCategoryModalVisible: true }) }}>
                    <span>Create a new category</span>
                </div>
            </div>
        )
    }
}
