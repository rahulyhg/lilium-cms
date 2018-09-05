import { h, Component } from "preact";
import anime from 'animejs'

export class AnimeNumber extends Component {
    number = 0;

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        this.updateTotal(this.props.number);
    }

    componentWillReceiveProps(props) {
        this.updateTotal(props.number);
    }

    updateTotal(number) {
        const obj = { number : this.number };
        const elem = this.elem;
      
        elem && anime({
            targets: obj,
            number : number,
            round: 1,
            easing: 'easeOutSine',
            update : () => {
                elem.textContent = obj.number;
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