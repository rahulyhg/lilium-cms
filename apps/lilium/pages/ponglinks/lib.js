import { castNotification } from '../../layout/notifications'
import { Component, h } from "preact";

const STATUS_COLORS = {
    active: '#6da55e',
    paused: '#735a1f',
    archived: '#731f1f'
};

const styles = {
    copyColumn: {
        textAlign: 'center',
        width: '80px'
    },
    copyIcon: {
        cursor: 'pointer'
    },
    statusIndicator: {
        color: 'white',
        display: 'inline-block',
        padding: '4px',
        borderRadius: '4px'
    },
}

export function StatusIndicator(props) {
    return (
        <div className="status-indicator" style={Object.assign({}, styles.statusIndicator, { backgroundColor: STATUS_COLORS[props.status] })}>
            <span>{props.status.toUpperCase()}</span>
        </div>
    )
};

export function Version(props) {
    return (       
        <tr style={styles.versionRow}>
            <td title={props.medium}>{props.medium}</td>
            <td><a href={props.dest} target='_blank'>{props.dest}</a></td>
            <td style={styles.copyColumn}><i className="fal fa-copy" onClick={copy.bind(this, props.dest)} style={styles.copyIcon}></i></td>
        </tr>
    )
};

export function copy(txt) {
    navigator.clipboard.writeText(txt);
    castNotification({
        title: 'Copied PongLink destination to clipboard',
        message: txt,
        type: 'success'
    });
};


export function getMappedUsers() {

}
