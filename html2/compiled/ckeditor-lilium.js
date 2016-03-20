var CKEditor = function() {
var picture_id_url = {};
var selectedPicture;
var pictures = [];
this.initEditor = function() {
if (typeof CKEDITOR === 'undefined') {
return;
}
CKEDITOR.basePath = '//liliumdev.com:8080/bower/ckeditor/';
if ($('[ckeditor]').ckeditor) {
$('[ckeditor][data-readonly=true]').ckeditor(function() {
}, {
readOnly: true
})
$('[ckeditor]').ckeditor();
}
CKEDITOR.on('instanceReady', function(ev) {
// Output paragraphs as <p>Text</p>.
this.document.appendStyleSheet('/compiled/admin.css');
});
CKEDITOR.config.entities = false;
CKEDITOR.config.extraPlugins = 'image-finder';
CKEDITOR.config.entities_greek = false;
CKEDITOR.config.entities_latin = false;
// CKEDITOR.config.removeButtons = 'image';
CKEDITOR.config.allowedContent = true;
CKEDITOR.config.contentsCss = '/static/style.css';
CKEDITOR.config.skin = "BootstrapCK4,/bower/BootstrapCK4-Skin/skins/bootstrapck/";
//CKEDITOR plugin to choose picture
CKEDITOR.dialog.add("imagebrowserDialog", function(editor) {
return {
title: "Add an image to the article",
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
}, {
id: "tab-step2",
label: "Upload an image",
elements: [{
type: "html",
html: '<div id="image-upload"></div>'
}]
}],
onShow: function() {
dialog = this;
// Bypass the bug where tabs are disabled if they only contain html
$('.cke_dialog_tabs > a').removeClass('cke_dialog_tab_disabled');
// Check if pictures are loaded first
if (pictures.length == 0) {
//Load pictures
$.get("/livevars", {
vars: JSON.stringify([{
varname: "media",
"params": {}
}])
}, function(data) {
pictures = data.livevars.media;
if (pictures) {
pictures.forEach(function(picture, index) {
picture_id_url[picture._id] = picture.url;
$('#picture-list').append('<img id="' + picture._id + '" src="' + picture.sizes.thumbnail.url + '">');
});
}
});
}
$('#image-upload').html('<h1>Upload a media</h1><form class="v_form_validate lmlform " name="media_create"id="media_create" method="POST" enctype="multipart/form-data" /><label for="File">File</label><input type="file" name="File"  required class="v_validate " /><input type="hidden" name="form_name" value="media_create" class="v_validate "  /><input type="submit"  value="publish" class="v_validate  lml-button" /></form><div class="bar"><div class="progress"><div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;"></div></div></div>');
watchForSubmition();
},
onOk: function() {
if (typeof selectedPicture !== 'undefined') {
var id = $(selectedPicture).attr('id');
var img = editor.document.createElement('img');
img.setAttribute('src', '/uploads/' + picture_id_url[id]);
img.setStyle('width', '300px');
editor.insertElement(img);
}
}
}
})
CKEDITOR.plugins.add("image-finder", {
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
}
/**
* Image upload
*/
var watchForSubmition = function () {
$('#image-upload > input[type="submit"]').on('click', function(e) {
if (typeof selectedPicture !== 'undefined') {
$(selectedPicture).removeClass('selectedPicture');
selectedPicture = undefined;
}
var bar = $('.progress .progress-bar');
bar.removeClass('progress-bar-danger');
bar.removeClass('progress-bar-success');
e.preventDefault();
$('.progress').show();
var fileInput = $('#image-upload > input:File')[0];
var file = fileInput.files[0];
var form_name =  $("#image-upload > input[name='form_name']").val();
var formData = new FormData();
formData.append($(fileInput).attr('name'), file);
formData.append('form_name', form_name);
var req = new XMLHttpRequest();
req.open('post', '//liliumdev.com:8080/admin/media/upload', true);
req.upload.onprogress = function(e) {
if (e.lengthComputable) {
var uploadPerc = (e.loaded / e.total) * 100 > 40 ? 40 :(e.loaded / e.total) * 100 ;
bar.css('width', uploadPerc + '%');
if (uploadPerc >= 40) {
bar.text('Resizing pictures...');
} else {
bar.text('Uploading...');
}
}
};
req.onerror = function(e) {
console.log(e);
};
req.onload = function(e) {
var res = JSON.parse(e.target.response);
if (res.success) {
bar.css('width', '100%');
bar.addClass('progress-bar-success');
bar.text('Upload Success!');
liliumcms.notify({message: 'Upload Success', type: 'success', title: 'Media'});
// Insert uploaded picture
picture_id_url[res.picture._id] = res.picture.url;
$('#picture-list').append('<img id="' + res.picture._id + '" src="' + res.picture.sizes.thumbnail.url + '">');
} else {
bar.addClass('progress-bar-danger');
liliumcms.notify({message: 'There was a problem uploading your media', type: 'danger', title: 'Media'})
}
};
req.send(formData);
})
};
};
