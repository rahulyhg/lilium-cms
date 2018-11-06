import {h, Component} from 'preact';
import { Link, navigateTo } from '../routing/link';
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

class LiliumMenuSection extends Component {
    constructor(props) {
        super(props); 
        this.state = {
            
        }
    }
    
    componentDidMount() {

    }
    
    render() {
        return (
            <div>

            </div>
        );
    }
}

class LiliumMenuSectionHeader extends Component {
    constructor(props) {
        super(props);
        this.state = {
            
        }
    }
    
    componentDidMount() {
        
    }

    clicked() {
        this.props.onClick && this.props.onClick(this.props.section);
    }
    
    render() {
        return (
            <div class={"lilium-menu-section-header " + (this.props.active ? "grad " : "") + this.props.grad} onClick={this.clicked.bind(this)}>
                <i class={"fal fa-" + this.props.icon} />
            </div>
        );
    }
}

export class LiliumMenu extends Component {
    constructor(props) {
        super(props);
        this.state = {
            menus : props.menus || [],
            snapped : getLocal(CACHEKEYS.SIDEBARSNAP),
            endpoint : document.location.pathname.split("/")[2],
            section : ""
        };
    }

    componentDidMount() {
        const ev = new CustomEvent("menusnap", { detail : { snapped : this.state.snapped } });
        document.dispatchEvent(ev);

        document.addEventListener('togglemenusnap', (ev) => {
            this.toggleSnap(ev.detail.snapped);
        })

        document.addEventListener('navigate', ev => {        
            const selectedSection = this.state.menus.find(menu => ev.detail.href.includes(menu.absURL));
            const section = selectedSection ? selectedSection.section : this.state.section;

            this.setState({
                endpoint : ev.detail.href.split('/')[1], section
            })
        });

        const selectedSection = this.state.menus.find(menu => document.location.pathname.includes(menu.absURL));
        this.switchSection(selectedSection ? selectedSection.section : 'home');
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

    switchSection(section) {
        this.setState({ section }, () => {
            // Array.from(this.sectionMenusElement.querySelectorAll('.sidebar-menu-item')).forEach((item, index) => {
            //     setTimeout(() => {
            //         item.classList.add('shown');
            //     }, index * 30);
            // });
        });
    }

    goTo(menu) {
        navigateTo(menu.absURL);
    }

    render() {  
        return (
            <div id="lilium-menu" class={this.state.snapped ? "snap" : ""}>
                <div class="lilium-menu-sections-all">
                    <LiliumMenuSectionHeader active={"home" == this.state.section} onClick={this.switchSection.bind(this)}       grad="purple"    section="home"      icon="home" />
                    <LiliumMenuSectionHeader active={"publishing" == this.state.section} onClick={this.switchSection.bind(this)} grad="tangerine"   section="publishing" icon="paper-plane" />
                    <LiliumMenuSectionHeader active={"management" == this.state.section} onClick={this.switchSection.bind(this)} grad="lemon" section="management" icon="address-card" />
                    <LiliumMenuSectionHeader active={"lilium" == this.state.section} onClick={this.switchSection.bind(this)}     grad="blue"  section="lilium"     icon="cogs" />
                </div>
                <div class="lilium-menu-active" ref={ x => (this.sectionMenusElement = x) }>
                    {
                        this.state.menus.filter(x => x.section == this.state.section).map(menu => (
                            <div key={menu.id} class={"sidebar-menu-item " + (document.location.pathname.includes(menu.absURL) ? "selected" : "")} onClick={this.goTo.bind(this, menu)}>
                                <i class={"far " + menu.faicon}></i>
                                <b>{menu.displayname}</b>
                            </div>
                        ))
                    }
                </div>
            </div>
        );
        
        return (
            <menu id="lilium-menu" class={this.state.snapped ? "snap" : ""} ref={x => (this.slider = x)} onMouseEnter={this.mousehover.bind(this)} onMouseLeave={this.mouseleave.bind(this)} >
                { this.state.menus.map(menu => (
                    <Link linkStyle="block" href={menu.absURL.replace('admin', '')}><div class="menu-item">
                        <i className={"fa " + menu.faicon}></i> <span>{menu.displayname}</span>
                    </div></Link>
                ))}
                
                <div style={styles.handle} onClick={this.clickOnSlideHandle.bind(this)}>
                    <div style={styles.handlebar}></div>
                    <div style={styles.handlebar}></div>
                </div>
            </menu>
        )
    }
}