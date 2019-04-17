import API from '../data/api';

export class ErrorReporter {
    bindOnError() {
        log('Reporter', 'Binding on app crash', 'info');
        window.addEventListener('error', this.onError.bind(this));
    }

    onError(err) {
        log('Reporter', 'Sending error to Lilium', 'info');
        API.post('/reportcrash', { error : err }, (err, json, r) => {
            log('Reporter', 'Reported error to Lilium', 'info');
        });
    }
}
