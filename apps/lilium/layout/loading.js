import { Component, h } from 'preact';

const styles = {
    screen : {
        position: "fixed",
        top : 0,
        left : 0,
        width : "100%",
        height : "100%",
        background : "#d0ccd4",
        boxSizing : "border-box",
        textAlign : "center",
    },
    message : {
        display : "block",
        marginTop : "40vh",
        fontSize : "48px",
        color : "rgb(170, 153, 185)",
        textShadow : "rgb(163, 133, 189) 0px 2px 0px"
    },
    devmention : {
        display : "block",
        fontSize : "20px",
        color : "rgb(170, 153, 185)"    
    },
    spinner : {
        fontSize : 60,
        color : "rgb(170, 153, 185)",
        marginTop : 20
    }
};

export class LoadingView extends Component {
    render() {
        return (
            <div style={styles.screen}>
                <b style={styles.message}>Loading awesomeness</b>
                {
                    liliumcms.env == "dev" ? (<b style={styles.devmention}>Development build</b>) : null
                }
                <i class="far fa-spinner-third fa-spin-fast" style={styles.spinner}></i>
            </div>
        );
    }
}