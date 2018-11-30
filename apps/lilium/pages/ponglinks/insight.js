import { Component, h } from "preact";
import { castNotification } from '../../layout/notifications'
import API from '../../data/api';
import { ChartGraph } from  '../../widgets/chart';
import { PonglinkActions, VersionsList, STATUS_TO_COLOR } from './lib';
import { getSession } from '../../data/cache';
import dateFormat from 'dateformat';
import Modal from "../../widgets/modal";
import { TextField, EditableText, ButtonWorker } from "../../widgets/form";

const styles = {
    ponglink: {
        width: '100%',
        backgroundColor: 'white',
        margin: '8px 0px',
        padding: '16px',
        boxShadow: '0px 2px 0px rgba(0, 0, 0, 0.2)'
    },
    creatorName: {
        fontWeight: '100',
        margin: '0'
    },
    identifier: {
        display: 'inline-block',
        marginRight: '14px',
        marginBottom: '0'
    },
    versions: {
        width: '100%',
        borderCollapse: 'collapse',
        border: '0'
    },
    mediumHeader: {
        width: '120px'
    },
    fullWidthBtn: {
        display: 'block',
        margin: '10px 100px',
        textAlign:'center'
    },

    diagrams: {
        backgroundColor: 'white',
        boxShadow: '0px 2px 0px rgba(0, 0, 0, 0.2)',
        margin: '30px',
        padding: '25px'
    },
    diagram: {
        display: 'inline-block',
        width: '50%',
        maxWidth: '50%'
    },
    generalInfo: {
        backgroundColor: 'white',
        boxShadow: '0px 2px 0px rgba(0, 0, 0, 0.2)',
        margin: '30px',
        padding: '25px'
    }
}

const lineDiragramOptions = {
    scales: {
        xAxes: [{
            ticks: {
                autoSkip: false,
                maxRotation: 90,
                minRotation: 60
            }
        }]
    },
}

export default class PonglinkInsight extends Component {
    constructor(props) {
        super(props);

        this.newVersionValues = {};

        this.state = {
            loading: true,
            addVersionModalVisible: false
        };
    }

    componentDidMount() {
        if (this.props.id) {
            API.get('/ponglinks/insights/' + this.props.id, {}, (err, data, r) => {
                if (r.status == 200) {
                    this.setState({...data, loading: false});
                } else {
                    castNotification({
                        title: 'Error fetching ponglink data',
                        type: 'err'
                    });
                }
            });
        } else {
            castNotification({
                title: 'No Ponglink ID was provided',
                message: "No ponglink ID was provided in the URl, impossible to fetch a ponglink's data",
                type: 'warning'
            })
        }
    }

    buildDailyClicksDataSet() {
        const now = new Date();
        const dataSet = { lineLabels: [], lineClicks: [] };
        this.state.daily.forEach(dailyStat => {
            const date = new Date(now.getFullYear(), 0, dailyStat.day);
            dataSet.lineLabels.push(dateFormat(date, 'mmmm dd'));
            dataSet.lineClicks.push(dailyStat.clicks);
        });

        return dataSet;
    }

    buildClicksPerMediumDataSet() {
        const dataSet = { pieLabels: [], pieClicks: [] };
        this.state.versions.forEach(mediumStat => {
            dataSet.pieClicks.push(mediumStat.clicks);
            const version = this.state.link.versions.find(version => version.hash == mediumStat.version);
            (version) ? dataSet.pieLabels.push(version.medium) :dataSet.pieLabels.push('Unknown');
        });

        return dataSet;
    }

    changeStatus(status) {
        API.post('/ponglinks/edit/' + this.props.id, { status }, (err, data, r) => {
            if (r.status == 200) {
                const link = this.state.link;
                link.status = status;
                this.setState({ link });
                castNotification({
                    title: `Campaign status set to ${status}`,
                    type: 'success'
                })
            } else {
                castNotification({
                    title: 'Error updating ponglink status',
                    type: 'error'
                })
            }
        });
    }

