/*
 * Lilium v4 - Onboarding 
 *
 * Scene-based onboarding with interactive forms.
 *
 */

import { h, Component } from 'preact';
import { navigateTo } from '../../routing/link';
import API from '../../data/api';

const onboardingScript = [
    { 
        text : () => "Hi! Welcome to our amazing content management system, Lilium. My name is Lys, and I will guide you through the onboarding process. It won't take long.", 
        type : "accept", 
        action : "Let's do it.",
        id : "welcome"
    }, { 
        text : () => "Now that you know my name, mind if I ask yours?", 
        type : "text", 
        placeholder : "Your legal full name",
        field : "displayname",
        action : "Next",
        id : "displayname"
    }, { 
        text : () => `${liliumcms.session.displayname.split(' ')[0]}! That's a great name.`, 
        type : "accept", 
        action : "What?",
        id : "name-what"
    }, { 
        text : () => `Your username is ${liliumcms.session.username}. Might be a good idea to write it down. An idea almost as good as your name.`, 
        type : "accept", 
        action : "Thanks?",
        id : "username"
    }, { 
        text : () => `${liliumcms.session.displayname.split(' ')[0]}, let's find a strong password for you. Well, you find it. Otherwise your password will be terrible.`, 
        type : "password", 
        placeholder : "Choose a password",
        field : "password",
        id : "password",
        action : "Don't tell anyone"
    }, { 
        text : () => `That was intense. Now. We'll need your phone number. Don't worry, I won't call you to talk about content management.`,
        type : "text",
        placeholder : "Your phone number",
        field : "phone",
        action : "Is this over soon?",
        id : "phone"
    }, {
        text : () => "An image is worth a thousand pixels. I mean, words. Let's upload a picture of your face. Square pictures usually scale better.",
        type : "upload",
        field : "avatar",
        action : "Upload picture",
        id : "avatar"
    }, {
        text : () => "I'm jealous. Wish I had a face, too. Anyways. Lilium has two different kind of interfaces. One shows more content, the other shows more menus. You can always change this later.",
        type : "interface",
        field : "interface",
        id : "interface",
        action : "That one"
    }, {
        text : () => `Got it. ${liliumcms.session.displayname.split(' ')[0]}, this is the beginning of such an amazing adventure. If you ever need me, well, I mean, call your friend or something. Now fly, young one!`,
        type : "accept",
        action : "Uh-huh. What?",
        id : "done"
    }
];

class OnboardingPanel extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value : ""
        }
    }

    onKeyUp(ev) {
        this.setState({ value : ev.target.value }, () => {
            if (ev.key == "Enter") {
                this.submit();
            }
        });
    }

    onChange(ev) {
        this.setState({ value : ev.target.value })
    }

    onUploadChange(ev) {
        this.setState({ value : ev.target.files[0] }, () => {
            this.submit();
        });
    }

    submit() {
        this.actionEl.classList.remove('shown');

        setTimeout(() => {
            const words = this.containerEl.querySelectorAll('.p-word');
            words.forEach(x => x.classList.remove('shown'));
        }, 200);

        setTimeout(() => {
            this.props.onSubmit(this.props.panel.id, this.state.value);
            this.setState({ value : "" });
        }, 600);
    }

    componentWillReceiveProps(props) {
        this.setState({ value : "" }, () => {
            this.animateText();
        });
    }

    selectImage() {
        this.uploadEl.click();
    }

    selectInterface(inf) {
        this.setState({value : inf}, () => {
            this.submit();
        });
    }

    renderAction() {
        const type = this.props.panel.type;
        if (type == "text" || type == "password") {
            return (
                <div>
                    <input value={this.state.value} placeholder={this.props.panel.placeholder || ""} type={type} onKeyUp={this.onKeyUp.bind(this)} onChange={this.onChange.bind(this)} />
                    <button class="button-worker purple fill" onClick={this.submit.bind(this)}>{this.props.panel.action}</button>
                </div>  
            );
        } else if (type == "accept") {
            return (
                <div>
                    <button class="button-worker purple fill" onClick={this.submit.bind(this)}>{this.props.panel.action}</button>
                </div>
            );
        } else if (type == "upload") {
            return (
                <div>
                    <input style={{ display: "none" }} ref={x => (this.uploadEl = x)} type="file" onChange={this.onUploadChange.bind(this)} />
                    <button class="button-worker blue fill" onClick={this.selectImage.bind(this)}>{this.props.panel.action}</button>
                </div>  
            );
        } else if (type == "interface") {
            return (
                <div class="interface-picker">
                    <div onClick={this.selectInterface.bind(this, 'menus')} class="interface-thumb interface-menus">
                        <div class="mockheader"></div>
                        <div class="mocklogo"></div>
                        <div class="mocksidebar"></div>
                        <div class="mockbottom"></div>
                    </div>
                    <div onClick={this.selectInterface.bind(this, 'content')} class="interface-thumb interface-content">
                        <div class="mockheader"></div>
                        <div class="mocklogo"></div>
                    </div>
                </div>
            );
        } else {
            throw new Error("Unhandled onboarding panel type : " + type)
        }
    }

    componentDidMount() {
        this.animateText();
    }

    animateText() {
        const words = this.containerEl.querySelectorAll('.p-word');
        words.forEach((word, i) => {
            setTimeout(() => { word.classList.add('shown') }, i * 25);
        });

        setTimeout(() => {
            this.actionEl.classList.add('shown');
        }, words.length * 25 + 100);
    }

    render() {
        return (
            <div ref={x => (this.containerEl = x)} class={"onboarding-panel onboarding-panel-" + this.props.index} id={"onboarding-panel-" + this.props.id}>
                <p>
                    {this.props.panel.text().split(' ').map(word => (<span class="p-word">{word} </span>))}
                </p>
                <div ref={x => (this.actionEl = x)} class="onboarding-actions">
                    {this.renderAction()}
                </div>
            </div>
        );
    }   
}

