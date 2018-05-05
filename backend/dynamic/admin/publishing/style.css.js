module.exports = ` <style>
main {
    background: #F3F3F3;
}

#restore-recent-autosave .fal {
    text-align: center;
    display: block;
    font-size: 72px;
    padding: 20px 0px;
    color: #5f2782;
}

#sticky-actions button {
    display: block;
    padding: 8px 14px;
    box-shadow: 0px 0px 1px 1px #c260ff inset;
    border-radius: 4px;
    width: 100%;
    margin-top: 10px;
}

body #lilium .liliumtext.theme-minim.fullscreen {
    position: fixed;
    top: 50px;
    bottom: 0;
    left: 40px;
    right: 260px;
    z-index: 26000;
    background: #EEE;
    margin: 0;
}

#publishing-form {
    position: fixed;
    right: 260px;
    top: 50px;
    bottom: 0px;
    left: 40px;

    overflow-y : scroll;
}

#history-wrap,
#sticky-actions {
    padding: 10px;
}

#sticky-actions {
    padding-top: 0px;
}

#sticky-actions button.red,
#sticky-actions button.blue {
    box-shadow : none;
}

.history-card.history-card-published {
    background-color: #d7e8d9;
    background-image: url("data:image/svg+xml,<svg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'><g fill='%23a8c3af' fill-opacity='0.4' fill-rule='evenodd'><circle cx='3' cy='3' r='3'/><circle cx='13' cy='13' r='3'/></g></svg>");
    border: 1px solid #c7d8c9;
    box-shadow: 0px 0px 3px #a6ffb0;
}

.history-card.history-card-submitted {
    background-color: #a5c1ee;
    background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%236ea0f0' fill-opacity='0.4' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E");
    box-shadow: 0px 0px 4px 1px rgb(165, 193, 238);
    border: 1px solid #8bb1ef;
}

.history-card.history-card-refused {
    background-color: #eebca5;
    background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f29164' fill-opacity='0.4' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E");
    box-shadow: 0px 0px 4px 1px rgb(238, 188, 165);
    border: 1px solid #f7a392;
}

.history-card.history-card-unpublished {
    background-color: #f0dbc4;
    background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23caa4a4' fill-opacity='0.4' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E");
    border: 1px solid #d0cbb4;
    box-shadow: 0px 0px 3px #f3a24a;
}

.history-card.history-card-destroyed {
    background-color: #eca8a8;
    background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23FF7777' fill-opacity='0.4' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E");
    border: 1px solid #bd6d6d;
    box-shadow: 0px 0px 3px #e05656;
}

#created-history-card {
    background-color: #e6e1ee;
    background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23cfbaf2' fill-opacity='0.4' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E");
    border: 1px solid #d5bef9;
    box-shadow: 0px 0px 3px #c9a7ff;
}

.history-card span {
    padding-left: 10px;
}

.history-actor {
    width: 32px;
    height: 32px;
    object-fit : cover;
    border-radius: 5px;
    display: block;
    flex-grow: 1;
}

.history-card {
    display: flex;
    flex-wrap: nowrap;
    border: 1px solid #DDD;
    background: #FFF;
    padding: 10px;
    font-size: 14px;
    border-radius: 3px;
    margin-bottom: 10px;
    box-shadow: 0px 0px 3px rgba(0,0,0,0.2);

    background-color: #f7f2ff;
    background-image: url("data:image/svg+xml,%3Csvg width='40' height='1' viewBox='0 0 40 1' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v1H0z' fill='%23ffffff' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E");
}

#publishing-actions {
    position: fixed;
    top: 50px;
    bottom: 0;
    right : 0;
    width : 260px;
    background : #f3f3f3;
    border-left: 1px solid #DDD;
    box-shadow: 0px 0px 5px rgba(0,0,0,0.1);

    overflow-y : scroll;
}

#publishing-actions h3 {
    border-top: 1px solid #DDD;
    border-bottom: 1px solid #DDD;
    padding: 10px 15px;
    background: #EEE;
    font-weight: 500;
}

#publishing-headers {
    margin: 0px 10px;
    padding: 20px;
    border: 1px solid #DDD;
    border-bottom-width: 3px;
    background: #FFF;
}

.big-title {
    display: block;
    width: 100%;
    box-sizing: border-box;
    font-family: "Oswald", sans-serif;
    font-size: 32px;
}

.big-subtitle {
    display: block;
    width: 100%;
    box-sizing: border-box;
    font-size: 16px;
}

.big-content {
    margin-top: 20px;
}

.publishing-tab {
}

.publishing-header {
    display: none;
    position: relative;
}

.publishing-header.to-be-removed.selected::before {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    bottom: 0;
    right: 0;
    z-index: 10;
}

.publishing-tab.to-be-removed .publishing-tab-close {
    display: none;
}

.publishing-tab-restore {
    display: none;
}

.publishing-tab i {
    margin-left: 5px;
    color: #333;
    cursor: pointer;
}

.publishing-tab.to-be-removed .publishing-tab-restore {
    display: inline-block;
}

.publishing-header.selected {
    display: block;
}

#publishing-tabs {
    display: flex;
    margin: 10px 10px -1px;
}

.publishing-tab {
    padding: 10px 15px;
    cursor: pointer;
}

.publishing-tab.selected {
    background: #FFF;
    border: 1px solid #DDD;
    border-bottom: none;
    border-top: 3px solid #af57e4;
    font-weight: 700;
}

.publishing-tab.to-be-removed {
    text-decoration: line-through;
}

#publishing-tab-add {
    font-weight: 700;
    color: #af57e4;
}

#pub-status {
    display: inline-block;
    width: auto;
    height: auto;
    margin-top: 0;
    color: #FFF;
    padding: 5px 10px;
    border-radius: 5px;
    text-transform: uppercase;
}

/* Topic box */
#publishing-topic {
    display: block;
    margin: 0px 10px;
    background: #FFF;
    border: 1px solid #DDD;
    border-bottom-width: 3px;
    position: relative;
    height: 300px;
    overflow: hidden;
}

.publishing-caregory-title {
    height: 10%;
    font-size: 16px;
    background: #F6F6FF;
    padding: 2px 6px;
    text-transform: uppercase;
    border-bottom: 3px solid #DDD;
}

#publishing-category {
    font-size: 32px;    
    height: 100%;
}

.publishing-category-single:nth-child(1) { background: #ffeaea; border-bottom: 1px solid #ffd6d6; color: #d07878; }
.publishing-category-single:nth-child(2) { background: #f5e1ff; border-bottom: 1px solid #ebc3ff; border-top: 1px solid #fff6f6; color: #d0789b; }
.publishing-category-single:nth-child(3) { background: #d6e8ff; border-top: 1px solid #f3f8ff; color: #8cabc7; }

.publishing-category-single {
    height: 33.333%;
    position: relative;
    overflow: hidden;
    cursor: pointer;
}

.publishing-category-single i {
    position: absolute;
    bottom: -9px;
    left: -12px;
    font-size: 72px;
    opacity: 0.5;

    transition: all 1s;
}

.publishing-category-single span {
    bottom: 10px;
    left: 100px;
    position: absolute;
    letter-spacing: 3px;
    transition: all 1s;
}

.publishing-category-single:hover span {
    letter-spacing : 5px;
}

.publishing-category-single:nth-child(1):hover i {
    transform: translate3d(0, -30px, 0);
}

.publishing-category-single:nth-child(2):hover i {
    transform: translate3d(20px, 0px, 0) rotateZ(30deg);
}

.publishing-category-single:nth-child(3):hover i {
    animation: handshakeanim 1s ease-in-out 0s infinite; 
}

.topic-card {
    position: absolute;
    top: 0;
    right: 0;
    left: 20px;
    height: 100%;
    background: #FFF;
    border-left: 1px solid #EEE;
    box-shadow: -5px 0px 5px rgba(0,0,0,0.1);
    transform: translate3d(40%, 0, 0);
    transition: all 0.3s;
    opacity: 0;

    overflow : auto;
}

.topic-card-title {
    padding: 10px;
    border-bottom: 1px solid #DDD;
    text-transform: uppercase;
    font-size: 16px;
    letter-spacing: 1px;
    background: #F6F6F6;
}

.topic-card-topic {
    padding: 10px;
    cursor: pointer;
    border-bottom: 1px solid #DDD;
}

.topic-card-topic:hover {
    background: #F3F3F3;
}

.topic-card.shown {
    transform: translate3d(0,0,0);
    opacity: 1;
}

.topic-card.topic-final-card {
    left: 0;
    background-color: #f7f2ff;
    background-image: url("data:image/svg+xml,%3Csvg width='20' height='10' viewBox='0 0 20 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M16 6H6v4H4V6H2V4h2V0h2v4h10V0h2v4h2v2h-2v4h-2V6z' fill='%23ffffff' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E");
}

.topic-final-title {
    margin-top: 80px;
    text-align: center;
    text-transform: uppercase;
    font-size: 12px;
}

.topic-final-displayname {
    text-align: center;
    font-size: 34px;
}

.topic-final-cancel {
    text-align: center;
    cursor: pointer;
    text-decoration: underline;
    margin-top: 10px;
    color: #333;
}

@keyframes handshakeanim {
    0%   { transform: translate3d(0, 0, 0); }
    50%  { transform: translate3d(0, -12px, 0); }
    100% { transform: translate3d(0, 0, 0); }
}

#publishing-media {
    border: 1px solid #cbb0d4;
    border-bottom-width: 3px;
    margin: 0px 10px;

    background-color: #f7f2ff;
    background-image: url("data:image/svg+xml,%3Csvg width='20' height='10' viewBox='0 0 20 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M16 6H6v4H4V6H2V4h2V0h2v4h10V0h2v4h2v2h-2v4h-2V6z' fill='%23ffffff' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E");
}

#featured-image-selector {
    text-align: center;
}

#featured-image-tag {
    max-width: 900px;
    margin: 50px auto;
    height: auto;
    max-height: 600px;
    min-height: 300px;
    min-width: 200px;
    border: 3px solid #AAA;
    border-bottom-width: 5px;
    object-fit : cover;
    display: block;
    width: calc(100% - 100px);
}

#featured-image-tag:hover {
    border-color: #af57e4;
}

#publishing-form textarea.pub-field {
    height: 80px;
}

#publishing-sponsored-wrap {
    margin-top: 10px;
    padding-top: 20px;
    border-top: 1px dashed #CCC;
}

#publishing-sponsored {
    margin: 0px 10px;
    padding: 10px;
    border: 1px solid #cbb0d4;

    background-color: #f7f2ff;
    background-image: url("data:image/svg+xml,%3Csvg width='20' height='10' viewBox='0 0 20 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M16 6H6v4H4V6H2V4h2V0h2v4h10V0h2v4h2v2h-2v4h-2V6z' fill='%23ffffff' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E");
}

#publishing-form h3 {
    margin-top: 40px;
    padding-left: 10px;
    z-index: 10;
    position: relative;
    text-transform: uppercase;
    font-size: 34px;
    color: #b4a0d6;
}

#publication-details {
    margin: 0px 10px 20px;
    padding: 15px;
    border: 1px solid #cbb0d4;
    border-bottom-width: 3px;

    background-color: #f7f2ff;
    background-image: url("data:image/svg+xml,%3Csvg width='20' height='10' viewBox='0 0 20 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M16 6H6v4H4V6H2V4h2V0h2v4h10V0h2v4h2v2h-2v4h-2V6z' fill='%23ffffff' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E");
}

.pub-detail-field {
    display: flex;
    flex-wrap : wrap;
    margin-bottom: 12px;
    min-height: 30px;
}

#edit-slug-icon {
    margin-left: 6px;
    font-size: 18px;
    cursor: pointer;
}

#pub-url-wrap {
    padding-top: 6px;
}

.pub-detail-field span {
    width: 200px;
    display: block;
    font-weight: bold;
    padding-top: 5px;
}

#publishing-form .pub-field {
    border: 1px solid #DDD;
    padding: 5px 10px;
    flex-grow: 0.5;
}

#sponsored-box-image {
    width: 120px;
    height: 120px;
}

#pub-url-link,
.pub-detail-field b {
    margin-top: 5px;
    width: calc(100% - 200px);
}

#pub-url-link[href=""] {
    color: #000;
}

.anim-slide {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 25000;

    transition: 1s all;
    transition-timing-function: ease-out;
    transform: translate3d(100%, 0, 0);
}

.anim-slide.slid {
    transform: translate3d(-100%, 0, 0);
}

#anim-slide-1 { background-color: #fcf4ff; }
#anim-slide-2 { background-color: #f5e9ff; }
#anim-slide-3 { background-color: #ede4ff; }
#anim-slide-4 { background-color: #fad5ff; }
#anim-slide-5 { background-color: #ecc3ff; }

#anim-slide-fade {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(43, 26, 49, 0.9);
    display: none;
    z-index: 24000;
    transition: 0.5s all;

    overflow-y: auto;
}

#anim-slide-fade.full {
    background-color: rgba(43, 26, 49, 1.0);
}

#anim-title {
    display: block;
    text-align: center;
    font-size: 72px;
    color: #e7ccff;
    text-transform: uppercase;
    transition: all 0.3s;
    transform: translate3d(0, 100px, 0);
    margin-top: 20px;
}

#anim-title.slid {
    transform: translate3d(0,0,0) scale(0.8);
}

#anim-title span {
    transform: scale(0.5);
    opacity: 0;
    transition: 0.5s all;
    transition-timing-function: cubic-bezier(0, 2.7, 1.0, 1.0);
    display: inline-block;
}

#anim-title span.shown {
    opacity: 1;
    transform: scale(1);
}

#anim-cards {
    display: flex;
    flex-flow: wrap;
    padding: 10px;
}

.flex-card {
    background-color: #ebe9f7;
    margin-bottom: 20px;
    transition: all 0.3s;
    opacity: 0;
    transform: translate3d(0, 50px, 0);
    border-radius : 10px;

    background-color: #ebe9f7;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23e1d9ee' fill-opacity='0.4'%3E%3Cpath fill-rule='evenodd' d='M0 0h40v40H0V0zm40 40h40v40H40V40zm0-40h2l-2 2V0zm0 4l4-4h2l-6 6V4zm0 4l8-8h2L40 10V8zm0 4L52 0h2L40 14v-2zm0 4L56 0h2L40 18v-2zm0 4L60 0h2L40 22v-2zm0 4L64 0h2L40 26v-2zm0 4L68 0h2L40 30v-2zm0 4L72 0h2L40 34v-2zm0 4L76 0h2L40 38v-2zm0 4L80 0v2L42 40h-2zm4 0L80 4v2L46 40h-2zm4 0L80 8v2L50 40h-2zm4 0l28-28v2L54 40h-2zm4 0l24-24v2L58 40h-2zm4 0l20-20v2L62 40h-2zm4 0l16-16v2L66 40h-2zm4 0l12-12v2L70 40h-2zm4 0l8-8v2l-6 6h-2zm4 0l4-4v2l-2 2h-2z'/%3E%3C/g%3E%3C/svg%3E");
}

.flex-card.shown {
    opacity : 1;
    transform: translate3d(0,0,0);
}

#anim-article-url {
    padding: 20px;
    display: block;
    font-size: 20px;
}

.card-title {
    display: block;
    padding: 20px 20px 0px;
    font-size: 32px;
}

.flex-col {
    width: 50%;
    padding : 10px;
}

#anim-article-image {
    width: 100%;
    height: auto;
}

#anim-author {
    padding: 10px 15px 15px;
}

#anim-article-title {
    font-family: "Oswald", sans-serif;
    margin: 0px 20px;
    padding-top: 20px;
    font-size: 26px;
    line-height: 30px;
}

#anim-details .card-title {
    padding-bottom: 12px;
}

#anim-details > div {
    padding: 8px 20px;
    font-size: 20px;
}

#anim-details {
    padding-bottom: 13px;
}

#anim-details i {
    display: inline-block;
    width: 30px;
}

#anim-details span {
    display: inline-block;
    margin-right: 5px;
}

#anim-article-subtitle {
    margin: 5px 20px 20px;
    font-size: 18px;
    color: #333;
    font-weight: 100;
}

.flex-author {
    display: flex;
    padding: 15px 20px 20px;
}

#anim-article-authorimage {
    width: 120px;
    height: 120px;
    object-fit : cover;
    border-radius: 80px;
    border: 2px solid #2c1b31;
}

.author-flexgrow {
    flex-grow : 1;
    padding-left: 20px;
}

.author-flexgrow > div {
    margin-bottom: 10px;
}

.author-flexgrow i {
    width: 28px;
}

#anim-today-list {
    padding: 10px 20px 20px;
}

.anim-today-post {
    display: flex;
    margin-bottom: 10px;
}

.anim-today-post-date {
    font-size: 18px;
    padding-right: 21px;
    font-weight: bold;
}

#anim-dismiss.flex-card {
    padding: 30px;
    text-align: center;
    font-size: 27px;
    background: #792796;
    color: #fff;
    cursor: pointer;
}

</style>
`;
