import { h, Component } from "preact";
import API from '../../data/api';
import { TextField, SelectField, ButtonWorker } from '../../widgets/form';

const HTTP_METHODS = [
    { displayname : "GET", value : "GET" },
    { displayname : "POST", value : "POST" },
    { displayname : "PUT", value : "PUT" },
    { displayname : "DELETE", value : "DELETE" },
];

const styles = {
    output : {
        background : "#333",
        color : "#DDD",
        minHeight : 200,
        padding : 12
    }
}

export default class DevToolAPI extends Component {
    constructor(props) {
        super(props);
        this.values = { method: HTTP_METHODS[0].value };
        this.state = { output : "Waiting for request information." };
    }

    updatedValue(name, value) {
        this.values[name] = value;
    }

    sendRequest(done) {
        console.log(this.values);
        const send = API[this.values.method.toLowerCase()];
        this.setState({ output : "Waiting for response..." });
        const now = performance.now();
        send(this.values.endpoint, this.payload, (err, data, r) => {
            const outputHead = this.values.method + " " + this.values.endpoint + " [" + r.status + "]\n" + (performance.now() - now).toFixed(0).toString() + "ms performance\n";
            this.setState({ output : outputHead + "\n" + (err ? err : JSON.stringify(data, undefined, 4) ) }, () => done())
        });
    }

    render() {
        return (
            <div>
                <h1>API development tool</h1>

                <div class="pad" style={{ paddingTop : 0 }}>
                    <TextField name="endpoint" placeholder="API Endpoint or Live Variable" initialValue="/" onChange={this.updatedValue.bind(this)} />
                    <SelectField name="method" placeholder="HTTP Method" initialValue="GET" onChange={this.updatedValue.bind(this)} options={HTTP_METHODS} />                   
                    <TextField name="payload" placeholder="POST data or payload" initialValue="{}" onChange={this.updatedValue.bind(this)} multiline={true} />

                    <ButtonWorker text="Send request" work={this.sendRequest.bind(this)} />

                    <hr />

                    <pre style={styles.output}>{this.state.output}</pre>
                </div>
            </div>
        )
    }
}