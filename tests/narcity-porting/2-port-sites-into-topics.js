const sites = require('./output/wp_blogs_0000.json');
const readSplitJSON = require("./lib/readsplitjson.js");

const fgc = () => {
    global.gc && global.gc();
}

let skip = true;
let startat = process.argv[2];
startat = isNaN(startat) ? 1 : parseInt(startat);
if (startat == 1) {
    skip = false;
}

const allUploads = [];

const handleSite = (site, id, done) => {
    if (id == startat) skip = false;
    if (skip) return done();
    readSplitJSON("wp_" + id + "_options").then((siteConfigArray) => {
        let siteConfig = {};
        let context = {}

        console.log("WORKING WITH SITE " + id);
        siteConfigArray.forEach((conf) => {
            if (conf.option_name && conf.option_name.charAt(0) != "_") {
                siteConfig[conf.option_name] = conf.option_value;
            }
        });

        context.slug = site.path.slice(1, -1);
        context.topic = {
            slug : context.slug,
            description : siteConfig.blogname,
            language : siteConfig.lang_code,
            shortcode : siteConfig.city_code,
            cityabbr : siteConfig.city_short_name,
            analyticsID : siteConfig.google_analytics_child_tag,
            displayname : siteConfig.city_name,
            country : siteConfig.country,
            social : {
                facebook : siteConfig.facebook_name,
                facebookapp : siteConfig.facebook_app_id,
                facebooktoken : siteConfig.facebook_app_token,
                instagram : siteConfig.instagram_name,
                youtube : siteConfig.youtube_name,
                googleplus : siteConfig.googleplus_name,
                twitter : siteConfig.twitter_name
            },
            wordpress_configs_json_string : JSON.stringify(siteConfig)
        };

        let postfile = "wp_"+id+"_posts";
        let postmetafile = "wp_"+id+"_postmeta";
        let taxfile = "wp_" + id + "_term_taxonomy";
        let termfile = "wp_" + id + "_terms";
        let termrelfile = "wp_" + id + "_term_relationships";

        readSplitJSON(postfile).then((postarr) => {
            console.log("Got " + postarr.length + " posts from JSON files");
            readSplitJSON(postmetafile).then((metaarr) => {
                console.log("Got " + metaarr.length + " metas from JSON files");

                context.metas = {};
                postarr.forEach((p) => {
                    context.metas[p.ID] = {};
                    p.data = context.metas[p.ID];
                    p.status = p.status == "publish" ? "published" : p.status;
                    p.data.wp_id = p.ID;
                    p.data.wp_author = p.post_author;
                });

                metaarr.forEach((m) => {
                    if ((m.meta_key == "_thumbnail_id" || m.meta_key.charAt(0) != "_") && context.metas[m.post_id]) {
                        context.metas[m.post_id][m.meta_key] = m.meta_value;
                    }
                });

                context.newPosts = [];
                context.postAssoc = {};
                postarr.forEach((p) => {
                    if (p.post_type == "post") {
                        let postobj = {
                            title : p.post_title,
                            subtitle : p.data.subtitle,
                            status : p.post_status,
                            name : p.post_name,
                            date : new Date(p.post_date),
                            content : p.post_content,
                            data : p.data,
                            tags : [],
                            wp_author : p.post_author,
                            wp_category : -1
                        }

                        if (postobj.status == "publish") {
                            postobj.status = "published";
                        }

                        if (postobj.status != "inherit" && (p.post_type == "post" || p.post_type == "quiz")) {
                            context.newPosts.push(postobj);
                        }

                        context.postAssoc[p.ID] = postobj;
                    } else if (p.post_type == "attachment") {
                        allUploads.push({
                            url : p.guid,
                            fullfilename : p.guid.split('/').pop(),
                            inpost : p.post_parent,
                            filename : p.post_name,
                            wpid : p.ID
                        });
                    }
                });

                readSplitJSON(taxfile).then((taxo) => {
                    readSplitJSON(termfile).then((terms) => {
                        readSplitJSON(termrelfile).then((termsrel) => {
                            context.taxonomies = {};

                            // Contains the type of taxo, and id
                            taxo.forEach((t) => {
                                context.taxonomies[t.term_taxonomy_id] = t;
                            });

                            // Contains name and slug
                            context.terms = {};
                            terms.forEach((t) => {
                                context.terms[t.term_id] = t;
                            });
                            
                            context.catObjects = {};
                            termsrel.forEach(rel => {
                                let post = context.postAssoc[rel.object_id];

                                if (post) {
                                    let tax = context.taxonomies[rel.term_taxonomy_id];
                                    if (tax.taxonomy == "category") {
                                        post.wp_category = context.terms[tax.term_id];
                                        context.catObjects[tax.term_id] = post.wp_category;
                                    } else if (tax.taxonomy == "post_tag") {
                                        post.tags.push(context.terms[tax.term_id].name);
                                    }   
                                }
                            });

                            context.output = JSON.stringify({
                                posts : context.newPosts,
                                topic : context.topic,
                                categories : context.catObjects
                            });

                            console.log("Writing topic file for site : " + context.slug);
                            require('fs').createWriteStream('./topics/' + context.slug + ".json", {encoding : "utf8", flag : "w+"}).end(context.output, 'utf8', () => {
                                // Cleanup
                                console.log("Cleaning up...");
                                postarr = undefined;
                                metaarr = undefined;
                                taxo = undefined;
                                terms = undefined;

                                for (let k in context) {
                                    delete context[k];
                                }

                                fgc();
                                
                                // Next
                                done();
                            });
                        });
                    });
                });
            });
        });
    });
}

const handleUploads = () => {
    console.log("Dumping " + allUploads.length + " upload file data");
    require('fs').createWriteStream('./output/uploads.json', {encoding : "utf8", flag : "w+"}).end(JSON.stringify(allUploads), 'utf8', () => {
        console.log("All done.");
    });
};

let siteIndex = 0;
const CONTEXT = {};
const nextSite = () => {
    let site = sites[siteIndex];
    if (site && site.path && site.path !== "/") {
        handleSite(site, site.blog_id, () => {
            siteIndex++;
            setTimeout(nextSite.bind(CONTEXT), 1);
        });
    } else if (site) {
        siteIndex++;
        nextSite();
    } else {
        console.log("Done creating sites.");
        handleUploads();
    }
};

nextSite();
