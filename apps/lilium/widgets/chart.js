import { h, Component } from 'preact';

const minPastel = 100;
const maxPastel = 255;

const getRandPastelRGBA = () => {
    return minPastel + Math.random() * (maxPastel - minPastel);
};

export class ChartGraph extends Component {
    constructor(props) {
        super(props);
        this.state = {
            datasets: props.datasets,
            data: props.data,
            labels: props.labels || ["Data"],
            options: Object.assign({}, props.options || {}),
            title: props.title
        }

        this.resize_bound = this.resize.bind(this);
    }

    getDefaultBackgroundColors() {
        return this.props.labels.map(() => `rgba(${getRandPastelRGBA()}, ${getRandPastelRGBA()}, ${getRandPastelRGBA()})`)
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.getBoundingClientRect().width;
    }

    componentWillReceiveProps(props) {
        if (props.chart && this.chart) {
            if (JSON.stringify(this.props.chart.data.datasets[0].data) != JSON.stringify(props.chart.data.datasets[0].data)) {
                this.chart.data = props.chart.data;
                this.chart.type = props.chart.type;
                this.chart.options = props.chart.options;

                this.chart.update();
            }
        }
    }

    componentDidMount() {
        this.ctx = this.canvas.getContext('2d');
        const opt = this.props.chart || {
            type: this.props.type || "line",
            data: {
                labels: this.state.labels,
                datasets: [{
                    label: this.state.title || "Data",
                    data: this.state.data,
                    ...(Object.assign({
                        backgroundColor: this.getDefaultBackgroundColors(),
                        borderColor: "rgb(202, 80, 258)"
                    }, this.props.lineStyle))
                }]
            },
            labels: this.state.labels || null,
            options: this.state.options
        };

        this.chart = new Chart(this.ctx, opt);
        log('Chart', 'Created chart object using a canvas\' 2d context', 'success');

        () => this.resize();
        window.addEventListener('resize', this.resize_bound);
    }

    componentWillUnmount() {
        this.chart && this.chart.destroy();
        window.removeEventListener('resize', this.resize_bound);
    }

    shouldComponentUpdate() {
        return false;
    }

    render() {
        if (this.props.nowrap) {
            return (<canvas id={this.props.id || Math.random()} ref={x => (this.canvas = x)}></canvas>);
        } else {
            return (
                <div>
                    <canvas id={this.props.id || Math.random()} ref={x => (this.canvas = x)}></canvas>
                </div>
            )
        }
    }
} 
