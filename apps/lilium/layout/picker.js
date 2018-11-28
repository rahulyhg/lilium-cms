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
     * @param {array} sessionOptions.accept The entities types that can be picked
     * @param {string} sessionOptions.tab The tab that is opened when the picker is cast
     * @param {object} sessionOptions.options Object keyed by tab name that holds tab specific options
     * @param {string} sessionOptions.type Indicates whether the session is of type carousel
     * @param {array} sessionOptions.carouselElements Array representing the elements of a carousel with which to open a carousel picker
     */
    constructor(sessionOptions) {
        this.accept = sessionOptions.accept;
        if (!this.accept || !this.accept.length) {
            this.accept = AVAILABLE_PICKER_TABS;
        }

        this.tab = sessionOptions.tab || this.getLastOpened() || this.accept[0];
        this.options = sessionOptions.options || {};
        this.carouselElements = sessionOptions.carouselElements || [];
        this.type = sessionOptions.type;

        this.accept.forEach(x => {
            const opts = this.options[x] || {};
            if (this.type == 'carousel' && !opts.selected) {
                opts.selected = this.carouselElements.find(e => e.type == x);
                this.options[x] = opts;
            }
        });
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
            carouselElements: []
        };

        _singleton = this;
        this.keydown_bound = this.keydown.bind(this);
    }

    static Session = PickerSession;

    static cast(session, done) {
        if (session) {
            log('Picker', 'Casting picker singleton', 'detail');
            const tabs = session.accept.map(x => PickerMap[x]);
            if (!session.options) session.options = {};
            _singleton.changeState({ session: session, visible: true, tabs, callback: done });
            window.addEventListener('keydown', _singleton.keydown_bound);
        } else {
            log('Picker', 'Cannot cast Picker without a Session object', 'error');
        }
    }

    static registerEmbedType(name, pickerComponent, carouselPreviewComponent) {
        Picker.PickerMap[name] = { pickerComponent, carouselPreviewComponent };
    }

    static dismiss() {
        log('Picker', 'Dismissing picker singleton', 'detail');
        _singleton.setState({ visible : false });
        window.removeEventListener('keydown', _singleton.keydown_bound);

        // _singleton.state.callback && _singleton.state.callback(_singleton.state.selectedElement);
    }

    /**
     * Takes the appropriate action to handle an element being picked by a subpicker.
     * If the current session is a carousel, adds the element to the carousel, otherwise, dismiss the picker and return the value to the caller
     * @param {object} selectedEl 
     */
    static accept(selectedEl) {
        log('Picker.accept() called by subpicker', 'detail');
        if (_singleton.state.session.type == 'carousel') Picker.addToCarousel(selectedEl);
        else Picker.finish(selectedEl);
    }

    /**
     * Adds the specified element to the carousel
     * @param {object} el The element to gabrielcardiadd to the carousel
     */
    static addToCarousel(el) {
        const carouselElements = _singleton.state.carouselElements;
        carouselElements.push(el);
        _singleton.setState({ carouselElements });
    }

    /**
     * Dismisses the Picker and returns the values selected by the user
     * @param {object} selectedVal Values selected by the user
     */
    static finish(el) {
        if (_singleton.state.session.type == 'carousel') {
            log('Picker', "Got a carousel and calling back", 'detail');
            _singleton.state.callback && _singleton.state.callback({ type: 'carousel', elements: _singleton.state.carouselElements });
        } else {
            if (el) {
                log('Picker', `Got an individual embed of type: '${el.type}'`, 'detail');
                _singleton.state.callback && _singleton.state.callback(el);
            } else {
                log('Picker', "Picker.finish() got an undefined param and session wasn't of type carousel", 'warn');
            }
        }

        Picker.dismiss();
    }

    /**
     * Triggers setState() method of the component instance. Allows the component to execute instructions before setting the state
     * @param {object} state the new state to be affected to the component
     */
    changeState(state) {
        const newState = {...state};
        if (newState.session.type == 'carousel') {
            newState.carouselElements = newState.session.carouselElements;
        }

        this.setState(newState);
    }

    keydown(ev) {
        ev.keyCode == "27" && Picker.dismiss();
        ev.keyCode == "13" && Picker.finish();
    }

    carouselElementClicked(element) {
        if (AVAILABLE_PICKER_TABS.includes(element.type)) {
            const newState = {...this.state};
            newState.tab = element.type;
            newState.session.options[element.type].selected = element;
            this.setState(newState);
        }
    }

    render(props, state) {
        const selectedTabIndex = AVAILABLE_PICKER_TABS.indexOf(state.session.tab) || 0;
        if (state.visible) {
            return (
                <div id="picker-overlay">
                    <div id="picker-wrapper">
                        <div id="picker" className={state.session.type == 'carousel' && 'carousel-session'}>
                            <TabView id={"picker_" + (state.session.id ? state.session.id : "global")} selectedIndex={selectedTabIndex}>
                                {
                                    state.tabs.map((SubPicker) => (
                                        <Tab title={SubPicker.tabTitle}>
                                            <SubPicker onKeyDown={this.keydown.bind(this)} isCarousel={state.session.type == 'carousel'} options={state.session.options[SubPicker.slug]}
                                                        selected={state.session.options[SubPicker.slug].selected} />
                                        </Tab>
                                    ))
                                }
                            </TabView>
                            {
                                state.session.type == 'carousel' ? (
                                    <CarouselPreview elements={state.carouselElements} onClick={this.carouselElementClicked.bind(this)} />
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

class CarouselPreview extends Component {
    constructor(props) {
        super(props);
        this.state = { elements: props.elements }
    }

    /**
     * Removes a carousel element
     * @param {number} carouselIndex The index of the element to remove
     */
    removeCarouselElement(carouselIndex) {
        const elements = this.state.elements;
        elements.splice(carouselIndex, 1);
        this.setState({ elements });
    }

    /**
     * Returns the component that coresponds to a given embed type. Defaults to DefaultCarouselPreview
     * @param {string} type type for} which to return the component
     */
    static getComponentByType(type = '') {
        switch (type.toLowerCase()) {
            case ImagePicker.slug:
                return ImageCarouselPreview;
            case PlacePicker.slug:
                return MapCarouselPreview;
            default:
                return DefaultCarouselPreview;
        }
    }

    render(props, state) {
        return (
            <div id="picker-carousel">
                <div id="carousel-preview">
                    {
                        state.elements && state.elements.length ? (
                            state.elements.map((el, index) => (
                                <CarouselElement PreviewComponent={CarouselPreview.getComponentByType(el.type)} element={el}
                                                    key={index} index={index} removeCarouselElement={this.removeCarouselElement.bind(this)}
                                                    onClick={props.onClick.bind(this, el)} />
                            ))
                        ) : (
                            <div id="carousel-empty-text">
                                <p>Elements added to the carousel will appear here</p>
                                <p>No items in the carousel</p>
                            </div>
                        )
                    }
                </div>
                <div id="picker-carousel-actions">
                    <button className='button fill purple' onClick={Picker.finish.bind(Picker, undefined)}>Add carousel</button>
                </div>
            </div>
        )
    }
}

const CarouselElement = props => (
    <div className="carousel-element-preview-card" onClick={props.onClick.bind(this)}>
        <i className="remove-carousel-element fa fa-times" onClick={e => { e.stopPropagation(); props.removeCarouselElement(props.index); }}></i>
        {
            <props.PreviewComponent el={props.element.image || props.element.place} />
        }
    </div>
)

const ImageCarouselPreview = props => (
    <img src={props.el.sizes.square.url} className='carousel-image-preview' alt="Carousel Image Embed"/>
)

const MapCarouselPreview = props => (
    <div className="map-carousel-preview">
        <i className="map-marker-icon fa-4x fas fa-map-marker-check"></i>
        <p className="place-name">{props.el.displayname}</p>
    </div>
);

const  DefaultCarouselPreview = props => (
    <span>Default preview</span>
);
