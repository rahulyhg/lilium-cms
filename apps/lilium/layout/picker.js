import { Component, h } from 'preact';
import { getLocal } from '../data/cache';
import { TabView, Tab } from '../widgets/tabview';
import { EmbedPicker } from './embedpicker';
import { PlacePicker } from './placepicker';
import { ImagePicker } from './imagepicker';

const PickerMap = {
    images: ImagePicker,
    places: PlacePicker,
    embeds: EmbedPicker
}

const LAST_OPENED_LOCAL_KEY = 'picker.lastopened';
const AVAILABLE_PICKER_TABS = Object.keys(PickerMap);

class PickerSession {
    /**
     * Instanciates a Picker Session object
     * @param {object} sessionOptions Session options
     * @param {array} sessionOptions.accept The entities than can be picker
     * @param {string} sessionOptions.tab The tab that is opened when the picker is cast
     * @param {object} sessionOptions.options Object keyed by tab name that holds tab specific options
     * @param {callback} sessionOptions.callback Callback fired when an item is selected
     */
    constructor(sessionOptions) {
        this.accept = sessionOptions.accept;
        if (!this.accept || !this.accept.length) {
            this.accept = AVAILABLE_PICKER_TABS;
        }

        this.tab = sessionOptions.tab || this.getLastOpened() || this.accept[0];
    }

    getLastOpened() {
        return getLocal(LAST_OPENED_LOCAL_KEY);
    }
}

let _singleton;
export class Picker extends Component {
    constructor(props) {
        super(props);
        this.state = {
            visible: false,
            session: {}
        };

        _singleton = this;
        this.keydown_bound = this.keydown.bind(this);
    }

    static Session = PickerSession;

    static cast(session, done) {
        log('Picker', 'Casting picker singleton', 'detail');
        const tabs = session.accept.map(x => PickerMap[x]);
        console.log(tabs);
        _singleton.setState({ session, visible: true, tabs });
        
        window.addEventListener('keydown', _singleton.keydown_bound);
    }
    
    static dismiss() {
        log('Picker', 'Dismissing image picker singleton', 'detail');
        _singleton.setState({ visible : false });
        window.removeEventListener('keydown', _singleton.keydown_bound);
    }

    static accept() {        
        if (_singleton.state.selected) {
            log('Picker', 'Selected image and calling back', 'detail');
            _singleton.state.callback && _singleton.state.callback(_singleton.state.selected);        
            Picker.dismiss();
        }
    }

    keydown(ev) {
        ev.keyCode == "27" && Picker.dismiss();
        ev.keyCode == "13" && Picker.accept();
    }

    render() {
        if (this.state.visible) {
            return (
                <div id="image-picker-overlay">
                    <div id="image-picker">
                        <TabView>
                            {
                                this.state.tabs.map(SubPicker => {
                                    return (
                                        <Tab title={SubPicker.tabTitle}>
                                            <SubPicker />
                                        </Tab>
                                    )
                                })
                            }
                        </TabView>
                    </div>
                </div>
            )
        } else {
            return null;
        }
    }
}
