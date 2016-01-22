var textParser = function() {
  var endpoints = [];
  var paramString = "?";
  var livevars;

  this.getLiveVars = function(cb) {
    $(".liliumLiveVar").each(function() {
      if (endpoints.indexOf($(this).data('varname')) == -1) {
        endpoints.push($(this).data('varname'));
      }
    });

    for (var livevar in endpoints) {
      paramString += "vars=" + endpoints[livevar] + "&";
    }

    $.get("/livevars" + paramString, function(data) {
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

  };

  this.livevars = function() {
    return livevars;
  }
}
var parser = new textParser();
