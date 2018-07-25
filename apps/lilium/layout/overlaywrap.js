import { h, Component } from 'preact'

import { ImagePicker } from './imagepicker';

let _singleton;
export class OverlayWrap extends Component {
    constructor(props) {
        super(props);
        this.state = {};

        _singleton = this;
    }

    static cast() {
        
    }

    static dismiss() {

    }

    componentDidMount() {

    }

    componentWillUnmount() {

    }

    render() {
        return (
            <div>
                
            </div>
        )
    }
}