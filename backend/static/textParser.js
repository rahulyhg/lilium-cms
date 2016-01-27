var textParser = function() {
  var endpoints = [];
  var paramString = "?";
  var livevars;

  this.getLiveVars = function(cb) {
    var urlParams = window.location.pathname.split( '/' );

    // regex to match {$1}
    var reg = /({\?\s*[0-9]\s*})/g;

    $("lml\\:livevars").each(function() {
      if (endpoints.indexOf($(this).data('varname')) == -1) {
        var params = $(this).data('varparam');

        var variableName = $(this).data('varname');
        // Check for {$1} to extract params from the url
        var urls = variableName.match(reg);
        if (urls !== null) {
          urls.forEach(function(elem) {
            var urlPos = elem.match(/[0-9]/);
            var param = urlParams[urlParams.length - (urlPos)];
            var urlposReg = new RegExp("({\\?\\s*[" + urlPos + "]\\s*})", "g");
            variableName = variableName.replace(urlposReg, param);
          });
          $(this).data('varname', variableName);
        }

        endpoints.push({
	  'varname' : variableName,
          'params' : typeof params === "string" ? JSON.parse(params.replace(/&lmlquote;/g, '"')) : {}
        });
      }
    });
      $.get("/livevars", {vars:JSON.stringify(endpoints)}, function(data) {
        livevars = data;
        return cb(livevars);
      });
  };

  this.parseTextToView = function() {
    $("lml\\:livevars").each(function() {
      if (typeof livevars[$(this).data('varname')] == "object") {
        $(this).text(JSON.stringify(livevars[$(this).data('varname')]));
      } else {
        if ($(this).is('img')) {
          $(this).attr('src', unescape(livevars[$(this).data('varname')]));
        } else {
          $(this).text(unescape(livevars[$(this).data('varname')]));
        }
      }

    });

  };

  this.livevars = function() {
    return livevars;
  }
}
var parser = new textParser();
