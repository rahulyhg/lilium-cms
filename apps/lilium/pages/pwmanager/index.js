import { Component, h } from "preact";
import API from "../../data/api";
import { castNotification } from "../../layout/notifications";
import Modal from "../../widgets/modal";
import { TextField, ButtonWorker, EditableText } from "../../widgets/form";

class Password extends Component {
    constructor(props) {
        super(props);
        this.values = {};
    }

    /**
     * @returns {string}  Randomly generated password of a random length (between 12 and 16) that comprises
     * upper case and lower case letters, numbers and symbols
     */
    static generateRandom() {
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
                message: `Your browser doesn't seem to support the features necessary to generate a secure ranodm password.  It's advised that you use an external yet secure random string generator`,
                type : 'info'
            });
        }

        return generated;
    }

    updateValue(name, val) {
        this.values[name] = val;
        API.put('/pwmanager/passwords/' + this.props.id, this.values, (err, data, r) => {
            if (r.status == 200) {
                castNotification({
                    title: 'Password updated',
                    message : "The password has been encrypted safely.",
                    type : 'success'
                })
            } else {
                castNotification({
                    title: 'Password not updated',
                    message : "The password could not be saved.",
                    type : 'error'
                })
            }
        });
    }

    render() {
        return (
            <div className="password">
                <i onClick={this.props.deletePassword.bind(this, this.props.id)} className="delete-password fal fa-trash"></i>
                <div className="password-name">
                    <EditableText initialValue={this.props.name} name='name' placeholder='Name' placeholderType='inside' onChange={this.updateValue.bind(this)} />
                </div>
                <div className="password-plaintext">
                    <EditableText initialValue={this.props.plaintext} name='plaintext' placeholder='plaintext'  placeholderType='inside' onChange={this.updateValue.bind(this)} />
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
            newPasswordName: '',
            newPasswordPlaintext: ''
        }
    }

    createPassword(done) {
        API.post('/pwmanager/passwords/' + this.props._id, { name: this.state.newPasswordName, plaintext: this.state.newPasswordPlaintext }, (err, data, r) => {
            if (r.status == 200) {
                const passwords = this.state.passwords;
                passwords.push(data.inserted);
                this.setState({ passwords, createPasswordModalVisible: false, newPasswordName: '', newPasswordPlaintext: '' });
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
        const newState = {};
        newState[name] = val;

        this.setState(newState);
    }

    autoGeneratePassword() {
        this.updateValue('newPasswordPlaintext', Password.generateRandom());
    }

    deletePassword(id) {
        API.delete('/pwmanager/passwords/' + id, {}, (err, data, r) => {
            if (r.status == 200) {
                let passwords = this.state.passwords;
                passwords = passwords.filter(password => password._id != id);
                this.setState({ passwords });
                castNotification({
                    title: 'Password removed',
                    type: 'success'
                })
            } else {
                castNotification({
                    title: 'Error removing password',
                    type: 'error'
                })
            }
        })
    }

    render() {
        return (
            <div className="category card">
                <Modal visible={this.state.confirmRemoveModalVisible} title='Confirm Category Removal' onClose={() => { this.setState({ confirmRemoveModalVisible: false }) }}>
                    <h2>{`Do you really want to remove the '${this.props.name}' category?`}</h2>
                    <p>
                        If you choose to remove this category, it will be deleted along with <b>{`all the ${this.props.passwords.length || ''} passwords`}</b> it contains.
                        Please, before removing this category, make sure that all the passwords it contains are <b>no longer in use</b>.
                        This action <b>cannot be reversed</b>.
                    </p>
                    <p>In order to <b>preserve</b> the category, click the <b>Cancel</b> button.</p>
                    <p>If you wish to <b>continue with the deletion</b>, click on the <b>I understand, remove</b> button.</p>
                    <div style={{ textAlign: 'right' }} >
                        <ButtonWorker theme='blue' type='outline' text='Cancel' sync={true} work={() => this.setState({ confirmRemoveModalVisible: false })} />
                        <ButtonWorker theme='red' type='fill' text='I understand, remove' work={this.props.removeCategory.bind(this, this.props._id)} />
                    </div>
                </Modal>

                <Modal visible={this.state.createPasswordModalVisible} title='Create a new password' onClose={() => {  this.setState({ createPasswordModalVisible: false })}}>
                    <TextField name='newPasswordName' placeholder='Name' onChange={this.updateValue.bind(this)} value={this.state.newPasswordName} />
                    <TextField name='newPasswordPlaintext' placeholder="Password (make sure it's secure)" value={this.state.newPasswordPlaintext}
                                    onChange={this.updateValue.bind(this)} />
                    <div className="button blue outline" onClick={this.autoGeneratePassword.bind(this)}>Generate Password</div>
                    <p>
                        If you click on 'Generate Password', Lilium will attempt to autogenerate a password for you but it's possible that your browser does not support 
                        the necessary features. In that case, it's advised that you use a random string generator to generate a password
                        that is not vulnerable to dictionnary attacks and that is impossible to guess.
                    </p>
                    <ButtonWorker text='Create' work={this.createPassword.bind(this)} theme='purple' type='fill' />
                </Modal>

                <div class="detail-head">
                    <div class="bubble-wrap">
                        <b className='big'><span>{this.props.name}</span></b>
                        <span class="bubble">
                            <EditableText initialValue={this.props.right} onChange={this.updateValue.bind(this)} />
                        </span>
                    </div>
                </div>
                <div class="detail-list">
                    {
                        this.state.passwords.length ? null : (<center>There are no passwords in this category</center>)
                    }
                    {
                        this.state.passwords.map(password => (
                            <Password name={password.name} key={password._id} plaintext={password.plaintext} id={password._id} deletePassword={this.deletePassword.bind(this)} />    
                        ))
                    }
                </div>
                <footer>
                    <span className="clickable" onClick={() => {this.setState({ createPasswordModalVisible: true })}}><i className="fal fa-plus"></i> Create a new password</span>
                    <span className='clickable red' onClick={() => { this.setState({ confirmRemoveModalVisible: true }) }}><i className="fal fa-trash"></i> Remove Category</span>
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

    createCategory(done) {
        API.post('/pwmanager/categories', this.createCategoriesValues, (err, data, r) => {
            if (r.status == 200) {
                const categories = this.state.categories;
                categories.push(data.inserted);
                this.setState({ categories, createCategoryModalVisible: false });
                done && done()
            } else {
                castNotification({
                    title: 'Error creating the new password',
                    type: 'error'
                })

                done && done()
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
            <div id="pw-manager">
                <Modal visible={this.state.createCategoryModalVisible} title='Create a new password category' onClose={() => {  this.setState({ createCategoryModalVisible: false })}}>
                    <TextField name='name' placeholder='Name' onChange={(name, val) => { this.createCategoriesValues[name] = val; }} />
                    <TextField name='right' placeholder='Right necessary to access this category'
                                onChange={(name, val) => { this.createCategoriesValues[name] = val; }} />
                    <ButtonWorker text='Create' work={this.createCategory.bind(this)} theme='purple' type='fill' />
                </Modal>

                <div class="leader-title">
                    <div class="leader-title-responsive">
                        <h1>Password Manager</h1>
                        <p>A centralized password bank with controlled access, grouping, and dynamic encryption.</p>
                        <div className="button purple fill" onClick={() => { this.setState({ createCategoryModalVisible: true }) }}>
                            <span>Create a new category</span>
                        </div>
                    </div>
                </div>
                <div class="leader-content classic">
                {
                    this.state.categories.map(category => (
                        <Category {...category} removeCategory={this.removeCategory.bind(this)} key={category._id} />
                    ))
                }
                </div>
            </div>
        )
    }
}
