import { DefaultDictionary } from './LangDico';
import { h } from 'preact';

const dictionary = {
    // General
    emailAddress: 'Email Address',
    password: 'Password',
    update: 'Update',

    // Publishing
    createArticle: 'Create New Article',
    searchByTitle: 'Search by Title',
    searchByAuthor: 'Author',
    searchByStatus: 'Status',

    article: {
        statusses: {
            allStatusses: 'All Statusses',
            draft: 'Draft',
            published: 'Published',
            reviewing: 'Pending Review',
            backToDraft: 'Set Back to Draft'
        },
        fields: {
            title: 'Title',
            subtitle: 'Subtitle',
            content: 'Content',
            author: 'Author',
            status: 'Status',
            hidden: 'Hidden',
            updated: 'Updates',
            aliases: 'aliasses',
            media: 'Media',
            nsfw: 'NSFW',
            date: 'Date',
            isSponsored: 'Is Sponsored',
            sponsoredCampaignID: 'Sponsored Campaign ID',
            useSponsoredBox: 'Use Sponsored Box',
            sponsoredBoxContent: 'Sponsored Box Content',
            sponsoredBoxLogo: 'Sponsored Box Logo',
            sponsoredBoxTitle: 'Sponsored Box Title',
            sponsoredBoxURL: 'Sponsored Box URL',
            lang: 'Language',
            name: 'Slug',
            language: 'Language',
            url: 'URL',
            wordcount: 'Word Count',
            editions: 'Editions'
        },
        historyEntries: {
            updated: 'updated',
            published: 'published this article',
            unpublished: 'set this article back to draft',
            submitted: 'submitted this article for review',
            refused: 'refused this article',
            destroyed: 'destroyed this article',
            created: 'created this article',
            updatedArticle: 'updated this article'
        }
    },
    anyone: 'Anyone',
    aboutArticle: 'About this article',
    pubTitle: 'Publication Headline',
    subtitle: 'Subtitle or catchline',
    featuredImage: 'Featured Image',
    language: 'Language',
    edition: 'Edition',
    seoTitle: 'SEO-Optimized Title',
    seoSubtitle: 'SEO-Optimized Subtitle',
    makeSticky: 'Make this article sticky',
    urlOnly: 'Accessible by URL only',
    updateSlug: 'Update Slug',
    updateAuthor: 'Update Author',

    // BigList
    filters: 'Filters',

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
    populartopics : "Popular editions",
    populartopicssub : "From articles published in the last 30 days",
    yesterdaytoppost : "Yesterday's top post",
    hits : "hits",
    publishedon : "Published on ",
    hitsbyurl : "Hits by URL",
    nostats: 'No stats to show',

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
    editions : "Editions",
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

    // Profile
    badges: 'Badges',
    general: 'General',
    fullName: 'Full Name',
    jobTitle: 'Job Title',
    writeIntro: "Write a small introduction paragraph",
    contactInfo: 'Contact Information',
    socialNetworks: 'Social Networks',
    paymentInfo: 'Payment Information',
    paymentCurrency: 'Payment Currency',
    phoneNumber: 'Phone Number',
    facebookURL: 'Facebook Profile URL',
    twitterName: "Twitter account name, without the '@'",
    googlePlusName: 'Google Plus username',
    instagramname: "Instagram account name, without the '@'",
    currentPW: 'Current Password',
    newPW: 'New Password',
    confirmPW: 'Confirm New Password',
    changePW: 'Change my password',
    twoFactorAuth: 'Two Factor Authentication',
    enter6digits: 'Enter the 6 digits code',
    activate2FA: 'Activate 2FA for my account',
    deactivate2FA: 'Deactivate 2FA',
}

const extendedDictionary = { 
    greetUser: username => (<div>Hi, <span>{username}</span>.</div>),
    passwordGuidelines: () => (
        <div id="password-guidelines">
            <p>If you ever forget your password, you can always click on "I have no idea what my password is" on the login page, and request a reset code via SMS. In order to receive the SMS, make sure you provided your phone number</p>
            <p>For <b>security</b> reasons, it's always a good practice to change your password on a regular basis.</p>
        </div>
    ),
    presentation2FA: () => (
        <p>
            Two Factor Authentication, '2FA' for short, is an extra layer of security you can apply on your Lilium account.
            It works by requiring that you provide a 6 digits code displayed by your smartphone in addition to your password when you login.
        </p>
    ),
    getStarted2FA: () => (
        <div id="2fa-get-started">
            <p>To get started, follow these few steps :</p>
            <ol>
                <li>
                    Install the Google Authenticator application on your smartphone, the application is available on 
                    <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en" target='_blank'> Android </a>
                    and on <a href="https://itunes.apple.com/ca/app/google-authenticator/id388497605?mt=8" target='_blank'>iOS</a>.
                </li>
                <li>Inside Google Authenticator, tap the '+' icon to add an account.</li>
                <li>Choose the 'Scan a barcode' option.</li>
                <li>Center the QR Code displayed below in the designate area on your phone's screen, it will be detected automatically.</li>
                <li>You should now see an account named 'Lilium CMS [company name] (username). with a correspponding string of 6 digits that refreshes every 30 seconds.</li>
            </ol>
        </div>
    )
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
