import { h, Component } from 'preact';
import { TIMING } from '../data/const';
import { navigateTo, Link } from '../routing/link';
import API from '../data/api';

let pageCommands = [];
let commands = [];
let customCommands = [];

export function resetPageCommands()   { pageCommands = [];   }
export function setPageCommands(cmds) { pageCommands = cmds; }
export function addCommand(cmd) { customCommands.push(cmd); }

export class Lys extends Component {
    constructor(props) {
        super(props);
        this.state = {
            visible : false,
            choices : [],
            pageChoices : [],
            posts : []
        };

        this.shiftDown = false;
        this.keyUpBoxBinding = this.boxKeyUp.bind(this);
    }

    componentDidMount() {
        log('Lys', 'Binding on key down and key up', 'detail');
        window.addEventListener('keydown', this.keyDown.bind(this));
        window.addEventListener('keyup', this.keyUp.bind(this));
    }

    componentWillReceiveProps(props) {
        if (props.menus) {
            commands = [];
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
            }).forEach(x => commands.push(...x));

            log('Lys', 'Handling now ' + commands.length + ' built-in commands', 'success');
        }
    }

    display() {
        log('Lys', 'Making Lys visible', 'detail');            
        this.shiftDown = false;
        this.setState({ 
            visible : true, 
            choices : commands,
            pageChoices : pageCommands,
            customChoices: customCommands,
            posts : []
        }, () => {
            const box = document.getElementById('lys-input');
            box.value = "";
            box.focus();
        });
    }

    hide() {
        this.setState({ visible : false, choices : [] });
        this.shiftDown = false;
    }

    goAndHide(url) {
        navigateTo(url);
        this.hide();
    }

    showHelp() {
        log('Lys', 'Showing help panel', 'detail');
        this.setState({ help : true });
    }

    executeCommand(cmd) {
        log('Lys', 'Executing command : ' + cmd, 'detail');
        let willHide = true;

        if (this.state.pageChoices.length != 0) {
            this.state.pageChoices[0].execute();
            log('Lys', 'Executed page command : ' + cmd, 'success');
        } else if (this.state.customChoices.length != 0) {
            this.state.customChoices[0].execute();
            log('Lys', 'Executed Custom Command : ' + cmd, 'success');
        } else if (this.state.choices.length != 0) {
            navigateTo(this.state.choices[0].url);
            log('Lys', 'Executed Lilium command : ' + cmd, 'success');
        } else if (this.state.posts.length != 0) {
            navigateTo("/publishing/write/" + this.state.posts[0]._id);
            log('Lys', 'Navigated to post from Lys', 'success');
        } else {
            log('Lys', 'No command found, showing help', 'detail');
            this.showHelp();
            willHide = false;
        }

        willHide && this.hide();
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
        if (text.length < 3) {
            this.setState({ posts : [] });
        } else {
            API.get('/search/lys', {
                text
            }, (err, results) => {
                if (!err && results && results.length != 0) {
                    this.setState({
                        posts : results, help : false
                    });
                }
            });
        }
    }

    refreshSearchTimeout(text) {
        this.searchTimeout && clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(this.fillSearch.bind(this, text), TIMING.LYS_QUICK_SEARCH);

        const choices = commands.filter(x => x.command.includes(text));
        const pageChoices = pageCommands.filter(x => x.command.includes(text));
        const customChoices = customCommands.filter(x => x.command.includes(text));

        this.setState({
            choices, pageChoices, customChoices
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
                            this.state.pageChoices.map(cmd => (
                                <div class="lys-sugg lys-sugg-cmd lys-sugg-page-cmd" onClick={cmd.execute}>
                                    <b>{cmd.displayname}</b>
                                </div>
                            ))
                        } {
                            this.state.choices.map(cmd => (
                                <div class="lys-sugg lys-sugg-cmd" onClick={() => this.goAndHide(cmd.url)}>
                                    <b>{cmd.displayname}</b>
                                </div>
                            ))
                        } {
                            this.state.customChoices.map(cmd => (
                                <div class="lys-sugg lys-sugg-cmd" onClick={() => this.goAndHide(cmd.url)}>
                                    <b>{cmd.displayname}</b>
                                </div>
                            ))
                        }
                    </div>
                    <div id="lys-sugg-posts">
                        {
                            this.state.posts.map(post => (
                                <div class="lys-sugg lys-sugg-post" onClick={() => this.goAndHide("/publishing/write/" + post._id)}>
                                    <b>{post.headline}</b>
                                </div>
                            ))
                        }
                    </div>

                    { (
                        this.state.pageChoices.length == 0 &&
                        this.state.choices.length == 0 &&
                        this.state.posts.length == 0
                    ) ? this.renderHelp() : null }
                </div>
            </div>
        )
    }

    renderHelp() {
        return (
            <div id="lys-help">
                <img src="/static/media/lmllogo.png" class="lys-help-logo" />
                <p>
                    The <b>Lys</b> box can be used to quickly search for commands or posts to edit. 
                </p>
                <p>
                    <ul>
                        <li>Write a search query, then click on an article / command</li>
                        <li>Press enter to select the first search result</li>
                        <li>Press the <b>Escape</b> key to close the <b>Lys</b> box.</li>
                    </ul> 
                </p>
            </div>
        );
    }
}