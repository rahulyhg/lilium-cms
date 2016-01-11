$( document ).ready(function(){
  $('.v_form_validate').submit(function(e){
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


      if ($(this).attr('type') == 'checkbox' && $(this).attr('required') && !$(this).checked) {
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
      return ;
    }

  });


});
