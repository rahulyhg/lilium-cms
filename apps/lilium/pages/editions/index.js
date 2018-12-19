import { h, Component } from 'preact';
import { TextField } from '../../widgets/form';
import { Spinner } from '../../layout/loading';

import API from '../../data/api';

export default class EditionPage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading : true
        }
    }

    componentDidMount() {
        API.get('/editions/all', {}, (err, data) => {
            this.setState({ levels : data.levels, sections : data.sections, loading : false })
        });
    }

    render() {
        if (this.state.loading) {
            return (<Spinner centered />)
        }

        return (
            <div>
                <div>
                    
                </div>
                <div>

                </div>
            </div>
        )
    }
}
