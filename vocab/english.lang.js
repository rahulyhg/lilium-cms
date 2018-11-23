import { DefaultDictionary } from './LangDico';
import { h } from 'preact';

const dictionary = {
    // Dashboard
    publishing : "Publishing",
    ponglinks : "Ponglinks",
    myperformance : "My performance",
    payments : "Payments",
    activereaders : "Active readers",
    yesterday : "Yesterday",
    lastweek : "Last week",
    weekbefore : "Week before",
    lastmonth : "Last month",
    monthbefore : "Month before",
    populartopics : "Popular topics",
    populartopicssub : "From articles published in the last 30 days",
    yesterdaytoppost : "Yesterday's top post",
    hits : "hits",
    publishedon : "Published on ",
    hitsbyurl : "Hits by URL",

    // Menus
    comments : "Comments",
    thedailylilium : "The Daily Lilium",
    paymentdashboard : "Payment dashboard",
    paymenthistory : "Payment history",
    support : "Support",
    flagging : "Flagging",
    dashboard : "Dashboard",
    mailtemplates : "Mail templates",
    publishingcontent : "Publishing",
    topics : "Topics",
    contentchains : "Content chains",
    styledpages : "Styled pages",
    crew : "Crew",
    entities : "Entities",
    staffing : "Staffing",
    roles : "Roles",
    socialdispatch : "Social dispatch",
    profile : "Profile",
    notifications : "Notifications",
    preferences : "Preferences",
    pwmanager : "Password manager",
    cakepop : "Cakepops",
    settings : "Settings",
    adsmanagement : "Ads management",
    themes : "Themes",
    devtools : "Devtools",
    plugins : "Plugins",
}

const extendedDictionary = { 
    greetUser: username => (<div>Hi, <span>{username}</span>.</div>)
}

const datetime = {
    dayNames: [
        'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',
        'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ],
    monthNames: [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
        'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
    ],
    timeNames: [
        'a', 'p', 'am', 'pm', 'A', 'P', 'AM', 'PM'
    ]
};

export class EnglishLanguage extends DefaultDictionary {
    constructor() {
        super(dictionary, extendedDictionary, datetime);
    }
}
