import { Component, h } from "preact";

export class Tab extends Component {
    constructor(props) {
        super(props);
        console.log('Tab props', props);
        
    }
    
    render() {
        return (
            <div className="tab-inner-content-wrapper">
                { this.props.children }
            </div>
        );
    }
}

export class TabView extends Component {
    constructor(props) {
        super(props);

        props.children.forEach(child => {
            if (child.nodeName.prototype.constructor != Tab) {
                throw new TypeError('All direct children of Tab must be of type Tab');
            }
        });

        this.state = {
            tabs: props.children || [],
        };
        this.state.activeTab = this.state.tabs[props.selectedIndex || 0];
        
    }

    selectTabAtIndex(index) {
        this.setState({ activeTab: this.state.tabs[index] });
    }

    render() {
        return (
            <div className="tabview">
                <div className="tabs-bar">
                    {
                        this.state.tabs.map((tab, index) => (
                            <h4 className={`tab-name ${tab == this.state.activeTab ? 'active' : ''}`} onClick={this.selectTabAtIndex.bind(this, index)}>
                                {tab.attributes.title}
                            </h4>
                        ))
                    }
                </div>
                <div className="tab-content">
                    {
                        <Tab {...this.state.activeTab.attributes}>
                            {this.state.activeTab.children}
                        </Tab>
                    }
                </div>
            </div>
        );
    }
}