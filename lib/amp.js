const db = require('./db.js');
const articleLib = require('./content');
const filelogic = require('../pipeline/filelogic');
const hooks = require('../lib/hooks');
const themes = require('./themes.js');
const fs = require('fs');
const pathlib = require('path');
const asyncnoop = require('../lib/asyncnoop');
const crypto = require('crypto');
const request = require('request');

const JSDOM = require('jsdom'); 

const AMP_CACHES = [
    "cdn.ampproject.org", "amp.cloudflare.com", "bing-amp.com"
]

let ampkeycache;
class Amp {
    clearAmpCache(_c, article) {
        log('AMP', 'About to clear AMP cache for an article with slug : ' + article.name, 'info');
        const signer = crypto.createSign('RSA-SHA256');

        fs.unlink(pathlib.join(_c.server.html, 'amp', article.name + ".html"), err => {
            asyncnoop(!ampkeycache, done => {
                log('AMP', 'Reading AMP private key from keys directory', 'info');
                fs.readFile(pathlib.join(liliumroot, '..', 'keys', 'amp-priv-key.pem'), {}, (err, privatekey) => {
                    ampkeycache = privatekey;
                    done();
                });
            }, () => {
                if (ampkeycache) {
                    log('AMP', 'Generating signed request to create an update-cache URL', 'info');
                    const basepath = "/update-cache/c/s/" + _c.server.url.substring(2) + "/amp/" + article.name + "?amp_action=flush&amp_ts=" + Math.ceil(Date.now() / 1000).toString()
                    signer.update(basepath);
                    const signature = signer.sign(ampkeycache, 'base64');

                    const reqpath = basepath + "&amp_url_signature=" + signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '');

                    AMP_CACHES.forEach(updateCacheApiDomainSuffix => {
                        request(_c.server.protocol + _c.server.url.replace(/\./g, '-') + "." + updateCacheApiDomainSuffix + reqpath, (err, resp, txt) => {
                            if (resp && resp.statusCode) {
                                log('AMP', 'Cache invalidation response from ' + updateCacheApiDomainSuffix + " : " + resp.statusCode, resp.statusCode == 200 ? 'success' : "warn");
                            } else {
                                log('AMP', 'Received error from AMP cache invalidation', 'warn');
                                console.log(err || txt);
                            }
                        })
                    });
                } else {
                    log('AMP', 'Missing amp private key', 'warn');
                }
            });
        });
    }

    handleArticle(cli, article) {
        // Article is undefined if nothing was found
        if (!article || !article.fullauthor || !article.alleditions || !article.deepmedia) {
            return cli.throwHTTP(404, undefined, true);
        }

        try {
            let articleContent = article.content.shift();

            article.content.forEach((page, index) => {
                if (article.title[index+1].indexOf(article.title[0]) == -1) {
                    articleContent += `<h3 class="page-sep">${article.title[index+1]}</h3>`
                }

                if (article.subtitle[index+1].indexOf(article.subtitle[0]) == -1) {
                    articleContent += `<h4 class="page-sep-sub">${article.subtitle[index+1]}</h4>`
                }

                articleContent += page;
            });

            article.title = article.title[0];
            article.subtitle = article.subtitle[0];

            log('AMP', 'Preparing for parsing content');
            /* Modify content according to AMP guidelines */

            // Featured image
            if (!article.deepmedia) {
                article.deepmedia = [{sizes : {facebook : {url : ""}}}];
            } else if (!article.deepmedia.sizes.facebook) {
                article.deepmedia.sizes.facebook = article.deepmedia.sizes.content;
            }

            // Avatar URL
            if (!article.fullauthor.avatarURL) {
                article.fullauthor.avatarURL = cli._c.server.protocol + cli._c.website.url + "/static/media/lmllogo.png";
            }
            
            this.parseAMPContent(cli, article, articleContent, (err, amp, embedsPresent) => {
                if (err) {
                    return cli.throwHTTP(500, undefined, true);
                }

                article.content = amp;

                let language = article.language || "en"; 

                log('AMP', "Generating AMP page from LML for article : " + article.title, 'info');
                filelogic.renderThemeLML3(cli, 'amp', 'amp/' + article.name + '.html', {
                    config : cli._c,
                    article, language, embedsPresent 
                }, filecontent => {
                    log("AMP", "Generated AMP page for article : " + article.title);
                    cli.response.writeHead(200);
                    cli.response.end(filecontent);

                    const filepath = cli._c.server.html + "/amp/" + article.name + ".html";
                    filelogic.dumpToFile(filepath, filecontent, () => {
                        hooks.fireSite(cli._c, "ampGenerated", { article, filepath });
                        log("AMP", "Cached file written");
                    }, 'utf8');
                }, true);
            });
        } catch (ex) {
            cli.crash(ex);
        }
    };

    parseSingleEmbed(presentEmbeds, doc, embed) {
        const type = embed.dataset.embedtype;
        const embeddata = JSON.parse(embed.dataset.embedjson);
        const ogurl = embeddata.originalurl;

        switch (type) {
            case "igcarousel":
            case "igvideo":
            case "instagram": {
                const pat = ogurl.indexOf('/p/');
                const indexOfEndSlash = ogurl.indexOf('/', pat + 4);
                const shortcode = ogurl.substring(pat + 3, indexOfEndSlash == -1 ? undefined : indexOfEndSlash);
                const tag = doc.createElement('amp-instagram');

                tag.dataset.shortcode = shortcode;
                tag.setAttribute('width', 1);
                tag.setAttribute('height', 1);
                tag.setAttribute('layout', 'responsive');

                embed.parentElement.insertBefore(tag, embed);
                presentEmbeds.instagram = true;
            } break;

            case "reddit": {
                const tag = doc.createElement('amp-reddit');

                tag.dataset.embedtype = "post";
                tag.dataset.src = ogurl;

                tag.setAttribute('width', 1);
                tag.setAttribute('height', 1);
                tag.setAttribute('layout', 'responsive');

                embed.parentElement.insertBefore(tag, embed);
                presentEmbeds.reddit = true;
            } break;

            case "twitter": {
                const tag = doc.createElement('amp-twitter');

                tag.dataset.tweetid = ogurl.toString().split("/").pop().split('?')[0];
                tag.setAttribute('width', 1);
                tag.setAttribute('height', 1);
                tag.setAttribute('layout', 'responsive');

                embed.parentElement.insertBefore(tag, embed);
                presentEmbeds.twitter = true;
            } break;

            case "soundcloud": {
                // Not supported yet
            } break;

            case "fbvideo":
            case "fbpost": {
                const tag = doc.createElement('amp-facebook');

                tag.dataset.href = ogurl;
                tag.setAttribute('width', 1);
                tag.setAttribute('height', 1);
                tag.setAttribute('layout', 'responsive');

                embed.parentElement.insertBefore(tag, embed);
                presentEmbeds.facebook = true;
            } break;
        }

        embed.remove();
    }

    parseUploads(_c, dom, done) {
        const uploadtags = dom.window.document.querySelectorAll('.lml-placeholder.upload');

        db.findToArray(_c, 'uploads', { _id : { $in : Array.from(uploadtags).map(x => db.mongoID(x.dataset.id)) } }, (err, uploads) => {
            for (let i = uploadtags.length - 1; i >= 0; i--) {
                const curtag = uploadtags[i];
                const upload = uploads.find(x => x._id.toString() == curtag.dataset.id);

                if (upload) {
                    const ampimg = dom.window.document.createElement("amp-img");
                    ampimg.setAttribute('width', upload.size.width);
                    ampimg.setAttribute('height', upload.size.height);
                    ampimg.setAttribute('layout', "responsive");
                    ampimg.setAttribute('src', _c.server.protocol + _c.server.url + "/" + upload.fullurl);

                    const credit = dom.window.document.createElement('a');
                    credit.href = upload.artisturl;
                    credit.textContent = upload.artistname;

                    const wrap = dom.window.document.createElement('div');
                    wrap.appendChild(ampimg);
                    wrap.appendChild(credit);

                    curtag.parentElement.insertBefore(wrap, curtag);
                }

                curtag.remove();
            }

            done();
        });
    }

    parseAMPContent(cli, article, articleContent, cb) {
        const dom = new JSDOM.JSDOM('<html><head></head><body>' + articleContent + '</body></html>');        
        const images = dom.window.document.querySelectorAll('img');
        const doc = dom.window.document;
        const embedsPresent = {};

        for (let i = images.length - 1; i >= 0; i--) {
            const x = images[i];
            const ampimg = dom.window.document.createElement("amp-img");

            if (x.classList.contains("lml-instagram-avatar-3")) {
                ampimg.setAttribute('width', 24);
                ampimg.setAttribute('height', 24);
                ampimg.setAttribute('layout', "fixed");
                ampimg.setAttribute('src', cli._c, cli._c.server.protocol + cli._c.server.url + "/instagram?u=" + x.src);

                x.parentElement.insertBefore(ampimg, x);
                x.remove();

                continue;
            } else if (x.src && x.src.includes("instagram")) {
                ampimg.setAttribute('src', cli._c.server.protocol + cli._c.server.url + "/instagram?u=" + x.src);
            } else if (x.src && (x.src.includes('uploads') || x.src.includes("/u/"))) { 
                let source = x.src;
                if (source.startsWith('//')) {
                    source = cli._c.server.protocol + source;
                }

                ampimg.setAttribute('src', source);
            } else if (x.src && x.src.startsWith('http:')) {
                ampimg.setAttribute('src', "https" + x.src.substring(4));
            }

            ampimg.setAttribute('width', x.dataset.width || 640);
            ampimg.setAttribute('height', x.dataset.height || 640);
            ampimg.setAttribute('layout', "responsive");
            ampimg.getAttribute('src') && x.parentElement.insertBefore(ampimg, x);

            x.remove();
        }

        // Native Instagram embeds
        const nativeIGs = doc.querySelectorAll('.instagram-media');
        for (let i = nativeIGs.length - 1; i >= 0; i--) {
            const embed = nativeIGs[i];
            const tag = doc.createElement('amp-instagram');

            const ogurl = embed.dataset["instgrm-permalink"] || embed.dataset.instgrmPermalink;
            if (ogurl) {
                const pat = ogurl.indexOf('/p/');

                if (pat != -1) {
                    const shortcode = ogurl.substring(pat + 3, ogurl.indexOf('/', pat + 4));

                    tag.dataset.shortcode = shortcode;
                    tag.setAttribute('width', 1);
                    tag.setAttribute('height', 1);
                    tag.setAttribute('layout', 'responsive');

                    embed.parentElement.insertBefore(tag, embed);
                }
            }

            embed.remove();
        }

        // V4 embeds
        const v4embeds = doc.querySelectorAll('.embed');
        for (let i = v4embeds.length - 1; i >= 0; i--) {
            this.parseSingleEmbed(embedsPresent, doc, v4embeds[i]);
        }

        // Scripts, unsupported tags, Lilium-specific tags
        const scripts = dom.window.document.querySelectorAll('script, ad, lml-related, lml-ad');
        for (let i = scripts.length - 1; i >= 0; i--) {
            scripts[i].remove();
        }

        const videos = dom.window.document.querySelectorAll('.ck-embed-video, iframe');
        for (let i = videos.length - 1; i >= 0; i--) {
            const x = videos[i];
            if (x.src && x.src.includes('youtube.com')) {
                let vid = x.src.substring(x.src.indexOf('/embed/') + 7);
                if (vid.includes('/')) { vid = vid.substring(0, vid.indexOf('/')); }
                if (vid.includes('?')) { vid = vid.substring(0, vid.indexOf('?')); }
                if (vid.includes('&')) { vid = vid.substring(0, vid.indexOf('&')); }

                const youtube = dom.window.document.createElement('amp-youtube');
                youtube.setAttribute('data-videoid', vid);
                youtube.setAttribute('width', '640');
                youtube.setAttribute('height', '480');
                youtube.setAttribute('layout', 'responsive');

                try {
                    x.parentElement.insertBefore(youtube, x);
                    x.remove();
                } catch (ex) { log('AMP', 'Could not remove iframe : ' + ex.stack || ex, 'warn');}
                embedsPresent.youtube = true;
            }
        }

        const styledspans = dom.window.document.querySelectorAll('span');
        for (let i = styledspans.length - 1; i >= 0; i--) {
            let nodeName;
            const styles = styledspans[i].style;

            if (styles.fontWeight == "bold" || styles.fontWeight >= 600) {
                nodeName = "strong";
            } else if (styles.fontStyle == "italic") {
                nodeName = "em"
            }

            if (nodeName) {
                const node = dom.window.document.createElement(nodeName);
                while (styledspans[i].firstChild) {
                    node.appendChild(styledspans[i].firstChild);
                }

                styledspans[i].parentElement.insertBefore(node, styledspans[i]);
                styledspans[i].remove();
            }
        }

        const fabig = dom.window.document.querySelectorAll('.fab.fa-instagram');
        for (let i = fabig.length - 1; i >= 0; i--) {
            fabig[i].className = "fa fa-instagram";
        }

        const tweetblocks = dom.window.document.querySelectorAll('.twitter-tweet');
        for (let i = tweetblocks.length - 1; i >= 0; i--) {
            let id;
            let maybea = tweetblocks[i].lastElementChild;
            if (maybea && maybea.nodeName == "A") {
                id = maybea.href && maybea.href.toString().split("/").pop().split('?')[0]
            }

            if (id) {
                const amptweet = dom.window.document.createElement('amp-twitter');
                amptweet.setAttribute('width', '375')
                amptweet.setAttribute('height', '472')
                amptweet.setAttribute('layout', 'responsive')
                amptweet.dataset.tweetid = id;

                tweetblocks[i].parentElement.insertBefore(amptweet, tweetblocks[i]);
                amptweet.appendChild(tweetblocks[i]);
                tweetblocks[i].removeAttribute('class');
                tweetblocks[i].setAttribute('placeholder', "");

                embedsPresent.twitter = true;
            }
        }

        // Slow
        const styled = dom.window.document.querySelectorAll("[style]");
        for (let i = styled.length - 1; i >= 0; i--) { styled[i].removeAttribute('style'); }

        const mousedown = dom.window.document.querySelectorAll("[onmousedown]");
        for (let i = mousedown.length - 1; i >= 0; i--) { mousedown[i].removeAttribute('onmousedown'); }

        const clicked = dom.window.document.querySelectorAll("[onclick]");
        for (let i = clicked.length - 1; i >= 0; i--) { clicked[i].removeAttribute('onclick'); }

        const parags = dom.window.document.querySelectorAll('[contenteditable]');
        for (let i = parags.length - 1; i >= 0; i--) { parags[i].removeAttribute('contenteditable'); }

        const iframes = dom.window.document.querySelectorAll('iframe');
        for (let i = iframes.length - 1; i >= 0; i--) { 
            const iframe = iframes[i];
            const ampframe = dom.window.document.createElement('amp-iframe');
            ampframe.setAttribute('width', !iframe.width || isNaN(iframe.width) ? "340" : iframe.width);
            ampframe.setAttribute('height', !iframe.height || isNaN(iframe.height) ? "340" : iframe.height);
            ampframe.setAttribute('src', iframe.src);
            ampframe.setAttribute('layout', "responsive");
            ampframe.setAttribute('frameborder', 0);
            ampframe.setAttribute('sandbox', "allow-script");

            iframe.parentElement.insertBefore(ampframe, iframe);
            iframe.remove();
            embedsPresent.iframe = true;
        }

        const links = dom.window.document.querySelectorAll('a');
        for (let i = links.length - 1; i >= 0; i--) {
            Array.prototype.forEach.call(links[i].attributes, attr => {
                if (attr != "href") {
                    links[i].removeAttribute(attr);
                }
            });
        }

        this.parseUploads(cli._c, dom, () => {
            themes.fetchCurrentTheme(cli._c, cTheme => {
                let language = cli._c.website.language;
                if (article.topic && article.topic.override && article.topic.override.language) {
                    language = article.topic.override.language;
                }
                let lang = language.split('-')[0];

                db.findUnique(cli._c, 'ads', { type : "amp", lang }, (err, adset) => {
                    const ads = adset && adset.ads;
                    hooks.fireSite(cli._c, "amp_replace_ads", { article, embedsPresent, dom : dom, theme : cTheme, lang, ads });
                    articleContent = dom.window.document.body.innerHTML.replace(/style=/g, "amp-style=");

                    cb(undefined, articleContent, embedsPresent);
                });
            });
        });
    }
}
module.exports = new Amp();
