import { AutocompleteField } from "./form";
import { Component, h } from "preact";

export class ArticlePicker extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedArticles: []
        }
    }
    
    componentDidMount() {
        
    }
    
    render() {
        return (
            <AutocompleteField endpoint='/chains/search' autocompleteField='title'  />
        );
    }
}