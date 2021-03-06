import { Component, h, cloneElement } from "preact";
import { getLocal, storeLocal } from "../data/cache";

export class Tab extends Component {
    constructor(props) {
        super(props);
        
        this.state = {visible: props.visible || false}
    }
    
    componentWillReceiveProps(props) {
        this.setState({ visible: props.visible });
    }

    render() {
        return (
            <div className="tab-inner-content-wrapper" style={{ display: this.props.visible ? 'block' : 'none' }}>
                { this.props.children }
            </div>
        );
    }
}

export class TabView extends Component {
    static TAB_VIEW_PREFIX = 'tabview_';

    constructor(props) {
        super(props);
        props.children.forEach(child => {
            if (child.nodeName.prototype.constructor != Tab) {
                throw new TypeError('All direct children of Tab must be of type Tab');
            }
        });

        this.state = {
            tabs: props.children || [],
            selectedIndex: typeof getLocal(TabView.TAB_VIEW_PREFIX + this.props.id) != "undefined" ? 
                                  getLocal(TabView.TAB_VIEW_PREFIX + this.props.id) : 
                           typeof props.selectedIndex != "undefined" ?
                                  props.selectedIndex : 0
        };

        if (this.state.selectedIndex >= props.children.length) {
            this.state.selectedIndex = props.children.length - 1;
        }
    }

    selectTabAtIndex(index) {
        this.setState({ activeTab: this.state.tabs[index], selectedIndex: index });
        storeLocal(TabView.TAB_VIEW_PREFIX + this.props.id, index);

        this.props.onTabSelected && this.props.onTabSelected({ activeTab: this.state.tabs[index], selectedIndex: index });
    }

    componentWillReceiveProps(props) {
        if (typeof props.selectedIndex == 'number' && this.state.selectedIndex != props.selectedIndex) {
            this.selectTabAtIndex(props.selectedIndex);
        }
    }

    render() {
        const singletab = this.props.hidesingletab && this.state.tabs.length == 1;

        return (
            <div className={"tabview " + (this.props.noshadow ? "noshadow" : "")}>
                { singletab ? null : (<div className="tabs-bar">
                    {
                        this.state.tabs.map((tab, index) => (
                            <h4 className={`tab-name ${index == this.state.selectedIndex ? 'active' : ''}`} onClick={this.selectTabAtIndex.bind(this, index)}>
                                {tab.attributes.title}
                            </h4>
                        ))
                    }
                </div>) }
                <div className={"tab-content " + (singletab ? "singletab" : "")}>
                    {
                        this.props.children.map((tab, index) => {
                            return cloneElement(tab, { visible: index == this.state.selectedIndex })
                        })
                    }
                </div>
            </div>
        );
    }
}
