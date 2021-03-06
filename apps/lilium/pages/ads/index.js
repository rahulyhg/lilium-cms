import { Component, h } from "preact";
import { TabView, Tab } from '../../widgets/tabview';
import { StackBox } from '../../widgets/form';
import API from '../../data/api';
import { castNotification } from "../../layout/notifications";
import { LoadingView } from "../../layout/loading";
import slugify from "slugify";

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
    
    updateAdSet(id, ads) {
        const adSetIndex = this.state.adSets.findIndex(adSet => {
            return adSet._id == id;
        });

        if (adSetIndex >= 0) {
            const adSets = this.state.adSets;
            adSets[adSetIndex].ads = ads.map(adMarkup => { return { markup: adMarkup } });
            
            this.setState({ adSets });
            
            API.post('/ads/' + id, {ads: adSets[adSetIndex].ads}, (err, data, r) => {
                if (!r.status == 200) {
                    castNotification({
                        title : "Error",
                        message : `[${r.status}] Could not save ad sets to the server`,
                        type : 'error'
                    })
                }
            });
        }
    }

    render() {
        if (!this.state.loading) {
            return (
                <div id="ads-management">
                    <div class="leader-title">
                        <div class="leader-title-responsive">
                            <h1>Advertisement Management</h1>
                            <p>A list of ad tags to be used by the theme, grouped by language and page type. It's up to the theme to decide whether or not those settings will be respected.</p>
                        </div>
                    </div>
                    <div class="leader-content solid classic">
                        <TabView id='ads-management'>
                            {
                                this.state.adSets.map(adSet => (
                                    <Tab title={`${adSet.lang.toUpperCase()} / ${adSet.type}`} key={slugify(adSet._id)}>
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
