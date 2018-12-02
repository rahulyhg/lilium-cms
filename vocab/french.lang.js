import { DefaultDictionary } from './LangDico';
import { h } from 'preact';

const dictionary = {
    // Dashboard
    publishing : "Publications",
    ponglinks : "Ponglinks",
    myperformance : "Mes performances",
    payments : "Paiements",
    activereaders : "Lecteurs",
    yesterday : "Hier",
    lastweek : "Semaine dernière",
    weekbefore : "Semaine d'avant",
    lastmonth : "Mois dernier",
    monthbefore : "Mois d'avant",
    populartopics : "Sujets populaires",
    populartopicssub : "Basées sur les articles publiés dans les 30 derniers jours",
    yesterdaytoppost : "Le top article d'hier",
    hits : "lectures",
    publishedon : "Publié le ",
    hitsbyurl : "Lectures par URL",

    // Menus
    comments : "Commentaires",
    thedailylilium : "Le Lilium Quotidien",
    paymentdashboard : "Paiements",
    paymenthistory : "Rapport de contracteurs",
    support : "Support",
    flagging : "Signalements",
    dashboard : "Tableau de bord",
    mailtemplates : "Courriels",
    publishingcontent : "Contenu",
    topics : "Sujets",
    contentchains : "Chaines de contenu",
    styledpages : "Pages stylées",
    crew : "Équipe",
    entities : "Utilisateurs",
    staffing : "Employés",
    roles : "Roles",
    socialdispatch : "Réseau sociaux",
    profile : "Profil",
    notifications : "Notifications",
    preferences : "Préférences",
    pwmanager : "Mots de passe",
    cakepop : "Cakepops",
    settings : "Paramètres",
    adsmanagement : "Publicités",
    themes : "Thème",
    devtools : "Développement",
    plugins : "Plugins",
}

const extendedDictionary = { 
    greetUser: username => (<div>Bonjour, <span>{username}</span>.</div>)
}

const datetime = {
    dayNames: [
        'Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam',
        'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
    ],
    monthNames: [
        'Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jui', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec', 
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octrobre', 'Novembre', 'Décembre'
    ],
    timeNames: [
        'a', 'p', 'am', 'pm', 'A', 'P', 'AM', 'PM'
    ]
};

export class FrenchLanguage extends DefaultDictionary {
    constructor() {
        super(dictionary, extendedDictionary, datetime);
    }
}
