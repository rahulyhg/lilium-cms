var _config = {
	"default" : {
		"env" : 'prod',
		"info" : {
			project : "Lilium CMS",
			version : "dev 0.5",
			author : "Erik Desjardins"
		},
		"emails" : {
			default : "DEFAULT_CONTACT_MAIL"
		},
		"data" : {
			engine : "mongodb",
			host : "localhost",
			port : 27017,
			user : "",
			pass : "",
			use : "lilium"
		},
		"paths" : {
			admin : "admin",
			login : "login",
			livevars : "livevars",
			themes : "flowers",
			mail : "mail",
			themesInfo : "info.json",
			plugins : "plugins",
			pluginsInfo: "info.json",
			uploads : "uploads"
		},
		"server" : {
			base : "/Users/samuelrondeaumillaire/mtlblog/lilium-cms/",
			html : "/Users/samuelrondeaumillaire/mtlblog/lilium-cms/html",
			url : "//localhost:8080",
			port : "8080",
			postMaxLength : 1024,
			fileMaxSize : 3000000
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
			},
			"home" : {
				keepInRAM : false
			}
		},
		"stripe" : {
			secretkey : "sk_test_D0gOlWTmUMB1LiCejN5l4ISl",
			publickey : "pk_test_YUr76KLDusQrbpr4G8WzAYcb"
		},
		"sendgrid" : {
			apikey : "YOUR_API_KEY"
		},
		"MIMES" : {
			"" : "text/html",
			".html" : "text/html",
			".htm" : "text/html",
			".css" : "text/css",
			".js" : "text/javascript",
			".png" : "image/png",
			".jpg" : "image/jpeg",
			".jpeg" : "image/jpeg",
			".bmp" : "image/bmp",
			".gif" : "image/gif",
			".swf" : "application/x-shockwave-flash",
			".lml" : "application/x-lilium-markup"
		},
		"supported_pictures" : [
			".jpg",
			".jpeg",
			".bmp",
			".png",
			".gif"
		],
		"website" : {
			"sitetitle" : "A Lilium Website",
			"language" : "en",
			"flower" : "flowerg"
		},
		"login" : {
			"csspath" : "static/admin.css",
			"jspath" : "static/admin.js"
		},
		"admin" : {
			"csspath" : "static/admin.css",
			"jspath" : "static/admin.js"
		},
		"vendor" : {
			"productname" : "Lilium CMS",
			"version" : "0.5 DEV",
			"infourl" : "http://liliumcms.com/info"
		}
	}
};

module.exports = _config;
