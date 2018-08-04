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
    }
};

export class LoadingView extends Component {
    render() {
        return (
            <div style={styles.screen}>
                <b style={styles.message}>Loading awesomeness</b>
            </div>
        );
    }
}