    versionsChanged(versions, done) {
        const link = this.state.link;
        API.put('/ponglinks/' + this.state.link._id, { versions }, (err, data, r) => {
            if (r.status == 200) {
                console.log('setting satate with new link', link);
                
                link.versions = data.updated.versions;
                this.setState({ link });
                castNotification({
                    title: 'Ponglink updated',
                    type: 'success'
                });

                done && done();
            } else {
                castNotification({
                    title: 'Error updating ponglink versions',
                    type: 'err'
                });

                done && done();
            }
        });

        this.setState({ link });
    }

    newVersionValuesChanged(name, val) {
        this.newVersionValues[name] = val;
    }

    saveField(name, val) {
        API.put('/ponglinks/' + this.state.link._id, { [name]: val }, (err, data, r) => {
            if (r.status == 200) {
                castNotification({
                    title: 'Updated ponglink',
                    type: 'success'
                });
            } else {
                castNotification({
                    title: 'Error updateing ponglink',
                    type: 'error'
                });
            }
        });
    }

    addVersion(done) {
        if (this.newVersionValues.medium && this.newVersionValues.destination) {
            const versions = this.state.link.versions;
            versions.push({ medium: this.newVersionValues.medium, destination: this.newVersionValues.destination })
            this.versionsChanged(versions, () => {
                this.newVersionValues = {};
                this.setState({ addVersionModalVisible: false });
                done && done();
            });
        } else {
            castNotification({
                title: 'Some fields are missing',
                message: 'Make sure both the medium and the Destination fields are filled',
                type: 'warn'
            });

            done && done();
        }
    }

    render() {        
        if (!this.state.loading) {
            const { lineLabels, lineClicks } = this.buildDailyClicksDataSet();
            const { pieLabels, pieClicks } = this.buildClicksPerMediumDataSet();
            return (
                <div id="ponglink-insights">
                    <Modal title='Add a PongLink version' visible={this.state.addVersionModalVisible} onClose={() => { this.setState({ addVersionModalVisible: false }) }}>
                        <TextField name='medium' placeholder='Medium' onChange={this.newVersionValuesChanged.bind(this)} initialValue={this.newVersionValues.medium} />
                        <TextField name='destination' placeholder='Destination' onChange={this.newVersionValuesChanged.bind(this)} initialValue={this.newVersionValues.destination} />
                        <ButtonWorker text='Add' work={this.addVersion.bind(this)} theme='purple' type='fill' />
                        <ButtonWorker text='Cancel' sync work={() => { this.setState({ addVersionModalVisible: false }) }} theme='red' type='outline' />
                    </Modal>
                    <div id="general-info" className='card' style={styles.generalInfo}>
                        <div className="bubble-wrap">
                            <EditableText initialValue={this.state.link.identifier} name='identifier' onChange={this.saveField.bind(this)} />
                            <div className={`bubble ${STATUS_TO_COLOR[this.state.link.status]}`}>
                                {this.state.link.status} 
                            </div>
                        </div>
                        <div className="clickCounter" style={{ display: 'inline-block', float: 'right' }}>
                            <span>{`${this.state.link.clicks} clicks`}</span>
                        </div>
                        <h3 style={styles.creatorName}>{`Created by ${getSession('mappedEntities')[this.state.link.creatorid].displayname}`}</h3>
                        
                        <hr />
                        <VersionsList versions={this.state.link.versions} editable onChange={this.versionsChanged.bind(this)} />
                        <ButtonWorker sync text='Add version' theme='blue' type='outline'
                                        work={() => { this.setState({ addVersionModalVisible: true }) }} />
                        <hr/>

                        <PonglinkActions status={this.state.link.status} changeStatus={this.changeStatus.bind(this)} />
                    </div>

                    <div className="diagrams" style={styles.diagrams}>
                        <h2>Detailed statistics for the campaign</h2>
                        <div id="clicks-per-day" style={styles.diagram}>
                            <ChartGraph data={lineClicks} labels={lineLabels} title='Number of clicks per day of the campaign' options={lineDiragramOptions} type='bar' />
                        </div>
                        <div id="clicks-per-medium" style={styles.diagram}>
                            <ChartGraph data={pieClicks} labels={pieLabels} title='Number of clicks per medium' lineStyle='#ccc' type='pie' />                        
                        </div>
                    </div>

                    <hr/>
                </div>
            );
        } else {
            return (
                <p>Loading</p>
            )
        }
    }
}
