module.exports = ` <style>
main {
    background: #F3F3F3;
}

button {
    display: inline-block;
    padding: 8px 14px;
    background-color: #Af57E4;
    color: #FFF;
    text-transform: uppercase;
    font-weight: bold;
    border-bottom: 3px solid #793b9e;
    cursor: pointer;
    margin-right: 6px;
    box-shadow: 0px 0px 1px 1px #c260ff inset;
    border-radius: 4px;
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

.liliumtext.theme-minim .liliumtext-topbar-command {
    height: 34px;
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
    -webkit-animation: handshakeanim 0.5s ease-in-out 0s infinite; 
    animation: handshakeanim 0.5s ease-in-out 0s infinite; 
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
    background: #f1f4fb;
    background: linear-gradient(115deg, transparent 75%, rgba(255,255,255,.8) 75%) 0 0, linear-gradient(245deg, transparent 75%, rgba(255,255,255,.8) 75%) 0 0, linear-gradient(115deg, transparent 75%, rgba(255,255,255,.8) 75%) 7px -15px, linear-gradient(245deg, transparent 75%, rgba(255,255,255,.8) 75%) 7px -15px, #f1f4fb;
    background-size: 15px 30px;
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

@-webkit-keyframes handshakeanim {
    0%   : { transform: translate3d(0, 0, 0); }
    50%  : { transform: translate3d(0, -20px, 0); }
    100% : { transform: translate3d(0, 0, 0); }
}

@keyframes handshakeanim {
    0%   : { transform: translate3d(0, 0, 0); }
    50%  : { transform: translate3d(0, -20px, 0); }
    100% : { transform: translate3d(0, 0, 0); }
}

#publishing-media {
    border: 1px solid #CCC;
    border-bottom-width: 3px;
    margin: 0px 10px;

    background-color: #f7f7f7;
    background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23dfd7ec' fill-opacity='0.4' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E");
}

#featured-image-selector {
    text-align: center;
}

#featured-image-tag {
    max-width: 900px;
    margin: 50px;
    height: auto;
    max-height: 600px;
    min-height: 300px;
    min-width: 200px;
    border: 3px solid #AAA;
    border-bottom-width: 5px;
    object-fit : cover;
}

#featured-image-tag:hover {
    border-color: #af57e4;
}

#publishing-form .pub-field {
    
}

#publishing-form h3 {
    margin-top: 40px;
    padding-left: 10px;
    z-index: 10;
    position: relative;
    margin-bottom: -8px;
    text-transform: uppercase;
    font-size: 42px;
    color: #AAA;
}

#publication-details {
    margin: 0px 10px;
    padding: 15px;
    background: #FFF;
    border: 1px solid #ddd;
    border-bottom-width: 3px;
}

.pub-detail-field {
    display: flex;
    flex-wrap : wrap;
    margin-bottom: 12px;
    height: 30px;
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
    width: 300px;
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
