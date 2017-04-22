const readSplitJSON = require("./lib/readsplitjson.js");

readSplitJSON("wp_users").then(users => {
    readSplitJSON("wp_usermeta").then(metas => {
        let usersAssoc = {};
        
        users.forEach(u => {
            usersAssoc[u.ID] = u;
            u.data = {};
        });

        metas.forEach(m => {
            if (usersAssoc[m.user_id] && m.meta_key.charAt(0) != "_") {
                usersAssoc[m.user_id].data[m.meta_key] = m.meta_value;

                if (m.meta_key == "description" && !m.meta_value && m.user_id != 9317477) {
                    usersAssoc[m.user_id].ignore = true;
                }
            }
        });

        const filtered = users.filter(u => {return !u.ignore;});
        let finalUsers = [];

        filtered.forEach(u => {
            finalUsers.push({
                wp_object : u,
                username : u.user_login,
                email : u.user_email,
                createdOn : new Date(u.user_registered),
                displayname : u.display_name,
                firstname : u.data.first_name,
                lastname : u.data.last_name,
                description : u.data.description,
                sites : ["www.narcity.com"],
                avatarURL : "http://0.gravatar.com/avatar/" + require('crypto').createHash('md5').update(u.user_email).digest("hex")
            });
        });
        console.log("Writing " + finalUsers.length + " entities to JSON file");
        require('fs').createWriteStream('./entities/entities.json', {encoding : "utf8", flag : "w+"}).end(JSON.stringify(finalUsers));
    });
});
