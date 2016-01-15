$.get('/admin/article/getArticle/' + window.location.pathname.split( '/' ).pop(), function(data){
  console.log(data);
  $("form").deserialize(data.form);
})
