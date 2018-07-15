import { h, Component } from 'preact';
import { TIMING } from '../data/const';
import API from '../data/api';

export class Lys extends Component {
    constructor(props) {
        super(props);
        this.state = {
            visible : false,
            choices : [],
            posts : []
        };

        this.shiftDown = false;
        this.keyUpBoxBinding = this.boxKeyUp.bind(this);
        this.commands = [];
    }

    componentDidMount() {
        log('Lys', 'Binding on key down and key up', 'detail');
        window.addEventListener('keydown', this.keyDown.bind(this));
        window.addEventListener('keyup', this.keyUp.bind(this));
    }

    componentWillReceiveProps(props) {
        if (props.menus) {
            this.commands = [];
            props.menus.map(x => {
                return [{
                    command : x.displayname.toLowerCase(),
                    displayname : x.displayname,
                    icon : "fa " + x.faicon,
                    url : x.absURL.replace('admin', '')
                }, ...x.children.map( y => {
                    return {
                        command : y.displayname.toLowerCase(),
                        displayname : y.displayname,
                        icon : "fa " + y.faicon,
                        url : y.absURL.replace('admin', '')
                    }
                })];
            }).forEach(x => this.commands.push(...x));

            log('Lys', 'Handling now ' + this.commands.length + ' built-in commands', 'success');
        }
    }

    display() {
        log('Lys', 'Making Lys visible', 'detail');            
        this.shiftDown = false;
        this.setState({ visible : true }, () => {
            const box = document.getElementById('lys-input');
            box.value = "";
            box.focus();
        });
    }

    hide() {
        this.setState({ visible : false, choices : [] });
        this.shiftDown = false;
    }

    executeCommand(cmd) {
        log('Lys', 'Executing command : ' + cmd, 'detail');
        if (cmd != "?") {

            this.hide();
        }
    }

    boxKeyUp(ev) {
        const text = ev.target.value.trim().toLowerCase()

        this.refreshSearchTimeout(text);
        ev.keyCode == 13 && this.executeCommand(text);
    }

    keyDown(ev) {
        if (ev.keyCode == 16) {
            this.shiftDown = true;
        } else if (ev.keyCode == 32 && this.shiftDown && !this.state.visible) {
            this.display();
            ev.preventDefault();
        } else if (this.state.visible && ev.keyCode == 27) {
            this.hide();
            ev.preventDefault();
        }
    }

    fillSearch(text) {
        log('Lys', 'Filling search from timeout', 'detail');
        API.get('/search', {
            q : text,
            scoresort : true
        }, (err, results) => {
            if (!err && results && results.length != 0) {
                this.setState({
                    posts : results
                });
            }
        })
    }

    refreshSearchTimeout(text) {
        this.searchTimeout && clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(this.fillSearch.bind(this, text), TIMING.LYS_QUICK_SEARCH);

        const choices = this.commands.filter(x => x.command.includes(text))
        this.setState({
            choices     
        });
    }

    keyUp(ev) {
        if (ev.keyCode == 16 && !this.state.visible) {
            this.shiftDown = false;
        } 
    }

    render() {
        if (!this.state.visible) {
            return null;
        }

        log('Lys', 'Rendering Lys overlay with input box', 'detail');
        return (
            <div id="lys-wrap">
                <div id="lys">
                    <input type="text" id="lys-input" placeholder="What are you looking for?" onKeyUp={this.keyUpBoxBinding} />
                    <div id="lys-sugg-cmds">
                        {
                            this.state.choices.map(text => (
                                <div>
                                    <b>{text.displayname}</b>
                                </div>
                            ))
                        }
                    </div>
                    <div id="lys-sugg-posts">
                        {
                            this.state.posts.map(post => (
                                <div>
                                    <b>{post.title}</b>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>
        )
    }
}