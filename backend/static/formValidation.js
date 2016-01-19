$( document ).ready(function(){
  $('.v_form_validate').submit(function(e){
    e.preventDefault();
    var validForm = true;

    $('.v_validate ').each(function(){

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

    var serialized_form = form.serialize();

    // Process files
    processFiles(form, function(){
      $.post(form.attr('action'),serialized_form, function(data){

        if (data.redirect) {
          window.location.href = data.redirect;
        }
      });
    });


  }

  var processFiles = function(form, cb) {
    if (form.find('input[type=file]').length > 0) {
      var data = new FormData();
      jQuery.each(form.find('input[type=file]')[0].files, function(i, file) {
          data.append('file-'+i, file);
      });

      jQuery.ajax({
        url: form.attr('action'),
        data: data,
        cache: false,
        contentType: false,
        processData: false,
        type: 'POST',
        success: function(data){
            return cb();
        }
      });
    }
    return cb();

  }


});
