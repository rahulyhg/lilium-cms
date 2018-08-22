import { h, Component } from 'preact';

export class ChartGraph extends Component {
    constructor(props) {
        super(props);
        this.state = {
            datasets : props.datasets,
            data : props.data,
            labels : props.labels || ["Data"],
            options : props.options || {}
        }

        this.resize_bound = this.resize.bind(this);
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.getBoundingClientRect().width;  
    }

    componentWillReceiveProps(props) {
        if (props.datasets) {

        }
    }

    componentDidMount() {
        this.ctx = this.canvas.getContext('2d');
        const opt = {
            type : this.props.type || "line",
            data : {
                labels : this.state.labels,
                datasets : [{
                    label : this.state.title || "Data",
                    data : this.state.data,
                    ...(Object.assign({
                        backgroundColor : "rgba(193, 123, 210, 0.7)",
                        borderColor : "rgb(202, 80, 258)"
                    }, this.props.lineStyle))
                }]
            },
            labels : this.state.labels || null,
            options : this.state.options
        };

        this.chart = new Chart(this.ctx, opt);
        log('Chart', 'Created chart object using a canvas\' 2d context', 'success');

        this.resize();
        window.addEventListener('resize', this.resize_bound);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.resize_bound);
    }

    shouldComponentUpdate() {
        return false;
    }

    render() {
        return (
            <div>
                <canvas ref={x => (this.canvas = x)}></canvas>
            </div>
        )
    }
} 