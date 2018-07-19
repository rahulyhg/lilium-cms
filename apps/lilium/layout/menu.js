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

    render() {
        return (
            <menu id="lilium-menu">
                {
                    this.state.menus.map(menu => (
                        <div>
                            <Link display="block" href={menu.absURL.replace('admin', '')}>
                                <i className={"fa " + menu.faicon}></i> <span>{menu.displayname}</span>
                            </Link>
                            <div>
                                {menu.children.map(child => (
                                    <Link display="block" href={child.absURL.replace('admin', '')}>
                                        <i className={"fa " + child.faicon}></i> <span>{child.displayname}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))
                }
            </menu>
        )
    }
}