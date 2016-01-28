// Lilium Frontend core framework
// Requires vaniryk
var LiliumCMS = function() {
	var LiveVars = function() {
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

		var generateTemplateFromObject = function(domTemplate, domTarget, data) {
			var templateItems = domTemplate.children().clone();
			templateItems.find('lml\\:tobject').each(function(index, obj) {
				obj = $(obj);
				var nodeType = obj.data('nodetype');
				var key = obj.data('key');

				$(obj).replaceWith($("<"+nodeType+">").html(data[key]));
			});

			$(domTarget).before(templateItems);

			return true;
		};

  		this.parseTextToView = function() {
    			$("lml\\:livevars").each(function() {
				var lmlTag = $(this);

      				if (typeof livevars[$(this).data('varname')] === "object") {
					var templateName = $(this).data('template');
					var varValue = livevars[$(this).data('varname')];

					if (templateName != "" && $('#' + $(this).data('template')).length != 0) {
						var templateObj = $('#' + $(this).data('template'));

						if (templateObj.length != 0) {
							if (varValue.length > 0) {
								varValue.forEach(function(val, index) {
									generateTemplateFromObject(templateObj, lmlTag, val);
								});
							}
						}
					} else {
						$(this).text(JSON.stringify(livevars[$(this).data('varname')]));
						$(this).text(unescape(livevars[$(this).data('varname')]));
					}
      				}
   			});

  		};

  		this.livevars = function() {
    			return livevars;
  		};

		this.exec = function() {
			var that = this;
			that.getLiveVars(function() {
				that.parseTextToView();
			});
		};
	};

	var FormValidator = function() {
		this.prepareValidation = function() {
			$( document ).ready(function() {
				$('.v_form_validate').submit(function(e) {
					e.preventDefault();
					var validForm = true;

					$('.v_validate ').each(function() {

						var validField = true;


						// If a field : text, textarea
						if ($(this).attr('type') == 'text' ||
							$(this).attr('type') == 'textarea' ||
							$(this).attr('type') == 'email' ||
							$(this).attr('type') == 'password') {

						if ($(this).attr('required') && $(this).val().length == 0) {
						validField = false;
						}

						// Min and maxlength verification
						if ($(this).attr('minlength') && $(this).val().length < $(this).attr('minlength')) {
						validField = false;
						} else if ($(this).attr('maxlength') && $(this).val().length > $(this).attr('maxlength')) {
						validField = false;
						}
						}


						if ($(this).attr('type') == 'checkbox' && $(this).attr('required') && !$(this).is(':checked')) {
							validField = false;
						}

						if ($(this).attr('type') == 'number') {
							// Min and maxlength verification
							if ($(this).attr('min') && $(this).val() < $(this).attr('min')) {

								validField = false;
							} else if ($(this).attr('max') && $(this).val() > $(this).attr('max')) {

								validField = false;
							}
						}
						$('[ckeditor]').val($.trim($('[ckeditor]').val()));
						// If a number verify number

						if (!validField) {
							validForm = validField;
						}

						if (!validField) {
							$(this).removeClass('v_valid');
							$(this).addClass('v_invalid');
						} else {
							$(this).removeClass('v_invalid');
							$(this).addClass('v_valid');
						}


					});

					if (validForm) {
						// Send via ajax
						processForm($(this));
					}

				});

				var processForm = function(form) {
					var that = this;
					var serialized_form = form.serialize();

					// Process files
					processFiles(form, function() {
							$.post(form.attr('action'), serialized_form, function(data) {

								var event = new CustomEvent('formSubmited', {
									'detail': data
									});
								document.dispatchEvent(event);
								return false;
								});
							});
				};

				var processFiles = function(form, cb) {
					if (form.find('input[type=file]').length > 0) {
						var data = new FormData();
						jQuery.each(form.find('input[type=file]')[0].files, function(i, file) {
								data.append('file-' + i, file);
								});

						jQuery.ajax({
							url: form.attr('action'),
							data: data,
							cache: false,
							contentType: false,
							processData: false,	
							type: 'POST',
							success: function(data) {
								return cb();
							}
						});
					} else {
						return cb();
					}
				};
			});
		};
	}

	var FormParser = function() {
		this.parse = function() {
			$.get('/admin/article/getArticle/' + window.location.pathname.split( '/' ).pop(), function(data){
				$("form").deserialize(data.form);
			});
		};
	};

	var CKEditor = function() {
		this.initEditor = function() {
                        var pictures = [];
                        var picture_id_url = {};
                        var selectedPicture;

                        $('[ckeditor]').ckeditor();
                        CKEDITOR.on('instanceReady', function(ev) {
                            this.document.appendStyleSheet('/static/style.css');
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
                                        $.get("/livevars", {
                                            vars: JSON.stringify([{
                                                varname: "media",
                                                "params": {}
                                            }])
                                        }, function(data) {
                                            pictures = data.media;
                                            pictures.forEach(function(picture, index) {
                                                picture_id_url[picture._id] = picture.url;

                                                $('#picture-list').append('<img id="' + picture._id + '" src="' + picture.sizes.thumbnail.url + '">');
                                            });
                                        });
                                    }

                                },
                                onOk: function() {
                                    if (typeof selectedPicture !== 'undefined') {
                                        var id = $(selectedPicture).attr('id');
                                        var img = editor.document.createElement('img');
                                        img.setAttribute('src', picture_id_url[id]);
                                        img.setStyle('width', '300px');
                                        editor.insertElement(img);
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
                        var pictures = [];
                        var picture_id_url = {};
                        var selectedPicture;

                        $('[ckeditor]').ckeditor();
                        CKEDITOR.on('instanceReady', function(ev) {
                            this.document.appendStyleSheet('/static/style.css');
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
                                        $.get("/livevars", {
                                            vars: JSON.stringify([{
                                                varname: "media",
                                                "params": {}
                                            }])
                                        }, function(data) {
                                            pictures = data.media;
                                            pictures.forEach(function(picture, index) {
                                                picture_id_url[picture._id] = picture.url;

                                                $('#picture-list').append('<img id="' + picture._id + '" src="' + picture.sizes.thumbnail.url + '">');
                                            });
                                        });
                                    }

                                },
                                onOk: function() {
                                    if (typeof selectedPicture !== 'undefined') {
                                        var id = $(selectedPicture).attr('id');
                                        var img = editor.document.createElement('img');
                                        img.setAttribute('src', picture_id_url[id]);
                                        img.setStyle('width', '300px');
                                        editor.insertElement(img);
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
		}
	};

	var Hooks = function() {
		
	};

	var LMLHTML5 = function() {
		var init = function() {
		
		};

		init();
	};

	var AwesomeStrapper = function() {
		this.strap = function() {
			var livevars = new LiveVars();
			var lmlhtml5 = new LMLHTML5();

			livevars.exec();
		};
	};

	this.awesomestrapper = new AwesomeStrapper();	
};

var liliumcms = new LiliumCMS();
$(function() {liliumcms.awesomestrapper.strap();});
