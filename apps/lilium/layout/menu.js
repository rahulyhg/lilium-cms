import {h, Component} from 'preact';
import { Link } from '../routing/link';
import { CACHEKEYS, storeLocal, getLocal } from '../data/cache'

const styles = {
    handle : {
        position: "fixed",
        top: "calc(50% - 20px)",
        height: 40,
        right: 10,
        cursor: "pointer"
    },
    handlebar : {
        display : "inline-block",
        height : "100%",
        width: 1,
        marginRight : 2,
        background : "#777"
    }
}

export class LiliumMenu extends Component {
    constructor(props) {
        super(props);
        this.state = {
            menus : props.menus || [],
            snapped : getLocal(CACHEKEYS.SIDEBARSNAP)
        }
    }

    componentDidMount() {
        const ev = new CustomEvent("menusnap", { detail : { snapped : this.state.snapped } });
        document.dispatchEvent(ev);

        document.addEventListener('togglemenusnap', (ev) => {
            this.toggleSnap(ev.detail.snapped);
        })
    }

    componentWillReceiveProps(props) {
        if (props.menus) {
            this.setState({
                menus : props.menus
            });
        }
    }    

    focusedChanged(slid) {
        const ev = new CustomEvent("menuslid", { detail : { slid } });
        document.dispatchEvent(ev);
    }

    mousehover(ev) {
        this.focusedChanged(true);        
    }

    mouseleave(ev) {
        this.focusedChanged(false);        
    }

    toggleSnap(snapped) {
        log('Menu', 'Handle snap was clicked', 'detail');
        const ev = new CustomEvent("menusnap", { detail : { snapped } });
        document.dispatchEvent(ev);

        storeLocal(CACHEKEYS.SIDEBARSNAP, snapped);
        this.setState({ snapped })
    }

    clickOnSlideHandle() {
        this.toggleSnap(!this.state.snapped);
    }

    render() {
        const links = [];
        this.state.menus.forEach(menu => {
            links.push(
                (<Link linkStyle="block" href={menu.absURL.replace('admin', '')}><div class="menu-item">
                    <i className={"fa " + menu.faicon}></i> <span>{menu.displayname}</span>
                </div></Link>)
            );

            menu.children.map(child => {
                links.push(
                    (<Link linkStyle="block" href={child.absURL.replace('admin', '')}><div class="menu-item">
                        <i className={"fa " + child.faicon}></i> <span>{child.displayname}</span>
                    </div></Link>)
                );
            });
        });        

        return (
            <menu id="lilium-menu" class={this.state.snapped ? "snap" : ""} ref={x => (this.slider = x)} onMouseEnter={this.mousehover.bind(this)} onMouseLeave={this.mouseleave.bind(this)} >
                { links }
                <div style={styles.handle} onClick={this.clickOnSlideHandle.bind(this)}>
                    <div style={styles.handlebar}></div>
                    <div style={styles.handlebar}></div>
                </div>
            </menu>
        )
    }
}