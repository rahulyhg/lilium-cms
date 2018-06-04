import { h, render, Component } from 'preact';
import BigForm from './bigform';
import fetch from 'unfetch';

const ERRORS = {
    412 : "Some required fields are missing.",
    400 : "There was an error parsing the data.",
    500 : "There was an error in the backend. More details in the logs."
};

class LiliumInitialServer extends Component {
    submit(values) {
        this.setState({ submit : true, error : null, values });
        fetch("/", {
            method : "POST",
            body : JSON.stringify(values),
            headers : {
                'Content-Type': 'application/json'
            }
        }).then(r => {
            if (r.status == 200) {
                this.setState({ submit : false, success : true });
                this.pollStatus();
            } else {
                this.setState({ submit : false, error : ERRORS[r.status] || "Unknown error" });
            }
        });
    }

    pollStatus() {
        setTimeout(() => {
            fetch("/status").then(r => {
                if (r.status == 200) {
                    document.location = this.state.values.websiteurl + (this.state.values.websiteurl.endsWith('/') ? "" : "/") + "login";
                } else if (r.status == 204) {
                    this.pollStatus();
                } else if (r.status == 500) {
                    this.setState({ submit : false, success : false, error : ERRORS[r.status] });
                } else {
                    this.setState({ submit : false, success : false, error : "This was never supposed to happen. There is likely an issue with the DNS configurations, or the server itself." });
                }
            })
        }, 1000);
    }

    render() {
        return (
            <div id="lilium-initial-server">
                <header id="header">
                    <div id="title-wrap">
                        <span id="title">Lilium Stack</span>
                    </div>
                </header>
                <div id="masthead">
                    <div id="masthead-left">
                        <div id="masthead-text">
                            <h1>Lilium Stack</h1>
                            <h2>Installer</h2>
                            <h3>
                                This installer will walk you through the creation of a Lilium Stack.
                            </h3>
                        </div>
                    </div>
                    <div id="masthead-right">

                    </div>
                </div>

                { this.state.error ? 
                    <div id="error-strip">
                        <b>{this.state.error}</b>
                    </div> : null
                }

                { this.state.submit ? 
                    <center id="bigloader"><i class="fa fa-cog fa-spin"></i></center> : null
                }

                <BigForm submit={this.submit.bind(this)} visible={!this.state.submit && !this.state.success} />
                
                {
                    this.state.success ?
                        <div id="success-wrapper"><div id="success-text-wrapper">Installing stack...</div><i class="fa fa-cog fa-spin success-cog"></i></div> :
                        null
                }
            </div>
        );
    }
}

render(<LiliumInitialServer />, document.getElementById('app'));
 