import { h, Component } from "preact";
import anime from 'animejs'

function noOp() {};

export function ordinal(num) {
    if (num > 1000000) {
        return (num / 1000000).toFixed(2) + "M";
    } else if (num > 1000) {
        return (num / 1000).toFixed(2) + "K";
    } else {
        return num;
    }
}

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

        if (typeof props.number != "undefined" && props.number != this.number) {
            this.props.onUpdating && this.props.onUpdating(props.number, this.number, this.elem, this);
            this.updateTotal(props.number, () => {
                this.props.onUpdated && this.props.onUpdated(this.number, this.elem, this);
            });
        }
    }

    updateTotal(number, done) {
        const obj = { number : this.number };
        const elem = this.elem;

        if (this.currentAnimation) {
            this.currentAnimation.pause();
        }
      
        this.currentAnimation = elem && anime({
            targets: obj,
            number,
            round: 1,
            easing: 'easeOutSine',
            duration : this.coldState.duration,
            update : () => {
                elem.textContent = this.props.ordinal ? ordinal(obj.number) : obj.number;
                this.onupdate();
            },
            complete : () => {
                this.currentAnimation = undefined;
                done && done();
            }
        });

        this.number = number;
    }

    shouldComponentUpdate() {
        return false;
    }

    render() {
        return (
            <span ref={x => (this.elem = x)}></span>
        )
    }
}
