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
                _ // displaynames8s8
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

    Creation order
        - Topics
        - Entities
        - Uploads
        - Posts
*/

const { ObjectId } = require('mongodb');
const { unserialize } = require("php-serialization");
const mkdirp = require('mkdirp').sync;

module.exports = function(config, data, done) {
    const topics = data["wp:category"].map(c => {
        return {
            _id : new ObjectId(),
            wpid : c["wp:term_id"][0],
            completeSlug : c["wp:category_nicename"][0],
            slug : c["wp:category_nicename"][0],
            displayname : c["wp:cat_name"][0],
            wpparent : c["wp:category_parent"][0]
        };
    });

    const entities = data["wp:author"].map(e => {
        return {
            _id : new ObjectId(),
            wpid : e["wp:author_id"][0],
            username : e["wp:author_login"][0],
            email : e["wp:author_email"][0],
            displayname : e["wp:author_display_name"][0]
        };
    });

    const uploads = data.item.filter(x => x["wp:post_type"] == "attachment").map(a => {
        const smeta = a["wp:postmeta"].find(x => x["wp:meta_key"][0] == "_wp_attachment_metadata");
        const metadata = smeta && smeta["wp:meta_value"] && unserialize(smeta["wp:meta_value"][0]);
        
        const up = {
            _id : new ObjectId(),
            artistname : "",
            artisturl : "",
            name : "Full Size",
            v : 2,
            type : "image"
        };

        if (metadata) {
            up.size = {
                width : metadata.width,
                height : metadata.height
            };
            up.fullurl = "u/" + metadata.file;
            up.artistname = metadata.image_meta.caption;
            up.articleurl = metadata.image_meta.credit;
            up.filename = metadata.file.split('/').pop();
            up.sizes = {

            };
        }

        return up;
    });

    console.log(uploads);

    done();
};

if (!global.liliumroot) {
    const data = require("../../wpchannel.json");
    global.log = require('../log');
    module.exports({
        server : {
            url : "localhost:8080",
            html : "/usr/share/lilium/html/default_html"
        }
    }, data, () => {
        log('TransformWP', 'Done', 'success');
    })
}