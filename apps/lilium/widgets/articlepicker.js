import { AutocompleteField } from "./form";
import { Component, h } from "preact";
import slugify from 'slugify';

class ArticlePickerArticle extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className="article-picker-article">
                {/* Display position as one based */}
                <h4 className="position">{this.props.index + 1}</h4>
                <div className="actions">
                    <i className="fal fa-times remove-article" onClick={this.props.removeArticle.bind(this, this.props.index)}></i>
                    <div className="position-controls">
                        {
                            (this.props.index != 0) ? <i className="fal fa-chevron-up" onClick={this.props.moveArticleUp.bind(this, this.props.index)}></i> : null
                        }
                        {
                            (!this.props.lastInList) ? <i className="fal fa-chevron-down" onClick={this.props.moveArticleDown.bind(this, this.props.index)}></i> : null
                        }
                    </div>
                </div>
                <h4 className="title">{this.props.title}</h4>
            </div>
        )
    }
}

export class ArticlePicker extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedArticlesTitles: []
        }
    }
    
    articleSelected(article) {
        if (!this.state.selectedArticlesTitles.includes(article.title)) {
            const selectedArticlesTitles = [...this.state.selectedArticlesTitles, article.title];
            this.setState({ selectedArticlesTitles });
            this.props.onArticleSelected && this.props.onArticleSelected(article);
        }
    }

    /**
     * Moves an article 'up' in the list, decreasing its index
     * @param {number} startIndex 
     */
    moveArticleUp(startIndex) {
        const selectedArticlesTitles = this.state.selectedArticlesTitles;
        if (startIndex > 0 && startIndex <= this.state.selectedArticlesTitles.length - 1) {
            selectedArticlesTitles.splice(startIndex - 1, 0, selectedArticlesTitles.splice(startIndex, 1)[0]);
            this.setState({ selectedArticlesTitles });
        }
    }

    /**
     * Moves an article 'down' in the list, increasing its index
     * @param {number} startIndex 
     */
    moveArticleDown(startIndex) {
        const selectedArticlesTitles = this.state.selectedArticlesTitles;
        if (startIndex >= 0 && startIndex <= this.state.selectedArticlesTitles.length - 2) {
            selectedArticlesTitles.splice(startIndex + 1, 0, selectedArticlesTitles.splice(startIndex, 1)[0]);
            this.setState({ selectedArticlesTitles });
        }
    }

    removeArticle(index) {
        const selectedArticlesTitles = this.state.selectedArticlesTitles;
        selectedArticlesTitles.splice(index, 1);
        this.setState({ selectedArticlesTitles });
    }

    render() {
        return (
            <div className="article-pirkcer">
                <AutocompleteField endpoint='/chains/search' autocompleteField='title' valueSelected={this.articleSelected.bind(this)}  />
                <div className="article-picker-list">
                    {
                        this.state.selectedArticlesTitles.map((articleTitle, index) => (
                            <ArticlePickerArticle key={slugify(articleTitle)} index={index} lastInList={index == this.state.selectedArticlesTitles.length - 1} title={articleTitle}
                                                    removeArticle={this.removeArticle.bind(this)} moveArticleDown={this.moveArticleDown.bind(this)}
                                                    moveArticleUp={this.moveArticleUp.bind(this)} />
                        ))
                    }
                </div>
            </div>
        );
    }
}
