import { h, Component } from "preact";
import { bindRealtimeEvent, unbindRealtimeEvent } from '../../realtime/connection';
import { styles } from './style';
import API from '../../data/api';
import { AnimeNumber } from '../../widgets/animenumber';
import { Spinner } from '../../layout/loading';
import { ChartGraph } from '../../widgets/chart';
import { getSession, getLocal, storeLocal } from '../../data/cache';

import { PublishingTab } from './publishing';
import { PonglinkTab } from './ponglink';
import { PerformanceTab } from './performance';
import { ContractorTab } from './contractor';

const TAB_COMPONENTS = [
    PublishingTab, PonglinkTab, PerformanceTab, ContractorTab
];

class DashboardTabs extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedTab : props.selectedTab
        }
    }

    clickedOn(tab) {
        this.props.onClick(tab);
    }

    componentWillReceiveProps(props) {
        this.setState({ selectedTab : props.selectedTab });
    }

    render() {
        return (
            <div class="dashboard-tabs">
                { this.props.tabs.map(tab => (
                    <div class={"dashboard-tab " + (tab == this.state.selectedTab ? "selected" : "")} key={tab.tabprops.id} onClick={this.clickedOn.bind(this, tab)}>
                        {tab.tabprops.text}
                    </div>
                ) ) }
            </div>
        )
    }
};

class DashboardView extends Component {
    constructor(props) {
        super(props);
        this.state = { tab : props.tab }
    }

    componentWillReceiveProps(props) {
        this.setState({ tab : props.tab });
    }

    render() {
        return (
            <div class="dashboard-view">
                <this.state.tab />
            </div>  
        );
    }
}

export default class DashboardPage extends Component {
    static registerDashboardTab(tabComponent) {
        if (!tabComponent || !tabComponent.tabprops) {
            throw new Error("Dashboard tab component must implement static get tabprops()");
        }

        TAB_COMPONENTS.push(tabComponent);
    }

    constructor(props) {
        super(props);
        this.state = { 
            tabs : TAB_COMPONENTS.filter(x => liliumcms.session.hasRight(x.tabprops.right)) 
        };

        this.state.selectedTab = this.state.tabs[getLocal("TAB_dashboard") || 0];
    }

    componentDidMount() {
        
    }

    tabClicked(tab) {
        storeLocal("TAB_dashboard", this.state.tabs.indexOf(tab));
        this.setState({ selectedTab : tab });
    }

    render() {
        return (
            <div>
                <DashboardTabs tabs={ this.state.tabs } selectedTab={ this.state.selectedTab } onClick={this.tabClicked.bind(this)} />
                <DashboardView tab={ this.state.selectedTab } />
            </div>
        );
    }
}
