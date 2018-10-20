import { Component, h } from "preact";
import { castNotification } from './notifications';
import { DebouncedField, TextField } from "../widgets/form";
import API from "../data/api";
import { Picker } from './picker';

class Place extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className={`place ${this.props.selected ? 'selected' : ''}`} onClick={this.props.onSelect.bind(this, this.props)}>
                <h2 className="place-name">{this.props.description}</h2>
            </div>
        )
    }
}

export class PlacePicker extends Component {
    constructor(props) {
        super(props);

        this.values = {};
        this.placeId = '';
        this.sessionToken = Date.now().toString(16) + Math.random().toString(16) + Math.random().toString(16);
        this.state = {
            visible: false,
            params: {},
            selectedPlace: undefined
        };
    }    

    static tabTitle = 'Place';
    static slug = 'place';

    keydown(ev) {
        ev.keyCode == "27" && Picker.dismiss();
        ev.keyCode == "13" && Picker.accept();
    }

    search(input) {
        API.get('/googlemaps/autocompletequery', { input, sessionToken: this.sessionToken }, (err, data, r) => {
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

    placeSelected(selectedPlace) {
        this.values = { displayname: selectedPlace.structured_formatting.main_text }
        this.placeId = selectedPlace.place_id;
        this.upsert((err, data, r) => {
            if (data.value) {PlacePicker
                this.setState({ selectedPlace: data.value });
            } else {
                this.setState({ selectedPlace: { ...this.values, _id: this.placeId } });
            }
        });
    }

    updateValues(name, val) {
        this.values[name] = val;
        this.upsert();
    }

    upsert(done) {
        API.post('/googlemaps/upsertplace/' + this.placeId, this.values, (err, data, r) => {
            if (r.status == 200) {
                castNotification({
                    title: 'Place details saved to Lilium',
                    type: 'success'
                });
            } else {
                castNotification({
                    title: 'Error saving place details to Lilium',
                    type: 'error'
                })
            }

            done && done(err, data, r);
        });
    }

    render() {
        return (
            <div id="place-picker" onKeyDown={this.props.onKeyDown.bind(this)}>
                <div id="place-picker-search-pane">
                    <div id="search-content-wrapper">
                        <h1 className="title">Pick a place</h1>
                        <div id="search-bar">
                            <div id="query">
                                <DebouncedField name='query' placeholder='Search Query' onDebounce={this.search.bind(this)} />
                            </div>
                        </div>
                        <div id="search-results">
                            {
                                this.state.places && this.state.places.length ? (
                                    this.state.places.map(place => (
                                        <Place {...place} onSelect={this.placeSelected.bind(this)} key={place.place_id}
                                                selected={this.state.selectedPlace ? place.place_id == this.state.selectedPlace : false} />
                                    ))
                                ) : (
                                    <p>No places to show</p>
                                )
                            }
                        </div>
                        <div id="place-details" className='card'>
                            {
                                this.state.selectedPlace ? (
                                    <div id="place-details-form">
                                        <h1 id="det-place-name">{this.state.selectedPlace.displayname}</h1>
                                        <TextField name='description' placeholder='Description' multiline value={this.state.selectedPlace.description}
                                                    onChange={this.updateValues.bind(this)} />
                                    </div>
                                ) : (
                                    <p>Select a place to see details</p>
                                )
                            }
                        </div>
                    </div>
                    <div id="place-picker-actions-bar">
                        <button className={"button purple " + (this.props.carousel ? 'outline' : 'fill')} onClick={Picker.accept.bind(this, this.state.selectedPlace)}>Add Selected Place</button>
                        <button className="button outline red" onClick={Picker.dismiss.bind(this)}>Cancel</button>
                    </div>
                </div>
                <div id="place-picker-map-pane">
                    <iframe id='map-embed' frameborder="0" style="border:0"
                            src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBD6KcmiUsbFgikRMHDXxSByUAu7A8GkQs&q=${this.state.selectedPlace && this.state.selectedPlace._id ? 'place_id:' + this.state.selectedPlace._id : 'Montreal'}`}
                            allowfullscreen>
                    </iframe>
                </div>
            </div>
        );
    }
}
