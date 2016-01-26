var pictures = [];
var picture_id_url = {};
var selectedPicture;

$('[ckeditor]').ckeditor();
CKEDITOR.on('instanceReady', function(ev) {
  this.document.appendStyleSheet( '/static/style.css' );
  ev.editor.dataProcessor.writer.setRules('p', {
    indent: true,
    breakBeforeOpen: true,
    breakAfterOpen: false,
    breakBeforeClose: false,
    breakAfterClose: false
  });
});
CKEDITOR.config.entities = false;
CKEDITOR.config.extraPlugins = 'image-explorer';
CKEDITOR.config.basicEntities = false;
CKEDITOR.config.entities_greek = false;
CKEDITOR.config.entities_latin = false;
CKEDITOR.config.removeButtons = 'Image';

//CKEDITOR plugin to choose picture
CKEDITOR.dialog.add("imagebrowserDialog", function(editor) {
  return {
    title: "Select an image",
    minWidth: 800,
    minHeight: 400,
    maxWidth: 800,
    maxHeight: 400,
    contents: [{
      id: "tab-step1",
      label: "Browse for images",
      elements: [{
        type: "html",
        html: '<div id="picture-list"></div>'
      }]
    }],
    onShow: function() {
      dialog = this;
      // Check if pictures are loaded first
      if (pictures.length == 0) {
        //Load pictures
        $.get("/livevars",{vars: JSON.stringify([{varname:"media", "params" : {}}])}, function(data) {
          pictures = data.media;
          pictures.forEach(function(picture, index) {
            picture_id_url[picture._id] = picture.url;

            $('#picture-list').append('<img id="'+ picture._id +'" src="'+ picture.sizes.thumbnail.url +'">');
          });
        });
      }

    },
    onOk: function() {
      if (typeof selectedPicture !== 'undefined') {
        var id = $(selectedPicture).attr('id');
        var img = editor.document.createElement( 'img' );
        img.setAttribute( 'src',  picture_id_url[id]);
        img.setStyle('width', '300px');
        editor.insertElement( img );
      }

    }
  }
})
CKEDITOR.plugins.add("image-explorer", {
  init: function(editor) {
    editor.addCommand('imagebrowser', new CKEDITOR.dialogCommand('imagebrowserDialog'));
    editor.ui.addButton('imgbrowser', {
      label: 'Insert Image',
      command: 'imagebrowser',
      toolbar: 'insert'
    });
  }
});

$('body').on('click', '#picture-list img', function(event) {
  var elem = event.target;
  if (typeof selectedPicture !== 'undefined') {
    $(selectedPicture).removeClass('selectedPicture');
  }

  selectedPicture = elem;
  $(selectedPicture).addClass('selectedPicture');

});
