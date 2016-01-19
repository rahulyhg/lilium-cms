var textParser = function() {
    this.parseTextToView = function(data) {
        for (key in data) {
          console.log(key);

          var target = $('*[data-name="' + key + '"]');
      
          target.each(function() {
            if ($(this).is('img')) {
              $(this).attr('src', data[key]);
            } else {
              $(this).text(data[key]);
            }
          });

        }

    }
  }
var parser = new textParser();
