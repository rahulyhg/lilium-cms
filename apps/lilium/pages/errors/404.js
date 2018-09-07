import { Component, h } from "preact";
import { Link } from '../../routing/link';

export default class e404 extends Component {
    constructor(props) {
        super(props);
    }

    static rendererstyle = {
        position: "fixed", top: 0, left: 0, bottom: 0, right: 0
    }

    render() {
        return (
            <div class="error-page font2" id="e404">
                <img src="/static/media/lost_404.jpeg" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, objectFit : 'cover', objectPosition: 'bottom', color: 'white' }} />
                <div style={{ position: 'relative', top: 150, margin: 'auto', zIndex: 4, width: 480, textAlign: 'center', padding: 30, borderRadius: 20, background: "#333" }}>
                    <img src="/static/media/lmllogo.png" style={{ width: 140, display: 'inline-block' }} />
                    <div style={{ fontSize : 48, textShadow : '0px 2px 0px rgba(0,0,0,0.2)', lineHeight : "58px", margin: "10px 0px", color: "white" }}>This is not the page you were looking for.</div>
                    <div style={{ 
                        fontSize: 28,
                        background: "#bd77cf",
                        display: "inline-block",
                        padding: "10px 12px 7px",
                        borderRadius: 4,
                        boxShadow: "0px 2px 0px rgba(0,0,0,0.2)",
                        color: "#f9ddff",
                        marginTop: 10
                     }}>
                        <Link href="/dashboard">
                            Go to dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }
}