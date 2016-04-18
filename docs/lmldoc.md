* Lilium Markup Language *

Lilium Markup Language is an easy to use markup language parsed by Lilium. It generates pute HTML pages, ready to be served to clients. LML can also be interpreted in real-time, but is really meant to be used for caching.

** Syntax **

LML syntax is a bit similar to PHP, but has its own pros and cons. The activation characters are curly braces.

*** Tags ***

{#inc}  Will include a Javascript context, can be multiple split by ";"
{=var}  Will print a Javascript variable, cannot contain operations
{*var}  Will print a live, context variable. (Will update in real-time)
{%file} Will include an interpreted LML or HTML file at this position. In a theme, those are called "petals".

{$
   var a = 1000;  
$}
Everything between {$ and $} will be interepreted as normal server-side Javascript. You can make equations and declare new variables to be printed in your logic.

*** Templates ***

Lml uses the concept of blocks. Blocks are content that can be reused in templates. Blocks are generally declared in a parent template.


The child template defines the content of the block. The content will be replaced where the parent defined the block.

Here is a quick example :

`parent.lml`

```javascript
<html>
<heah>
    {$
        block (head)
    $}
</head>
<body>
Some header content
    {$
        block (content)
    $}
</body>
</html>
```

`child.lml`

```javascript
{parent('./parent.lml')}

{$
    block (head)
$}
    This will be in the head
{$
    endblock
$}

{$
    block (body)
$}
    This will be in the body
{$
    endblock
$}
```
