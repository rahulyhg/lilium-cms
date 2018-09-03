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
            selectedArticles: props.initialValue || []
        }
    }
    
    articleSelected(article) {
        const selectedArticles = [...this.state.selectedArticles, article];
        this.setState({ selectedArticles });
        this.props.onChange && this.props.onChange(selectedArticles);
    }

    /**
     * Moves an article 'up' in the list, decreasing its index
     * @param {number} startIndex 
     */
    moveArticleUp(startIndex) {
        const selectedArticles = this.state.selectedArticles;
        if (startIndex > 0 && startIndex <= this.state.selectedArticles.length - 1) {
            selectedArticles.splice(startIndex - 1, 0, selectedArticles.splice(startIndex, 1)[0]);
            this.setState({ selectedArticles });
            this.props.onChange && this.props.onChange(selectedArticles);
        }
    }

    /**
     * Moves an article 'down' in the list, increasing its index
     * @param {number} startIndex 
     */
    moveArticleDown(startIndex) {
        const selectedArticles = this.state.selectedArticles;
        if (startIndex >= 0 && startIndex <= this.state.selectedArticles.length - 2) {
            selectedArticles.splice(startIndex + 1, 0, selectedArticles.splice(startIndex, 1)[0]);
            this.setState({ selectedArticles });
            this.props.onChange && this.props.onChange(selectedArticles);
        }
    }

    removeArticle(index) {
        const selectedArticles = this.state.selectedArticles;
        selectedArticles.splice(index, 1);
        this.setState({ selectedArticles });
        this.props.onChange && this.props.onChange(selectedArticles);
    }

    render() {
        return (
            <div className="article-pirkcer">
                <AutocompleteField endpoint='/chains/search' autocompleteField='title' valueSelected={this.articleSelected.bind(this)}  />
                <div className="article-picker-list">
                    {
                        this.state.selectedArticles.map((article, index) => (
                            <ArticlePickerArticle key={slugify(article.title)} index={index} lastInList={index == this.state.selectedArticles.length - 1} title={article.title}
                                                    removeArticle={this.removeArticle.bind(this)} moveArticleDown={this.moveArticleDown.bind(this)}
                                                    moveArticleUp={this.moveArticleUp.bind(this)} />
                        ))
                    }
                </div>
            </div>
        );
    }
}