class CoolLoading extends Component {
    componentDidMount() {
        setTimeout(() => {
            this.titlespan.classList.add("shown");
        }, 200);

        setTimeout(() => {
            this.titlespan.classList.remove("shown");

            setTimeout(() => {
                this.props.done();
            }, 400);
        }, 2000);
    }

    render() {
        return (
            <div>
                <h1>
                    <span ref={titlespan => (this.titlespan = titlespan)}>Lilium CMS</span>
                </h1>
            </div>
        );
    }
}

export default class Onboarding extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading : true,
            page : 0
        };

        this.values = {};
    }

    componentDidMount() {
        setTimeout(() => {
            this.biglogoEl.classList.add('shown');
        });
    }

    present() {
        this.setState({ loading : false })
    }

    finish() {
        document.location = "/lilium/dashboard";
    }

    upload() {
        const fd = new FormData();
        fd.append("picture", this.values.avatar);
        fd.append("displayname", this.values.displayname);
        fd.append("phone", this.values.phone);
        fd.append("password", this.values.password);

        const xhr = new XMLHttpRequest();

        xhr.onload = () => {
            if (xhr.status == 200) {
                try {
                    const resp = JSON.parse(xhr.responseText);
                    this.avatarEl.src = resp.avatarURL;

                    const lazyloadavatar = new Image();
                    lazyloadavatar.onload = () => {
                        this.avatarEl.classList.add('shown');

                        this.nextPanel();
                    };

                    lazyloadavatar.onerror = () => this.uploadError();
                    lazyloadavatar.src = resp.avatarURL;
                } catch (err) {
                    this.uploadError();
                }
            } else {
                this.uploadError();
            }
        };

        xhr.open('POST', '/admin/initialLogin', true);
        xhr.send(fd);
    }

    commitPanel(name, value) {
        this.values[name] = value;
   
        switch (name) {
            case "displayname": 
                liliumcms.session.displayname = value;
                break;

            case "interface":
                if (value == "content") {
                    API.post('/preferences/updatePreference', {
                        preferenceName : "menuLocked",
                        value : false
                    }, () => {});

                    API.post('/preferences/updatePreference', {
                        preferenceName : "stretchUserInterface",
                        value : true
                    }, () => {});
                } else {
                    API.post('/preferences/updatePreference', {
                        preferenceName : "menuLocked",
                        value : true 
                    }, () => {});

                    API.post('/preferences/updatePreference', {
                        preferenceName : "stretchUserInterface",
                        value : false
                    }, () => {});
                }
                break;

            case "avatar":
                return this.upload();
        }

        if (this.state.page == onboardingScript.length - 1) {
            this.finish();
        } else {
            this.nextPanel();
        }
    }

    nextPanel() {
        this.setState({ page : this.state.page + 1 });
    }

    render() {
        const ThatPanel = (
            <OnboardingPanel panel={onboardingScript[this.state.page]} onSubmit={this.commitPanel.bind(this)} />                
        );

        return (
            <div id="onboarding">
                <div class="logo-wrap">
                    <img ref={x => (this.biglogoEl = x)} src="/static/media/lmllogo.png" />
                    <img ref={x => (this.avatarEl = x)} src="" />
                </div>

                <div>
                    {this.state.loading ? <CoolLoading done={this.present.bind(this)} /> : ThatPanel}
                </div>
            </div>
        )
    }
};
