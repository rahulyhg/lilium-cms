import { h, Component } from 'preact';
import { TIMING } from '../data/const';
import { navigateTo, Link } from '../routing/link';
import API from '../data/api';

let pageCommands   = [];
let commands       = [];
let customCommands = [];
let hashactions    = [];

export function resetPageCommands()    { pageCommands = [];        }
export function setPageCommands(cmds)  { pageCommands = cmds;      }
export function addCommand(cmd)        { customCommands.push(cmd); }
export function addAction(cmd)         { hashactions.push(cmd);    }

export class Lys extends Component {
    constructor(props) {
        super(props);
        this.state = {
            visible : false,
            choices : [],
            pageChoices : [],
            entities : [],
            hashactions : [],
            posts : []
        };

        this.shiftDown = false;
        this.keyUpBoxBinding = this.boxKeyUp.bind(this);

        this.createCommandFromProp(props.menus);
    }

    componentDidMount() {
        log('Lys', 'Binding on key down and key up', 'detail');
        window.addEventListener('keydown', this.keyDown.bind(this));
        window.addEventListener('keyup', this.keyUp.bind(this));
    }

    createCommandFromProp(menus) {
        this.commands = menus.filter(x => x.lys).map(x => ({
            command : x.lys.replace(/,/g, ''),
            displayname : x.displayname,
            icon : "fa " + x.faicon,
            url : x.absURL.replace('admin', '')
        }));

        log('Lys', 'Handling now ' + this.commands.length + ' built-in commands', 'success');
    }

