const log = (sender, msg, level) => {    
    const output = ('[' + sender + "]").padEnd(14, ' ') + msg;
    switch (level) {
        case "warn"    :  console.warn  (output); break;
        case "err"     :  console.error (output); break;
        case "info"    :  console.info  (output); break;
        case "deprec"  :  console.log   ("%c" + output, "color: #E56330;"); break;
        case "lilium"  :  console.log   ("%c" + output, "color: #9B59B6; font-weight: bold;"); break;
        case "socket"  :  console.log   ("%c" + output, "color: #5dbbab;"); break;
        case "success" :  console.log   ("%c" + output, "color: #6da55e;"); break;
        case "url"     :  console.log   ("%c" + output, "color: #355dbd;"); break;  
        case "detail"  :      
        case "layout"  :  console.log   ("%c" + output, "color: #d4c7d8;"); break;
        case "style"   :  console.log   ('%c' + output, style); break;
        default        :  console.log   (output);
    };
};

export function makeGlobalLogger() {
    console.log("%c", "font-size: 1px; line-height: 100px; background-image: url(" + document.location.protocol + "//" + liliumcms.url + "/static/media/masthead.png); background-size: 340px 100px; padding: 50px 170px;");
    global.log = log;
}
