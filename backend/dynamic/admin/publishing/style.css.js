module.exports = ` <style>
main {
    background: #F3F3F3;
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

</style>
`;
