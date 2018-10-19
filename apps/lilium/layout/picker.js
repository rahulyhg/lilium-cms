import { Component, h } from 'preact';
import { getLocal } from '../data/cache';
import { TabView, Tab } from '../widgets/tabview';
import { ImagePicker } from './imagepicker';
import { PlacePicker } from './placepicker';
import { EmbedPicker } from './embedpicker';

const PickerMap = {
    [ImagePicker.slug]: ImagePicker,
    [PlacePicker.slug]: PlacePicker,
    [EmbedPicker.slug]: EmbedPicker
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
        this.options = sessionOptions.options || {};
        this.type = sessionOptions.type;
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
        if (session) {
            log('Picker', 'Casting picker singleton', 'detail');
            const tabs = session.accept.map(x => PickerMap[x]);
            _singleton.setState({ session: session, visible: true, tabs, callback: done });
            window.addEventListener('keydown', _singleton.keydown_bound);
        } else {
            log('Picker', 'Cannot cast Picker without a Session object', 'error');
        }
    }

    static dismiss() {
        log('Picker', 'Dismissing image picker singleton', 'detail');
        _singleton.setState({ visible : false });
        window.removeEventListener('keydown', _singleton.keydown_bound);
    }

    /**
     * Dismisses the Picker and returns the values selected by the user
     * @param {object} selectedVal Values selected by the user
     */
    static accept(selectedVal) {
        if (selectedVal) {
            log('Picker', 'Selected image and calling back', 'detail');
            _singleton.state.callback && _singleton.state.callback(selectedVal);
            Picker.dismiss();
        }
    }

    keydown(ev) {
        ev.keyCode == "27" && Picker.dismiss();
        ev.keyCode == "13" && Picker.accept();
    }

    render() {
        console.log(this.state);
        if (this.state.visible) {
            return (
                <div id="picker-overlay">
                    <div id="picker">
                        <TabView>
                            {
                                this.state.tabs.map((SubPicker) => {
                                    return (
                                        <Tab title={SubPicker.tabTitle}>
                                            <SubPicker onKeyDown={this.keydown.bind(this)} carousel={this.state.session.type == 'carousel'} options={this.state.session.options[SubPicker.slug]} />
                                        </Tab>
                                    )
                                })
                            }
                        </TabView>
                        {
                            this.state.session.type == 'carousel' ? (
                                <div className="picker-carousel">
                                    <div id="carousel-preview">
                                        <p>No items in the carousel</p>
                                    </div>
                                    <button className='button fill purple' onClick={() => { alert('asd'); }}>Add carousel</button>
                                </div>
                            ) : null
                        }
                    </div>
                </div>
            )
        } else {
            return null;
        }
    }
}
