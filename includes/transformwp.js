/*
    Wordpress Schema

    item : [
        {
            title[0]
            pubDate[0]
            wp:post_id[0]
            wp:post_name[0]
            wp:status[0]
            wp:post_type[0] // post, attachment
            wp:postmeta [
                {
                    // _thumbnail_id, _wp_attached_file, _wp_attachment_metadata (typed json)
                    wp:metakey[0]
                    wp:metavalue[0]
                }
            ]
            dc:creator[0] // username
            content:encoded[0]
            category {
                _ // displayname
                $ {
                    domain : "category | post_tag"
                    nicename : "slug"
                }
            }
        }, ...
    ] 

    wp:author : [
        {
            wp:author_id[0]
            wp:author_login[0]
            wp:author_email[0]
            wp:author_display_name[0]
        }, ...
    ]

    wp:category : [
        {
            wp:term_id[0]
            wp:category_nicename[0] // slug
            wp:cat_name[0] // display name
            wp:category_parent[0] // if null, empty string at pos 0
        }, ...
    ]
*/

module.exports = function(data, done) {
    done();
};

if (!global.liliumroot) {
    const data = require("../../wpchannel.json");
    global.log = require('../log');
    module.exports(data, () => {
        console.log(data);
        log('TransformWP', 'Done', 'success');
    })
}