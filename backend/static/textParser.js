var textParser = function() {
    this.parseGet = function() {
      console.log('MEDIA MEDIA');
      url = "http://localhost:8080/admin/media/getMedia/569d4e3ea38c12a1184bbb33";
      $.get(url, function(data) {
        console.log(data);
        data.data.each(function(index, element) {
          var target = $('*[data-name="' + index + '"]');
          console.log(element);
          if (target.is('img')) {
            target.attr('src', element);
          } else {
            target.text(element);
          }

        });
      });
    }
  }
var parser = new textParser();
parser.parseGet();
