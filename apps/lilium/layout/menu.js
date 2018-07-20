import {h, Component} from 'preact';
import { Link } from '../routing/link';

export class LiliumMenu extends Component {
    constructor(props) {
        super(props);
        this.state = {
            menus : []
        }
    }

    componentWillReceiveProps(props) {
        if (props.menus) {
            this.setState({
                menus : props.menus
            });
        }
    }    

    focusedChanged(slid) {
        this.setState({ focused : slid });
        const ev = new CustomEvent("menuslid", { detail : { slid } });
        document.dispatchEvent(ev);
    }

    mousehover(ev) {
        this.focusedChanged(true);        
    }

    mouseleave(ev) {
        this.focusedChanged(false);        
    }

    render() {
        const links = [];
        this.state.menus.forEach(menu => {
            links.push(
                (<div class="menu-item"><Link linkStyle="block" href={menu.absURL.replace('admin', '')}>
                    <i className={"fa " + menu.faicon}></i> <span>{menu.displayname}</span>
                </Link></div>)
            );

            menu.children.map(child => {
                links.push(
                    (<div class="menu-item"><Link linkStyle="block" href={child.absURL.replace('admin', '')}>
                        <i className={"fa " + child.faicon}></i> <span>{child.displayname}</span>
                    </Link></div>)
                );
            });
        });        

        return (
            <menu id="lilium-menu" onMouseEnter={this.mousehover.bind(this)} onMouseLeave={this.mouseleave.bind(this)} style={ this.state.focused ? { transform: "translate3d(0,0,0)" } : {} }>
                { links }
            </menu>
        )
    }
}