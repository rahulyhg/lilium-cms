import { Component, h } from "preact";
import { castNotification } from './notifications';
import { DebouncedField, CheckboxField } from "../widgets/form";
import API from "../data/api";

class Place extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className={`place ${this.props.selected ? 'selected' : ''}`} onClick={this.props.onSelect.bind(this, this.props.place_id)}>
                <h2 className="place-name">{this.props.description}</h2>
            </div>
        )
    }
}

let _singleton;
export class PlacePicker extends Component {
    constructor(props) {
        super(props);

        this.state = {
            visible: false,
            params: {},
            placeId: '',
            searchGoogle: false,
            selected: undefined,
            callback: undefined
        };

        _singleton && log('PlacePicker', 'Overriding _singleton reference value because the PlacePicker class was instanciated multiple times', 'watning');
        _singleton = this;
        this.keydown_bound = this.keydown.bind(this);
    }    

    static sessionToken = undefined;

    static cast(params, done) {
        log('PlacePicker', 'Casting Place picker singleton', 'detail');
        
        PlacePicker.sessionToken = Date.now().toString(16) + Math.random().toString(16) + Math.random().toString(16);
        _singleton.setState({ params, visible: true, selected: undefined, callback: done });        
        window.addEventListener('keydown', _singleton.keydown_bound);
        document.addEventListener('navigate', PlacePicker.dismiss);
    }

    static dismiss() {
        log('PlacePicker', 'Dismissing Place picker singleton', 'detail');
        _singleton.setState({ visible : false });
        window.removeEventListener('keydown', _singleton.keydown_bound);
        document.removeEventListener('navigate', PlacePicker.dismiss);
    }

    static accept() {
        if (_singleton.state.placeId) {
            log('PlacePicker', 'Selected Place and calling back', 'detail');
            _singleton.state.callback && _singleton.state.callback(_singleton.state.placeId);        
            PlacePicker.dismiss();
        }
    }

    toggleSearchGoogle() {
        this.setState({ searchGoogle: !this.state.searchGoogle });
    }

    keydown(ev) {
        ev.keyCode == "27" && PlacePicker.dismiss();
        ev.keyCode == "13" && PlacePicker.accept();
    }

    search(input) {
        API.get('/googlemaps/autocompletequery', { input, sessionToken: PlacePicker.sessionToken }, (err, data, r) => {
            if (r.status == 200) {
                this.setState({ places: data.predictions });
            } else {
                this.setState({ places: [] });
                castNotification({
                    title: 'Error getting maps results',
                    type: 'error'
                });
            }
        });
    }

    placeSelected(placeId) {
        this.setState({ placeId });
    }

    render() {
        if (!this.state.visible) return null;

        return (
            <div id="place-picker-overlay">
                <div id="place-picker">
                    <div id="place-picker-search-pane">
                        <h1 className="title">Pick a place</h1>
                        <div id="search-bar">
                            <div id="query">
                                <DebouncedField name='query' placeholder='Search Query' onDebounce={this.search.bind(this)} />
                            </div>
                            <div id="search-google">
                                <div id="image-checkbox-wrapper">
                                    <b className='placeholder'>Search Google</b>
                                    <i className="fab fa-google" id="search-google-cb" onClick={this.toggleSearchGoogle.bind(this)}
                                        role="checkbox" aria-checked={this.state.searchGoogle}></i>
                                </div>
                            </div>
                        </div>
                        <div id="search-results">
                            {
                                this.state.places ? (
                                    this.state.places.map(place => (
                                        <Place {...place} onSelect={this.placeSelected.bind(this)} key={place.place_id} selected={place.place_id== this.state.placeId} />
                                    ))
                                ) : (
                                    <p>No places to show</p>
                                )
                            }
                        </div>
                    </div>
                    <div id="place-picker-map-pane">
                        <iframe id='map-embed' frameborder="0" style="border:0"
                                src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBD6KcmiUsbFgikRMHDXxSByUAu7A8GkQs&q=${this.state.placeId ? 'place_id:' + this.state.placeId : 'Montreal'}`}
                                allowfullscreen>
                        </iframe>
                    </div>
                </div>
            </div>
        );
    }
}
