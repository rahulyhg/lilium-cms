import { Component, h } from "preact";
import API from "../../data/api";
import { castNotification } from "../../layout/notifications";
import Modal from "../../widgets/modal";
import { TextField, ButtonWorker, EditableText } from "../../widgets/form";

class Password extends Component {
    constructor(props) {
        super(props);
    }

    /**
     * @returns {string}  Randomly generated password of a random length (between 12 and 16) that comprises
     * upper case and lower case letters, numbers and symbols
     */
    static generateRandom() {
        alert('generating random');
        let generated = '';
        if (window.crypto && window.crypto.getRandomValues) {
            const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#[]{}$%&?()';
            const passwordLength = Math.floor(Math.random() * (16 - 12)) + 12;
            let values = new Uint16Array(passwordLength);
            window.crypto.getRandomValues(values);
            for (let i = 0; i < passwordLength; i++) {
                generated += charset[values[i] % charset.length];
            }
        } else {
            castNotification({
                title: "Your browser is unable to generate a secure password",
                message: `Your browser doesn't seem to support the features necessary to generate a secure ranodm password.
                        It's advised that you use an external yet secure random string generator`
            });
        }

        return generated;
    }

    render() {
        return (
            <div className="password">
                <div className="password-name">
                    <EditableText initialValue={this.props.name} placeholder='Name' placeholderType='inside' />
                </div>
                <div className="password-plaintext">
                    <EditableText initialValue={this.props.plaintext} placeholder='plaintext'  placeholderType='inside' />
                </div>
            </div>
        )
    }
}

class Category extends Component {
    constructor(props) {
        super(props);
        this.createPasswordValues = {};
        this.state = {
            passwords: this.props.passwords || [],
            createPasswordModalVisible: false,
            autoGeneratedPassword: ''
        }
    }

    createPassword(done) {
        API.post('/pwmanager/passwords/' + this.props._id, this.createPasswordValues, (err, data, r) => {
            if (r.status == 200) {
                const passwords = this.state.passwords;
                passwords.push(data.inserted);
                this.setState({ passwords, createPasswordModalVisible: false });
                done && done();
            } else {
                castNotification({
                    title: 'Error creating the new password',
                    type: 'error'
                })
                done && done();
            }
        });
    }

    updateValue(name, val) {
        
    }

    autoGeneratePassword() {
        this.setState({ autoGeneratedPassword: Password.generateRandom() });
    }

    render() {
        return (
            <div className="category card">
                {
                    this.state.createPasswordModalVisible ? (
                        <Modal visible={this.state.createPasswordModalVisible} title='Create a new password'>
                            <TextField name='name' placeholder='Name' onChange={(name, val) => { this.createPasswordValues[name] = val; }} />
                            <TextField name='plaintext' placeholder="Password (make sure it's secure)" value={this.state.autoGeneratedPassword}
                                        onChange={(name, val) => { this.createPasswordValues[name] = val; }} />
                            <div className="button" onClick={this.autoGeneratePassword.bind(this)}>Generate Password</div>
                            <p>
                                If you click on 'Generate Password', Lilium will attempt to autogenerate a password for you but it's possible that your browser does not support 
                                the necessary features. In that case, it's advised that you use a random string generator to generate a password
                                that is not vulnerable to dictionnary attacks and that is impossible to guess.
                            </p>
                            <ButtonWorker text='Create' work={this.createPassword.bind(this)} />
                        </Modal>
                    ) : null
                }

                <div class="detail-head">
                    <h1 classNema='big-title'>{this.props.name}</h1>
                    <h2 classNema='category-right' title={`This category is only visible by people who have the '${this.props.right}' right`}>Right</h2>
                        <EditableText initialValue={this.props.right} onChange={this.updateValue.bind(this)} />
                    {
                        this.state.passwords.length ? (<h2>Passwords</h2>) : (<h3>There are no passwords in this category</h3>)
                    }
                    {
                        this.state.passwords.map(password => (
                            <Password name={password.name} plaintext={password.plaintext} />    
                        ))
                    }
                </div>
                <footer>
                    <span onClick={() => {this.setState({ createPasswordModalVisible: true })}}>Create a new password</span>
                    <span className='red' onClick={this.props.removeCategory.bind(this, this.props._id)}>Remove Category</span>
                </footer>
            </div>
        );
    }
}

export default class PwManager extends Component {
    constructor(props) {
        super(props);

        this.createCategoriesValues = {};

        this.state = {
            categories: [],
            createCategoryModalVisible: false
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

    createCategory() {
        API.post('/pwmanager/categories', this.createCategoriesValues, (err, data, r) => {
            if (r.status == 200) {
                const categories = this.state.categories;
                categories.push(data.inserted);
                this.setState({ categories, createCategoryModalVisible: false });
            } else {
                castNotification({
                    title: 'Error creating the new password',
                    type: 'error'
                })
            }
        });
    }

    removeCategory(id) {
        API.delete('/pwmanager/categories/' + id, {}, (err, data, r) => {
            if (r.status == 200) {
                let categories = this.state.categories;
                categories = categories.filter(category => category._id != id);
                this.setState({ categories });
                castNotification({
                    title: 'Category removed',
                    type: 'success'
                });
            } else {
                castNotification({
                    title: 'Error removing category',
                    type: 'error'
                });
            }
        })
    }

    render() {
        log('PwManager', 'Rendering PwManager pane with ' + this.props.levels.length + ' levels', 'detail');
        return (
            <div id="pw-manager" style={{ width: '800px', margin: 'auto' }}>
                <Modal visible={this.state.createCategoryModalVisible} title='Create a new password category'>
                    <TextField name='name' placeholder='Name' onChange={(name, val) => { this.createCategoriesValues[name] = val; }} />
                    <TextField name='right' placeholder='Right necessary to access this category'
                                onChange={(name, val) => { this.createCategoriesValues[name] = val; }} />
                    <ButtonWorker text='Create' work={this.createCategory.bind(this)} />
                </Modal>

                <h1>Password Manager</h1>
                {
                    this.state.categories.map(category => (
                        <Category {...category} removeCategory={this.removeCategory.bind(this)} />
                    ))
                }
                <div className="button" onClick={() => { this.setState({ createCategoryModalVisible: true }) }}>
                    <span>Create a new category</span>
                </div>
            </div>
        )
    }
}