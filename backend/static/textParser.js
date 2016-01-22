var textParser = function() {
  var endpoints = [];
  var paramString = "?";
  var livevars;

  this.getLiveVars = function(cb) {
    $(".liliumLiveVar").each(function() {
      if (endpoints.indexOf($(this).data('varname')) == -1) {
        var params = $(this).data('varparam');
        endpoints.push({
	  'varname' : $(this).data('varname'),
          'params' : typeof params === "string" ? JSON.parse(params.replace(/&lmlquote;/g, '"')) : {}
        });
      }
    });

    $.get("/livevars", {vars:JSON.stringify(endpoints)}, function(data) {
      livevars = data;
      return cb();
    });
  };

  this.parseTextToView = function() {
    $(".liliumLiveVar").each(function() {
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

  }
}
var parser = new textParser();
