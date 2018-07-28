export const styles = {
    
    realtimeTicker : {
        margin: 20,
        background: "white",
        display: "flex"
    },

    activeReadersCounter : {
        width: 350,
        height: 350,
        background : "#333333",
        color : "#B633E4",
        textAlign: 'center',
        paddingTop : 58,
        boxSizing : 'border-box',
        flex : "0 0 350px"
    },

    totalReadersBigNum : {
        fontSize : 120,
        display: "block",
        fontFamily : "Oswald", 
        fontShadow : "0px 2px 0px #8f37c4"
    },

    totalReadersTitle : {
        fontSize : 20,
        fontWeight : "bold"
    },

    realtimeListWrapper : {
        flexGrow : 1,
        height : 350,
        overflowY : "auto"
    },

    realtimeList : {
        display: "flex",
        width: "100%",
        boxSizing : "border-box",
        flexWrap : "wrap",
        height: 350
    }
};