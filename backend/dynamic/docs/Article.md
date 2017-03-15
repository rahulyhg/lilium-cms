# Article
---
## Article generation and useful methods

``Article.deepFetch( siteConfig, identifier, callback, preview, conditions )``
* **siteConfig** Website confirmation; stored in *cli._c*
* **identifier** Article identifier as *ObjectId _id* or *string name*
* **callback** Called after fetching the article; first parameter is an article, or *false* if not found
* **preview** Flag; if ture, will query the preview collection instead
* **conditions** Extra conditions; usually used to fetch an article only if it's currently published
> A deep fetch will fill multiple fields with live data including the author, the featured image, categories, etc. It fires the event *article_deepfetch* before doing the fetch, and *article_will_fetch* before calling back.

``Article.generateArticle( siteConfig, articleID, callback, fetchNotNeeded )``
* **siteConfig** Website confirmation; stored in *cli._c*
* **articleID** Article identifier as *ObjectId _id*
* **callback** Called when done generating article
* **fetchNotNeeded** Flat; if true, articleID will be treated as a deepfetched article
> The previous method will generate an HTML file according to the registered theme. Fires the event *article_will_render* before creating the file. 

### Hooks
> Multiple hooks are fired from the Article module, and it is possible to register callbacks.
* *article_deepfetch* Fired before doing the deep fetch
* *article_will_fetch* Fired before calling back from a deep fetch
* *article_will_render* Fired before creating an article HTML file
* *article_will_published* Fired before publishing or saving an article
* *article_published* Fired after publishing or saving an article
* *article_will_preview* Fired before create an article preview
* *article_will_delete* Fired before an article is being unpublished
* *article_deleted* Fired after an article was unpublished


