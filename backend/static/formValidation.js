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
           console.log('required' + $(this));
           validField = false;
         }

        // Min and maxlength verification
        if ($(this).attr('minlength') && $(this).val().length < $(this).attr('minlength')) {
          console.log('minlength' + $(this));
          validField = false;
        } else if ($(this).attr('maxlength') && $(this).val().length > $(this).attr('maxlength')) {
          console.log('maxlength' + $(this));
          validField = false;
        }
      }


      if ($(this).attr('type') == 'checkbox' && $(this).attr('required') && !$(this).is(':checked')) {
        console.log('notchecked' + $(this));
        validField = false;
      }

      if ($(this).attr('type') == 'number') {
        // Min and maxlength verification
        if ($(this).attr('min') && $(this).val() < $(this).attr('min')) {
          console.log('min number' + $(this));

          validField = false;
        } else if ($(this).attr('max') && $(this).val() > $(this).attr('max')) {
          console.log('max number' + $(this));

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
    console.log(serialized_form);

    $.post(form.attr('action'),serialized_form, function(data){
      console.log('BURNNN');
      console.log(data);
    });
  }

});
