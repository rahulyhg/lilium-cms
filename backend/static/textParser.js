var textParser = function() {
  var endpoints = [];
  var paramString = "?";
  var livevars;

  this.getLiveVars = function(cb) {
    $("lml\\:livevars").each(function() {
      if (endpoints.indexOf($(this).data('varname')) == -1) {
        var params = $(this).data('varparam');
        endpoints.push({
	  'varname' : $(this).data('varname'),
          'params' : typeof params === "string" ? JSON.parse(params.replace(/&lmlquote;/g, '"')) : {}
        });
      }
    });
    console.log({vars:JSON.stringify(endpoints)});
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
