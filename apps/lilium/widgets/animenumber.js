import { h, Component } from "preact";
import anime from 'animejs'

function noOp() {};

export class AnimeNumber extends Component {
    number = 0;

    constructor(props) {
        super(props);
        this.coldState = {
            duration : props.duration || 2000
        };

        this.onupdate = props.onUpdate || noOp;
    }

    componentDidMount() {
        this.updateTotal(this.props.number || 0, () => {
            this.props.onReady && this.props.onReady(this.number, this.elem, this);
        });
    }

    componentWillReceiveProps(props) {
        if (props.duration) {
            this.coldState.duration = props.duration;
        }

        if (typeof props.number != "undefined") {
            this.props.onUpdating && this.props.onUpdating(props.number, this.number, this.elem, this);
            this.updateTotal(props.number, () => {
                this.props.onUpdated && this.props.onUpdated(this.number, this.elem, this);
            });
        }
    }

    updateTotal(number, done) {
        const obj = { number : this.number };
        const elem = this.elem;
      
        elem && anime({
            targets: obj,
            number,
            round: 1,
            easing: 'easeOutSine',
            duration : this.coldState.duration,
            update : () => {
                elem.textContent = obj.number;
                this.onupdate();
            },
            complete : () => {
                done && done();
            }
        });

        this.number = number;
    }

    render() {
        return (
            <span ref={x => (this.elem = x)}></span>
        )
    }
}