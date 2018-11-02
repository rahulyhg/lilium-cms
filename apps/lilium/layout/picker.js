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
            session: {},
            selectedElement: {}
        };

        _singleton = this;
        this.keydown_bound = this.keydown.bind(this);
    }

    static Session = PickerSession;

    static cast(session, done) {
        if (session) {
            log('Picker', 'Casting picker singleton', 'detail');
            const tabs = session.accept.map(x => PickerMap[x]);
            const carouselElements = session.state == 'carousel' ? [] : undefined;
            _singleton.setState({ session: session, visible: true, tabs, callback: done, carouselElements });
            window.addEventListener('keydown', _singleton.keydown_bound);
        } else {
            log('Picker', 'Cannot cast Picker without a Session object', 'error');
        }
    }

    static dismiss() {
        log('Picker', 'Dismissing image picker singleton', 'detail');
        _singleton.setState({ visible : false });
        window.removeEventListener('keydown', _singleton.keydown_bound);

        // _singleton.state.callback && _singleton.state.callback(_singleton.state.selectedElement);
    }

    /**
     * Takes the appropriate action to handle an element being picked by a subpicker.
     * If the current session is a carousel, adds the element to the carousel, otherwise, dismiss the picker and return the value to the caller
     * @param {object} selectedVal 
     */
    static accept(selectedVal) {
        if (_singleton.state.session.type == 'carousel') _singleton.addToCarousel(selectedVal)
        else Picker.finish(selectedVal)
    }

    /**
     * Adds the specified element to the carousel
     * @param {object} el The element to add to the carousel
     */
    static addToCarousel(el) {
        const carouselElements = _singleton.state.carouselElements;
        carouselElements.push(el);
        this.setState({ carouselElements });
    }

    /**
     * Dismisses the Picker and returns the values selected by the user
     * @param {object} selectedVal Values selected by the user
     */
    static finish(el) {
        if (el) {
            log('Picker', 'Selected image and calling back', 'detail');
            _singleton.state.callback && _singleton.state.callback(el);
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
                    <div id="picker-wrapper">
                        <div id="picker" className={this.state.session.type == 'carousel' && 'carousel-session'}>
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
                                    <Carousel />    
                                ) : null
                            }
                        </div>
                    </div>
                </div>
            )
        } else {
            return null;
        }
    }
}

class CarouselElement extends Component {
    constructor(props) {
        super(props);
        if (props.type == undefined || !PickerMap.includes(props.type)) throw "";
    }
}

class Carousel extends Component {
    constructor(props) {
        super(props);
        this.elements = props.elements || {};
    }

    render(props) {
        return (
            <div id="picker-carousel">
                <div id="carousel-preview">
                    {
                        this.state.selectedElement && this.state.selectedElement.length ? (
                            this.state.selectedElement.map(el => (
                                <p className="carousel-element">Carousel element</p>
                            ))
                        ) : (
                            <p>Elements added to the carousel will appear here</p>
                        )
                    }
                    <p>No items in the carousel</p>
                </div>
                <div id="picker-carousel-actions">
                    <button className='button fill purple' onClick={() => { alert('asd'); }}>Add carousel</button>
                </div>
            </div>
        )
    }
}
