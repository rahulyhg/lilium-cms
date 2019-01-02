import { Component, h } from 'preact';
import { ButtonWorker, SelectField } from '../../widgets/form';
import { dismissOverlay } from '../../overlay/overlaywrap';

class Conflict extends Component {
    constructor(props) {
        super(props);
    }

    resolve() {
        this.props.onResolve(this.props.group, this.props.index);
    }

    reopen() {
        this.props.onReopen(this.props.index);
    }

    pickedNewLevel(name, value) {
        if (!value) {
            for (let i = parseInt(name); i < this.props.group.newassoc.length; i++) {
                this.props.group.newassoc[i] = undefined;
            }
        } else {
            this.props.group.newassoc[parseInt(name)] = value;
        }

        console.log(this.props.group.newassoc);
    }

    render() {
        return (
            <div class="card">
                <div class="detail-head">
                    <div class="bubble-wrap">
                        <b>{this.props.title}</b>
                        { this.props.resolved ? (
                            <div class="bubble green">Resolved</div>
                        ) : (
                            <div class="bubble orange">Conflict</div>
                        ) }
                    </div>
                </div>

                { this.props.resolved ? (<div>

                    <div class="detail-list">
                        <b>{this.props.group.count}</b> articles will have their editions reassigned to : <b>{this.props.resolvedtitle}</b>
                    </div>

                </div>) : (<div>

                    <div class="detail-list">
                        <div>This edition combination conflicts with <b>{this.props.group.count}</b> articles.</div>
                    </div>

                    <div class="conflict-new-picker">
                        { this.props.levels.map((lvl, i) => (
                            <SelectField options={[{ displayname : " -- Empty level -- ", value : "" }, ...lvl.editions.map(ed => ({
                                displayname : ed.displayname, value : ed._id
                            }))]} initialValue={this.props.group.newassoc[i] || this.props.group.ids[i]} name={i} onChange={this.pickedNewLevel.bind(this)} />
                        )) }
                    </div>

                </div>) }

                <footer>
                    { this.props.resolved ? (
                        <span class="clickable red" onClick={this.reopen.bind(this)}>Reopen</span>
                    ) : (
                        <span class="clickable" onClick={this.resolve.bind(this)}>Mark as resolved</span>
                    ) }
                </footer>
            </div>
        );
    }
}

export class ConflictOverlay extends Component {
    constructor(props) {
        super(props);
        this.state.allsame = false;
        this.state.allsameassoc = [];

        this.originals = this.props.extra.editions.map(ed => [...ed.editions]);
        this.levels = [...this.props.extra.editions];

        const movedEditions = this.levels[this.props.extra.originallevel].editions.filter(ed => this.props.extra._ids.includes(ed._id)); 
        this.levels[this.props.extra.originallevel].editions = this.levels[this.props.extra.originallevel].editions.filter(ed => !movedEditions.includes(ed));
        this.levels[this.props.extra.newlevel].editions.unshift(...movedEditions);

        this.state.groups = this.props.extra.groups.map(g => ({
            ids : g._id,
            count : g.count,
            resolved : false,
            newassoc : new Array(this.props.extra.editions.length).fill(undefined).map((_, i) => (this.levels[i].find(x => x._id == g._id[i]) || {_id : undefined})["_id"])
        }));
    }

    onResolve(group, index) {
        const groups = [...this.state.groups];
        groups[index] = group;
        groups[index].resolved = true;
        groups[index].newassoc = groups[index].newassoc.filter(x => x);

        this.setState({ groups });
    }

    onReopen(index) {
        const groups = [...this.state.groups];
        groups[index].resolved = false;
        groups[index].newassoc = new Array(this.props.extra.editions.length).fill(undefined),

        this.setState({ groups });
    }

    render() {
        return (
            <div id="edition-conflict-overlay">
                <h1>Resolve new edition level conflicts</h1>
                <p>
                    Multiple edition combinations using the selected editions are assigned to multiple articles. 
                    Please review them before switching level.
                </p>

                <div>
                    { this.state.groups.map((group, i) => (
                        <Conflict 
                            onResolve={this.onResolve.bind(this)}
                            onReopen={this.onReopen.bind(this)}

                            resolved={group.resolved}
                            levels={this.levels}
                            group={group} 
                            key={i} 
                            index={i}
                            resolvedtitle={
                                group.resolved && group.newassoc.map((id, i) => this.levels[i].editions.find(
                                    ed => ed._id == id
                                ).displayname).join(' / ')
                            }
                            title={
                                group.ids.map((id, i) => this.originals[i].find(
                                    ed => ed._id == id
                                ).displayname).join(' / ')
                            } />
                    )) }
                </div>

                { this.state.groups.every(x => x.resolved) ? (
                    <div>
                        <ButtonWorker text="Apply resolutions" theme="blue" type="fill" />
                    </div>
                ) : (
                    <div>
                        <p>There are still unresolved conflicts.</p>
                        <ButtonWorker text="Discard resolutions" theme="red" type="outline" sync={true} work={() => dismissOverlay()} />
                    </div>
                ) }
            </div>
        );
    }
}
