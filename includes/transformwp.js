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
const crypto = require('crypto-js');

module.exports = function(config, data, done) {
    console.log(data);
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
            jobtitle : "",
            preferences : [],
            email : e["wp:author_email"][0],
            displayname : e["wp:author_display_name"][0],
            avatarURL : "https://secure.gravatar.com/avatar/" + crypto.MD5(e["wp:author_email"][0]).toString() + "?s=256",
            avatarMini : "https://secure.gravatar.com/avatar/" + crypto.MD5(e["wp:author_email"][0]).toString() + "?s=150",
            socialnetworks : {
                facebook : "", twitter : "", googleplus : "", instagram : ""
            },
            personality : null,
            welcomed : false, 
            slug : e["wp:author_login"][0],
            wpdata : e,
            description : "",
            sites : [config.id],
            firstname : e["wp:author_display_name"][0].split(' ')[0],
            lastname : e["wp:author_display_name"][0].split(' ').splice(1),
            phone : "",
            createdOn : new Date(),
            magiclink : "",
            totalLogin : 0,
            geo : {},
            mustupdatepassword : true,
            revoked : true
        };
    });

    const uploads = data.item.filter(x => x["wp:post_type"] == "attachment").map(a => {
        const smeta = a["wp:postmeta"].find(x => x["wp:meta_key"][0] == "_wp_attachment_metadata");
        const metadata = smeta && smeta["wp:meta_value"] && unserialize(smeta["wp:meta_value"][0]);
        
        const up = {
            _id : new ObjectId(),
            wpid : a["wp:post_id"][0],
            artistname : "",
            artisturl : "",
            name : "Full Size",
            v : 2,
            type : "image"
        };

        if (metadata) {
            const base = config.server.base + "backend/static/u/";
            const sizes = metadata.sizes;
            const uploadrelpath = "backend/static/u/";
            const filename =  metadata.file.split('/').pop();
            const reldirpath = metadata.file.split('/').slice(0, -1).join('/') + "/";

            up.size = {
                width : metadata.width,
                height : metadata.height
            };
            up.fullurl = "u/" + metadata.file;
            up.path = base + uploadrelpath + reldirpath + filename;
            up.artistname = metadata.image_meta.caption;
            up.articleurl = metadata.image_meta.credit;
            up.filename = filename;

            up.sizes = {};
            up.sizes.facebook =  {
                path : base + uploadrelpath + reldirpath + filename,
                url : config.server.url + "/u/" + reldirpath + filename,
                width : metadata.width,
                height : metadata.height
            };

            const large = sizes.large || sizes.medium_large || { file : filename, width : metadata.width, height : metadata.height };
            up.sizes.content = {
                path : base + uploadrelpath + reldirpath + large.file,
                url :  config.server.url + "/u/" + reldirpath + large.file,
                width : large.width,
                height : large.height
            }; up.sizes.thumbnaillarge = up.sizes.content;

            const thumbnail = sizes.thumbnail || { file : filename, width : metadata.width, height : metadata.height };
            up.sizes.thumbnail = {
                path : base + uploadrelpath + reldirpath + thumbnail.file,
                url :  config.server.url + "/u/" + reldirpath + thumbnail.file,
                width : thumbnail.width,
                height : thumbnail.height                
            }; up.sizes.mini = up.sizes.thumbnail;
           
            const medium = sizes.medium || { file : filename, width : metadata.width, height : metadata.height };
            up.sizes.thumbnailarchive = {
                path : base + uploadrelpath + reldirpath + medium.file,
                url :  config.server.url + "/u/" + reldirpath + medium.file,
                width : medium.width,
                height : medium.height   
            }; up.sizes.square = up.sizes.thumbnailarchive;
        }

        return up;
    });

    const styledpages = data.item.filter(x => x["wp:post_type"] == "page").map(p => {
        return {
            _id : new ObjectId(),
            title : p.title[0],
            description : p["excerpt:encoded"] ? p["excerpt:encoded"][0] : "",
            content : p["content:encoded"][0],
            slug : p["wp:post_name"][0],
            status : p["wp:status"][0] == "publish" ? "visible" : "invisible",
            customcss : "",
            customjs : "console.log('Loaded styled page.');",
            magiclink : "215868736849605939257208369611",
            skiplayout : false,
            staticfile : false
        };
    });


    const restofcontent = data.item.filter(x =>
        x["wp:post_type"] != "post" && x["wp:post_type"] != "page" && x["wp:post_type"] != "blog"
    ).map(r => {
        return { ...r, _id : new ObjectId() };
    });

    const parseStatus = function(status) {
        switch (status) {
            case "publish" : return "published";
            case "draft" : return status;
            default : return "destroyed";
        }
    };

    const content = data.item.filter(x => x["wp:post_type"] == "post" || x["wp:post_type"] == "blog" ).map(art => {
        const author = entities.find(x => x.username == art["dc:creator"] && art["dc:creator"][0]);
        const wpmedia = art["wp:postmeta"].find(x => x["wp:meta_key"] == "_thumbnail_id");
        const media = wpmedia && uploads.find(x => x.wpid == wpmedia["wp:meta_value"][0]);
        const topic = art.category && art.category.find(x => x.$ && x.$.domain == "category");
        const fulltopic = topic && topics.find(x => topic.$.nicename == x.slug);

        return {
            _id : new ObjectId(),
            title : art.title,
            subtitle : art["excerpt:encoded"] ? art["excerpt:encoded"][0] : "",
            content : art["content:encoded"],
            author : author && author._id,
            createdBy : author && author._id,
            subscribers : [],
            type : "post",
            shares : 0,
            status : parseStatus(art["wp:status"][0]),
            hidden : false,
            updated : new Date(),
            aliases : [],
            createdOn : new Date(),
            media : media && media._id,
            nsfw : false,
            date : new Date(art["pubDate"] && art["pubDate"][0]),
            isSponsored : false,
            sponsoredCampaignID : "",
            useSponsoredBox : false,
            sponsoredBoxContent : "",
            sponsoredBoxLogo : "",
            sponsoredBoxTitle : "",
            sponsoredBoxURL : "",
            paymentstatus : "paid",
            worth : 20,
            topic : fulltopic && fulltopic._id,
            topicslug : fulltopic && fulltopic.completeSlug,
            topicdisplay : fulltopic && fulltopic.displayname,
            topicfamily : fulltopic ? [
                fulltopic._id
            ] : [],
            lang : "en-ca",
            facebookmedia : media && (config.server.protocol + media.sizes.facebook.url),
            name : art["wp:post_name"] && art["wp:post_name"][0],
            comments : 0,
            facebooklastupdate : new Date()
        };
    });

    done({
        topics, uploads, entities, styledpages, restofcontent, content
    });
};

if (!global.liliumroot) {
    const data = require("../../wpchannel.json");
    global.log = require('../log');
    module.exports({
        server : {
            url : "//localhost:8080",
            base : "/usr/share/lilium/lilium-cms/",
            protocol : "http:",
            html : "/usr/share/lilium/html/default_html"
        }
    }, data, dat => {
        log('TransformWP', 'Done', 'success');
        console.log(dat);
    })
}