    componentWillReceiveProps(props) {
        if (props.menus) {
            log('Lys', 'Handling now ' + commands.length + ' built-in commands', 'success');
            this.createCommandFromProp(props.menus);
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
            hashactions : [],
            posts : [],
            entities : []
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

        const act = this.enterAction;
        if (!act || act.default) {
            log('Lys', 'No command found, showing help', 'detail');
            this.showHelp();
            willHide = false;
        } else {
            switch (act.type) {
                case "pageChoices": 
                    act.action.execute();
                    log('Lys', 'Executed page command : ' + cmd, 'success');
                    break;

                case "choices":
                    navigateTo(act.action.url);
                    log('Lys', 'Executed Lilium command : ' + cmd, 'success');
                    break;

                case "customChoices":
                    act.action.execute();
                    log('Lys', 'Executed Custom Command : ' + cmd, 'success');
                    break;

                case "hashactions":
                    act.action.execute(cmd);
                    log('Lys', 'Executed Hash Command : ' + cmd, 'success');
                    break;

                case "posts":
                    navigateTo("/publishing/write/" + act.action._id);
                    log('Lys', 'Navigated to post from Lys', 'success');
                    break;
                
                case "entities":
                    navigateTo("/entities/edit/" + act.action._id);
                    log('Lys', 'Navigated to entity from Lys', 'success');
                    break;
            } 
            
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
            this.setState({ posts : [], entities : [] });
        } else {
            API.get('/search/lys', {
                text
            }, (err, results) => {
                if (!err && results) {
                    this.setState({
                        posts : results.articles, entities : results.entities, help : false
                    });
                }
            });
        }
    }

    refreshSearchTimeout(text) {
        this.searchTimeout && clearTimeout(this.searchTimeout);

        if (text[0] == "#") {
            const split = text.split(' ').filter(x => x);
            const acts = hashactions.filter(x => x.action.includes(split[0]) && (
                split[1] ? x.command.includes(split[1]) : true
            ));

            this.setState({
                choices : [], pageChoices : [], customChoices : [], 
                posts : [], entities : [],

                hashactions : acts
            });
        } else {
            text = text.trim().replace(/\s/g, '');
            this.searchTimeout = setTimeout(this.fillSearch.bind(this, text), TIMING.LYS_QUICK_SEARCH);

            const choices = commands.filter(x => x.command.includes(text));
            const pageChoices = pageCommands.filter(x => x.command.includes(text));
            const customChoices = customCommands.filter(x => x.command.includes(text));

            const newState = {
                choices, pageChoices, customChoices, hashactions : []
            };

            this.setState(newState);
        }
    }

    keyUp(ev) {
        if (ev.keyCode == 16 && !this.state.visible) {
            this.shiftDown = false;
        } 
    }

    renderSuggs() {
        return (
            <div>
                <div id="lys-sugg-cmds">
                {
                    this.state.pageChoices.map(cmd => (
                        <div class="lys-sugg lys-sugg-cmd lys-sugg-page-cmd" onClick={cmd.execute}>
                            <i class="far fa-bolt" style={{ background : "#fffae0" }}></i>
                            <b>{cmd.displayname}</b>
                        </div>
                    ))
                } {
                    this.state.choices.map(cmd => (
                        <div class="lys-sugg lys-sugg-cmd" onClick={() => this.goAndHide(cmd.url)}>
                            <i class={"fal " + cmd.icon} style={{ background : "#daf5ff" }}></i>
                            <b>{cmd.displayname}</b>
                        </div>
                    ))
                } {
                    this.state.customChoices.map(cmd => (
                        <div class="lys-sugg lys-sugg-cmd" onClick={() => cmd.execute()}>
                            <i class="far fa-bolt" style={{ background : "#fffae0" }}></i>
                            <b>{cmd.displayname}</b>
                        </div>
                    ))
                }
            </div>
            <div id="lys-sugg-actions">
                {
                    this.state.hashactions.map(cmd => (
                        <div class="lys-sugg lys-sugg-act" onClick={cmd.execute}>
                            <i class="far fa-hashtag" style={{ background : "rgb(255, 135, 135)" }}></i>
                            {cmd.action} <b>{cmd.displayname}</b>
                        </div>
                    ))
                }
            </div>
            <div id="lys-sugg-posts">
                {
                    this.state.posts.map(post => (
                        <div class="lys-sugg lys-sugg-post" onClick={() => this.goAndHide("/publishing/write/" + post._id)}>
                            <i class="far fa-pencil" style={{ background : "#ffdffe" }}></i>
                            <b>{post.headline}</b>
                        </div>
                    ))
                }
            </div>
            <div id="lys-sugg-entities">
                {
                    this.state.entities.map(entity => (
                        <div class="lys-sugg lys-sugg-entity" onClick={() => this.goAndHide("/entities/edit/" + entity._id)}>
                            <i class="far fa-user" style={{ background : "#e1ffdf" }}></i>
                            <b>{entity.displayname}</b>
                        </div>
                    ))
                }
            </div>
        </div>)
    }

    render() {
        if (!this.state.visible) {
            return null;
        }

        this.enterAction = this.state.pageChoices[0] ? {
            icon : "far fa-bolt",
            action : this.state.pageChoices[0],
            type : "pageChoices",
            color : "#fffae0"
        } : this.state.choices[0] ? {
            icon : "fal " + this.state.choices[0].icon,
            action : this.state.choices[0],
            type : "choices",
            color : "#daf5ff"
        } : this.state.customChoices[0] ? {
            icon : "far fa-bolt",
            action : this.state.customChoices[0],
            type : "customChoices",
            color : "#fffae0"
        } : this.state.hashactions[0] ? {
            icon : "far fa-hashtag",
            action : this.state.hashactions[0],
            type : "hashactions",
            color : "rgb(255, 135, 135)"
        } : this.state.posts[0] ? {
            icon : "far fa-pencil",
            action : this.state.posts[0],
            type : "posts",
            color : "#ffdffe"
        } : this.state.entities[0] ? {
            icon : "far fa-user",
            action : this.state.entities[0],
            type : "entities",
            color : "#e1ffdf"
        } : {
            icon : "fal fa-question",
            action : undefined,
            type : "default",
            color : "#AAA",
            default : true
        };

        return (
            <div id="lys-wrap">
                <div id="lys">
                    <div style={{ display: "flex" }}>
                        <div id="lys-sugg-big-icon" style={{ background : this.enterAction.color }}>
                            <i id="lys-sugg-big-icon-i" class={this.enterAction.icon}></i>
                        </div>
                        <input type="text" id="lys-input" placeholder="What are you looking for?" onKeyUp={this.keyUpBoxBinding} autocomplete="off" />
                    </div>

                    { this.enterAction.default ? this.renderHelp() : this.renderSuggs() }
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