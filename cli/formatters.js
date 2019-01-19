// Format list of posts
module.exports.listOfPosts = arr => arr.length == 0 ? "No content found" : `
[LIST OF ${arr.length} POSTS]

${arr.map(post => ` * [${post._id.toString()}] ${post.title[0]}`).join('\n')}`;

// Format single post
module.exports.fullPost = post => `
${post.title[0]}
${post.subtitle[0]}

Identifier : ${post._id}
Status : ${post.status}
Published date : ${post.date ? post.date : "N/A"}
Author : ${post.fullauthor.displayname}
Edition : ${post.alleditions.map(x => x.displayname).join(' / ')}
URL : ${post.url || "N/A"}
Content length : ${post.content[0].length}`;
