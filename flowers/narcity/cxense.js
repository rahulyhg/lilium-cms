module.exports = (lang, id) => {
    return `
        <h4 class="article-section-title"> 
            ${lang.recommendedforyou}
        </h4>

        <div id="cx_${id}"></div>

        <div id="cx_temp_${id}" style="display: none;"></div>
        <script type="text/javascript">
        var cX = cX || {};
        cX.callQueue = cX.callQueue || [];
        cX.callQueue.push(['insertWidget', {
            widgetId: "${id}",
            renderFunction: function(data, context) {
                var rawStyle = data.response.style;

                if (rawStyle && rawStyle.length) {
                    var style = document.createElement('style');

                    style.type = 'text/css';
                    if (style.styleSheet){
                        style.styleSheet.cssText = css;
                    } else {
                        style.appendChild(document.createTextNode(rawStyle));
                    }
                    document.getElementsByTagName('head')[0].appendChild(style);
                }
                document.getElementById('cx_temp_' + context.widgetId).innerHTML = data.response.template;
                cX.renderTemplate('cx_temp_' + context.widgetId, 'cx_' + context.widgetId, data, context);
            }
        }]);
        </script> 
    `;
};
