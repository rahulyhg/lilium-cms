import { h, Component } from 'preact';
import API from '../data/api'

/**
 * BigList 
 * 
 * Will make async calls to Live Variable endpoints. The list will expect an endpoint, and a Component which will be used as a list item. 
 * The Livevar endpoint can, but doesn't have to, handle the "limit" and "skip" params so that the list can lazy load on scroll. Those params
 * are typically handled by the livevar as a $limit : max and $skip : max * page mongo query param.
 * 
 * Props : {
 *      // Basic props
 *      endpoint : "/someEndpoint/with/levels/or/not",
 *      listitem : ComponentClass (the actual class, not a JSX element),
 *      batchsize : Number, representing the "max" param, defaults to 30,
 * 
 *      // More custom stuff
 *      livevarkey : Key of the server response, defaults to "item". If the server response is : { posts : [...] }, then livevarkey should be "posts",
 *      prepend : Wether the additional items will be added at the start or end of list. Setting this to "true" will add items at start of list,
 *      items : Array of initial items. Can be set later. If passed after mount, will replace the entire array with the new one.
 *      keyid : List item key for Preact mapping. Defaults to : _id 
 * }
 */
export class BigList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            items : props.items || [],
            endpoint : props.endpoint,
            component : props.listitem,
            index : 0,
            batchsize : props.batchsize || 30,
            livevarkey : typeof props.livevarkey == "undefined" ? "items" : props.livevarkey,
            prepend : props.prepend || false,
            filters : props.filters || {}
        };
    }

    loadMore(callback) {
        API.get(this.state.endpoint, {
            limit : this.state.batchsize,
            skip : this.state.index * this.state.batchsize,
            filters : this.state.filters
        }, (err, list) => {
            if (err) {
                log('BigList', "Could not add items in big list because of response error : " + err, "warning")
            } else {
                log("BigList", "Added values in a big list from live variable endpoint", "success");
                if (callback) {
                    callback(this.state.livevarkey ? list[this.state.livevarkey] : list);
                } else {
                    const items = [...this.state.items];
                    items[this.state.prepend ? "unshift" : "push"](...(this.state.livevarkey ? list[this.state.livevarkey] : list));

                    this.setState({ items, index : ++this.state.index });
                }
            }
        });
    }

    componentDidMount() {
        this.loadMore();        
    }

    componentWillReceiveProps(props) {
        const newState = {
            endpoint  : props.endpoint  || this.state.endpoint,
            component : props.listitem  || this.state.component,
            batchsize : props.batchsize || this.state.batchsize,
            filters   : props.filters   || this.state.filters,
            index : 0
        };

        if (props.items) {
            newState.items = [...props.items];
        } 

        this.setState(newState, () => {
            this.loadMore(items => {
                this.setState({ items });
            });
        })
    }

    render() {
        log('BigList', 'Rendering a big list with ' + this.state.items.length + ' items', 'detail');
        return (
            <div class="big-list">
                {
                    this.state.items.map(x => (
                        <this.state.component item={x} key={x[this.props.keyid || "_id"]} />
                    ))
                }
            </div>
        );
    }
}