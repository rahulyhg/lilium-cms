module.exports = {
	"default" : {
		"info" : {
			project : "Lilium CMS",
			version : "dev 0.1",
			author : "Erik Desjardins"
		},
		"data" : {
			engine : "mongo",
			host : "localhost",
			port : "default",
			user : "lilium",
			pass : ""
		},
		"paths" : {
			admin : "admin",
			login : "login"
		},
		"server" : {
			base : "/usr/share/ryk/",
			html : "/usr/share/ryk/html",
			url : "http://localhost:8080",
			port : "8080",
			postMaxLength : 1024
		},
		"signature" : {
			publichash : "300da60969c40d4491da8cb9341b9bce9aa29da88d457de8aa3ce24576bd899e", // Lilium
			privatehash : "8067de5b0c3efd797325110ce7110f216f66a4df1d7759aa4d2fd9d2a52e4580" // JM
		},
		"beta" : {
			test : true,
			text : "Hello, World!"
		},
		"usability" : {
			"admin" : {
				loginIfNotAuth : true
			}
		},
		"website" : {
			"sitetitle" : "A Lilium Website",
			"language" : "en",
			"flower" : "garden"
		},
		"login" : {
			"csspath" : "",
			"jspath" : ""
		},
		"vendor" : {
			"productname" : "Lilium CMS",
			"version" : "0.1 DEV"
		}
	}
};
