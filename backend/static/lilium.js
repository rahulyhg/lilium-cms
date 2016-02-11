// Lilium Frontend core framework
// Requires vaniryk
var LiliumCMS = function() {
  var livevars;
  var urlParams;
  var pushtables = new Array();

  var LiliumEvents = {
    livevarsRendered : {
      event : new CustomEvent('livevarsRendered'),
      name : "livevarsRendered"
    },
    livevarsFetched : {
      event : new CustomEvent('livevarsFetched'),
      name : "livevarsFetched"
    }
  };

  var LiveVars = function() {
    var endpoints = [];
    var paramString = "?";

    this.getLiveVars = function(cb) {
      urlParams = window.location.pathname.split('/');

      // regex to match {$1}
      var reg = /({\?\s*[0-9]\s*})/g;

      $("lml\\:livevars").each(function() {
        var elem = this;
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
            elem.setAttribute('data-varname', variableName);
          }

          endpoints.push({
            'varname': variableName,
            'params': typeof params === "string" ? JSON.parse(params.replace(/&lmlquote;/g, '"')) : {}
          });
        }
      });

      endpoints.push({
        'varname': 'session',
        'params': {}
      });

      $.get("/livevars", {
        vars: JSON.stringify(endpoints)
      }, function(data) {
        livevars = deepUnescape(data);
        return cb(livevars);
      });
    };

    this.livevars = function() {
      return livevars;
    }

    var fetchTemplateObjectContent = function(obj, data) {
      var key = obj.data('key');
      var sep = obj.data('arrayseparator');
      var content = "";

      if (typeof key !== 'undefined') {
        // Split for keys like : endpoint.variable.id
        var keys = key.split('.');
        var currentData = data;

        keys.forEach(function(elem, i) {
          //Check if data[key] exists
          if (typeof currentData[elem] !== 'undefined') {
            currentData = currentData[elem];

            //Check if it is the last key
            if (keys.length == i + 1) {

              if (typeof currentData === 'object' && currentData.length != 0) {
                for (var i = 0; i < currentData.length; i++) {
                  content += currentData[i] + (i == currentData.length - 1 ? "" : sep);
                }
              } else {
                content = currentData;
              }
            }

          } else {
            content = obj.html();
          }

        });


      } else {
        content = obj.html();
      }
      return content;

    };

    var generateTemplateFromObject = function(domTemplate, domTarget, data) {
      var templateItems = domTemplate.children().clone();
      templateItems.find('lml\\:tobject').each(function(index, obj) {
        obj = $(obj);
        var nodeType = obj.data('nodetype');
        var action = obj.data('action');
        var filter = obj.data('filter');
        var passed = true;

        if (typeof window[filter] === 'function') {
          passed = window[filter].apply(data, [data]);
        }

        if (passed) {
          var node = $(document.createElement(nodeType));
          if (nodeType == 'img') {
            node.attr('src', fetchTemplateObjectContent(obj, data));
          } else if (nodeType == 'a') {
						node.attr('href', obj.data('href') + fetchTemplateObjectContent(obj, data));
						node.html(obj.html());
					} else {
            node.html(fetchTemplateObjectContent(obj, data));
          }

          if (action && typeof window[action] === 'function') {
            var paramkey = obj.data('actionparamkey');
            var bindName = obj.data('bind');
            node.bind(bindName, function() {
              window[action].apply(data, [data[paramkey]]);
            });
          }

          obj = $(obj).replaceWith(node);
        } else {
          $(obj).remove();
        }
      });

      $(domTarget).before(templateItems);

      return true;
    };

    var generateFillingFromObject = function(filler, fillingData, data) {
      var props = typeof fillingData.varparam == "object" ? fillingData.varparam : JSON.parse(fillingData.varparam.replace(/&lmlquote;/g, '"'));
      var filling = $(document.createElement(fillingData.filling));

      for (var key in props) {
        if (key === 'html') {
          filling.html(data[props[key]]);
        } else {
          filling.attr(key, data[props[key]]);
        }
      }

      filler.append(filling);
    };

    this.parseTextToView = function() {
      $("lml\\:livevars").each(function() {
        var lmlTag = $(this);

        if (typeof livevars[$(this).data('varname')] === "object") {
          var templateName = $(this).data('template');
          var varValue = livevars[$(this).data('varname')];
          var fillerName = $(this).data('filler');

          if (fillerName == "pushtable") {
            var datascheme = $(this).data('scheme');
            var pushTable = new PushTable($(this).data('fieldname'), datascheme, varValue);
            pushtables.push(pushTable);

            $(lmlTag).after(pushTable.render()).remove();
          } else if (templateName != "" && $('#' + $(this).data('template')).length != 0) {
            var templateObj = $('#' + $(this).data('template'));

            if (templateObj.length != 0) {
              if (varValue.length > 0) {
                varValue.forEach(function(val, index) {
                  generateTemplateFromObject(templateObj, lmlTag, val);
                });
              }
            }

            $(lmlTag).remove();
          } else if (fillerName != "") {
            var filler = $(document.createElement(fillerName));
            filler.attr('name', lmlTag.data('fieldname'));

            varValue.forEach(function(val, index) {
              generateFillingFromObject(filler, lmlTag.data(), val);
            });

            $(lmlTag).after(filler);
          } else {
            $(this).text(JSON.stringify(livevars[$(this).data('varname')]));
            $(this).text(unescape(livevars[$(this).data('varname')]));
          }
        }
      });
      document.dispatchEvent(LiliumEvents.livevarsRendered.event);
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

  this.getUrlParams = function() {
    return urlParams;
  }

  var FormValidator = function() {
    this.prepareValidation = function() {
      $(document).ready(function() {
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
    this.parse = function(selector) {
      $("form").deserialize(livevars[selector][0]);
    };
  };

  var PushTable = function(tableid, dataScheme, dataSource) {
    var datasrc = dataSource;
    var html = "";
    var scheme = JSON.parse(dataScheme.replace(/&lmlquote;/g, '"'));
    var htmlIdentifier = tableid;
    var that = this;
    var rows = new Object();

    this.rendered = false;

    this.bindEvents = function() {
      if (this.rendered) {
        $('#' + htmlIdentifier).find('.lmlpushtablekeyer').bind('change', function() { return that.selectChanged(this); });
        $('#' + htmlIdentifier).find('.lmlpushtablecolumnaddaction').bind('click', function() { return that.appendRow(this) });
      } else {
        throw "Tried to apply bindings on a PushTable that was not yet rendered. Identifier : " + this.htmlIdentifier;
      }

      this.selectChanged();
    };

    this.rowToHTML = function(row) {
      var _h = '<tr class="lmlpushtableaddedrow" id="'+row._rowID+'" data-value="'+row['_lmlid']+'"><td>'+
        '<b>'+row['_title']+'</b><input type="hidden" name="'+tableid+'['+row._rowID+'][prodid]" value="'+row['_lmlid']+'" /></td>';

      for (var key in row) {
        if (key[0] != "_") {
          _h += '<td><span>'+row[key].toString()+'</span><input type="hidden" name="'+
            tableid+'['+row._rowID+']['+key+']" value="'+row[key]+'" /></td>';
        }
      }

      return _h + '<td><button class="lmlpushtableremovebutton">Remove</button></td></tr>';
    };

    this.removeDeleteRow = function(rowID) {
      $('#' + rowID).remove();
      delete rows[rowID];
      that.updateFooter();

      return false;
    };

    this.appendRow = function() {
      var row = new Object();
      row._rowID = "row" + Math.random().toString(36).slice(-12);

      row['_lmlid'] = $('#' + htmlIdentifier).find('.lmlpushtablekeyer').val();
      row['_title'] = $('#' + htmlIdentifier).find('.lmlpushtablekeyer option:selected').html();

      $('#' + htmlIdentifier).find('.lmlpushtablecolumnfield').each(function(index, val) {
        var fieldname = $(this).data('fieldname');
        row[fieldname] = $(this).val();
      });

      rows[row._rowID] = row;
      (function(rowID) {
        $('#' + htmlIdentifier).find('tbody').append(that.rowToHTML(row))
          .find('tr').last().find('.lmlpushtableremovebutton').bind('click', function() {
            that.removeDeleteRow(rowID);
          }
        );
      })(row._rowID);

      that.updateFooter();
      return false;
    };

    this.selectChanged = function(select) {
      var key = $(select || ("#" + htmlIdentifier + " .lmlpushtablekeyer option:selected")).val();
      var src = datasrc[key];

      $('#' + htmlIdentifier).find('.lmlpushtablecolumnfield').each(function(index, val) {
        var dataKeyName = $(this).data('keyname');
        var defaultValue = $(this).data('defaultvalue');
        $(this).val(dataKeyName ? src[dataKeyName] : defaultValue);
      });

      return false;
    };

    this.render = function() {
      this.rendered = true;
      return html;
    };

    this.updateFooter = function() {
      if (scheme.footer) {
        var table = $('#' + htmlIdentifier);
        table.find('tfoot tr td:gt(0)').each(function(index, col) {
          if (scheme.footer.sumIndexes.indexOf(index) !== -1) {
             var colScheme = scheme.columns[index];
             var total = 0;

             for (var rowID in rows) {
               total += parseInt(rows[rowID][colScheme.fieldName]);
             }

             $(col).html(total + (colScheme.prepend || ""))
          }
        });
      }

      return false;
    };

    this.init = function() {
      html += '<table id="'+tableid+'" class="lmlpushtable lmldatasourcetable"><thead><tr><th>' +
        scheme.key.displayName + '</th>'

      for (var i = 0; i < scheme.columns.length; i++) {
        html += "<th>" + scheme.columns[i].displayName + "</th>";
      }

      html += '<th></th></tr><tr><th><select class="lmlpushtablekeyer">';

      for (var key in dataSource) {
        var dat = dataSource[key];
        html += '<option class="lmlpushtableoptionkey" value="'+dat[scheme.key.keyValue]+'">'+dat[scheme.key.keyName]+'</option>';
      }

      html += '</select></th>';

      for (var i = 0; i < scheme.columns.length; i++) {
        var col = scheme.columns[i];
        html += '<th><input class="lmlpushtablecolumnfield" type="'+(col.dataType || "text")+
         '" data-fieldname="'+col.fieldName+
         (col.keyName ? '" data-keyname="'+col.keyName : "") +
         (col.defaultValue ? '" data-defaultvalue="'+col.defaultValue : "") +
         '" /></th>';
      }

      html += '<th><button class="lmlpushtablecolumnaddaction">Add</button></th>' +
       '</tr></thead><tbody></tbody>';

      if (scheme.footer) {
        html += '<tfoot><tr><td>' + scheme.footer.title + '</td>';

        for (var i = 0; i < scheme.columns.length; i++) {
          if (scheme.footer.sumIndexes.indexOf(i) !== -1) {
            html += '<td>0'+(scheme.columns[i].prepend||"")+'</td>'
          } else {
            html += '<td></td>';
          }
        }

        html += '<td></td></tr></tfoot>';
      }

      html += '</table>';

      document.addEventListener(LiliumEvents.livevarsRendered.name, function() {
        that.bindEvents();
      });
    };

    this.init();
  };

  var CKEditor = function() {
    this.initEditor = function() {
      var pictures = [];
      var picture_id_url = {};
      var selectedPicture;
      $('[ckeditor]').ckeditor();
      CKEDITOR.on('instanceReady', function(ev) {
        this.document.appendStyleSheet('/static/style.css');
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

  var deepUnescape = function(json){
    for (var index in json) {
      switch (typeof json[index]) {
        case 'string':
          json[index] = unescape(json[index])
          break;
        case 'object':
          json[index] = deepUnescape(json[index]);
          break;

      }
    }
    return json;
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
  this.formParser = new FormParser();
  this.livevars = new LiveVars();
  this.ckeditor = new CKEditor();
  // API
  this.refresh = function() {
    window.location.reload();
  };

  var init = function() {
    var pathname = window.location.pathname;
    var split = pathname.split('?')[1];
    window.location.params = new Object();

    if (split) {
      split = split.split('&');
      for (var i = 0; i < split.length; i++) {
        var keyVal = split[i].split('=');
        window.location.params[keyVal[0]] = keyVal[1];
      }
    }

  };

  init();
};

var liliumcms = new LiliumCMS();
$(function() {
  liliumcms.awesomestrapper.strap();
});
