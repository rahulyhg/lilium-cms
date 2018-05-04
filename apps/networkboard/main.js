import { h, render, Component } from 'preact';
import Total from './total';
import BigList from './biglist';
import fetch from 'unfetch'

class App extends Component {
    constructor() {
        super();
        this.state = {
            title : "Loading",
            posts : []
        };
    }

    componentDidMount() {
        this.fetchData();
        setInterval(this.fetchData.bind(this), 8000);
    }

    fetchData() {
        fetch("/googleanalytics/network", {
            credentials: 'include'
        }).then(r => r.json()).then(resp => {
            this.setState({ 
                total : resp.data.reduce((acc, cur) => acc + parseInt(cur.data.total), 0),
                pages : resp.data.reduce((acc, cur) => [...acc, ...cur.data.pages.map(x => {
                    x.url = cur.siteurl + x.url;
                    x.sitename = cur.sitename;
                    x.home = x.url == "/";

                    return x;
                })], []).sort((a, b) => b.count - a.count)
            });
        });
    }

    render() {
        return (
            <div id="app">
                <Total total={this.state.total} />
                <BigList posts={this.state.pages} />
            </div>
        );
    }
}

render(<App />, document.getElementById("root"));
