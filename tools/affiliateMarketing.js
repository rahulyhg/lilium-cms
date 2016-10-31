var request = require('request')
var merchantEndpoint = "http://api-merchants.skimlinks.com/merchants/json/"
var publicKey = '00dd352a9960911e89493d7d0b653874'
var privateKey = '8317340bd952199632f66269b328e0c4'

function searchMerchants(query, start, limit, cb){
	if (start){
		var startResult = "/start/"+ start
	} else {
		var startResult = "/start/" + "0"
	}
	if (limit){
		var displayLimit = "/limit/"+limit
	} else {
		var displayLimit = ""
	}

	var encodedQuery = encodeURI(query)
	request.get(merchantEndpoint + publicKey + "/search/"+encodedQuery + displayLimit + startResult, function (error, response, body) {
     if (!error && response.statusCode == 200) {
        cb(JSON.parse(body, undefined, 2))
      }
  });
};

// 
function listMerchantCategories(){
	request.get(merchantEndpoint + publicKey + "/categories", function (error, response, body) {
     if (!error && response.statusCode == 200) {
        cb(JSON.parse(body, undefined, 2))
      }
  });
};

// USE with listMerchantCategories() to get categoryCode
function merchantsByCategory(categoryCode, start, limit, cb){
	if (start){
		var startResult = "/start/"+ start
	} else {
		var startResult = "/start/" + "0"
	}
	if (limit){
		var displayLimit = "/limit/"+limit
	} else {
		var displayLimit = ""
	}

	request.get(merchantEndpoint+key +"/category/"+ categoryCode + displayLimit + startResult, function (error, response, body) {
     if (!error && response.statusCode == 200) {
        cb(JSON.parse(body, undefined, 2))
      }
  });
};

