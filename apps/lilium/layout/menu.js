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
            <menu id="lilium-menu" style={{ marginTop : 100 }}>
                {
                    this.state.menus.map(menu => (
                        <Link linkStyle="block" href={menu.absURL.replace('admin', '')}><i className={"fa " + menu.faicon}></i> <span>{menu.displayname}</span></Link>
                    ))
                }
            </menu>
        )
    }
}