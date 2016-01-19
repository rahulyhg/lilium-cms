$.get('/admin/article/getArticle/' + window.location.pathname.split( '/' ).pop(), function(data){
  $("form").deserialize(data.form);
})
