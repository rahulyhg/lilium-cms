import { Component, h } from "preact";
import { TabView, Tab } from '../../widgets/tabview';
import { StackBox } from '../../widgets/form';
import API from '../../data/api';
import { castNotification } from "../../layout/notifications";
import { LoadingView } from "../../layout/loading";

export default class AdsManagement extends Component {
    constructor(props) {
        super(props);
        this.state = { adSets: {}, loading: true };
    }
    
    componentDidMount() {
        API.get('/ads/list', {}, (err, data, r) => {
            if (r.status == 200) {
                this.setState({ adSets: data, loading: false });
            } else {
                castNotification({
                    title: 'Error while fetching ad stacks'
                });
            }
        });
    }
    
    updateAdSet(id, aads) {
        console.log('updateAdSet: ', id, aads);
        
        const adSetIndex = this.state.adSets.findIndex(adSet => {
            return adSet._id == id;
        });

        if (adSetIndex >= 0) {
            const adSets = this.state.adSets;
            adSets[adSetIndex].ads = aads.map(adMarkup => { return { markup: adMarkup } });
            console.log(adSets);
            
            this.setState({ adSets });
            
            API.post('/ads/' + id, {ads: adSets[adSetIndex].ads}, (err, data, r) => {
                if (r.status == 200) {
                    castNotification({
                        title: 'Modifications to the ad set saved'
                    })
                } else {
                    castNotification({
                        title: 'Could not save ad sets to the server'
                    })
                }
            });
        }
    }

    render() {
        if (!this.state.loading) {
            return (
                <div id="ads-management">
                    <h1>Advertisement Management</h1>
                    <div id="ads-tabs" style={{ width: '800px', margin: 'auto' }}>
                        <TabView>
                            {
                                this.state.adSets.map(adSet => (
                                    <Tab title={`${adSet.lang.toUpperCase()} / ${adSet.type}`}>
                                        <StackBox name={adSet._id} initialValue={adSet.ads.map(ad => ad.markup)} onChange={this.updateAdSet.bind(this)} />
                                    </Tab>
                                ))
                            }
                        </TabView>
                    </div>
                </div>
            );
        } else {
            <LoadingView />
        }
    }
}
