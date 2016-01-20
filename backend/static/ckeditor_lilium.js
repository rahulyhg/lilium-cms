$( '[ckeditor]' ).ckeditor();
CKEDITOR.on( 'instanceReady', function( ev )
   {
      ev.editor.dataProcessor.writer.setRules( 'p',
         {
            indent : true,
            breakBeforeOpen : true,
            breakAfterOpen : false,
            breakBeforeClose : false,
            breakAfterClose : false
         });
   });
CKEDITOR.config.entities = false;
CKEDITOR.config.basicEntities = false;
CKEDITOR.config.entities_greek = false;
CKEDITOR.config.entities_latin = false;
