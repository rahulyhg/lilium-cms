import { DefaultDictionary } from './LangDico';
import { h } from 'preact';

const dictionary = {
    // General
    emailAddress: "Address email",
    password: 'Mot de passe',
    update: 'Mettre à jour',

    // Publishing
    createArticle: 'Créer un article',
    searchByTitle: 'Recherche par titre',
    searchByAuthor: 'Auteur',
    searchByStatus: 'Statut',

    article: {
        statusses: {
            allStatusses: 'Tous les statuts',
            draft: 'Brouillon',
            published: 'Publié',
            reviewing: 'En revue',
            backToDraft: 'Retourné au brouillon'
        },
        fields: {
            title: 'Titre',
            subtitle: 'Sous-titre',
            content: 'Contenu',
            author: 'Auteur',
            status: 'Statut',
            hidden: 'Caché',
            updated: 'Mis à jour',
            aliases: 'Alias',
            media: 'Médie',
            nsfw: 'NSFW',
            date: 'Date',
            isSponsored: 'Est sponsorisé',
            sponsoredCampaignID: 'Id campaigne sponsorisée',
            useSponsoredBox: 'Utiliser la mention sponsorisé',
            sponsoredBoxContent: 'Contenu mention sponsorisée',
            sponsoredBoxLogo: 'Logo mention sponsorisée',
            sponsoredBoxTitle: 'Titre mention sponsorisée',
            sponsoredBoxURL: 'URL mention sponsorisée',
            lang: 'Langue',
            name: 'Slug',
            language: 'Langue',
            url: 'URL',
            wordcount: 'Nombre de mots',
            editions: 'Éditions'
        },
        historyEntries: {
            updated: 'a modifié',
            published: 'a publié cet article',
            unpublished: 'a dépublié cet article',
            submitted: 'a soumis cet article pour révision',
            refused: 'a refusé cet article',
            destroyed: 'a détruit cet article',
            created: 'a créé cet article',
            updatedArticle: 'a modifié cet article'
        }
    },
    anyone: 'Tout le monde',
    aboutArticle: 'À propos de cet article',
    pubTitle: 'Titre de publication',
    subtitle: 'Sous-titre',
    featuredImage: 'Image',
    language: 'Langue',
    edition: 'Édition',
    seoTitle: 'Titre SEO',
    seoSubtitle: 'Sous-titre SEO',
    makeSticky: 'Épingler à la page d\'accueil',
    urlOnly: 'Accessible par URL seulement',
    updateSlug: 'Changer Slug',
    updateAuthor: 'Changer l\'auteur',

    // BigList
    filters: 'Filtres',
    emptyMessage: 'Aucun élément ne correspond aux filtres sélectionnés',

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
    populartopics : "Éditions populaires",
    populartopicssub : "Basées sur les articles publiés dans les 30 derniers jours",
    yesterdaytoppost : "Le top article d'hier",
    hits : "lectures",
    publishedon : "Publié le ",
    hitsbyurl : "Lectures par URL",
    nostats: 'Aucune statistiques à montrer',

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
    editions : "Éditions",
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

    // Profile
    badges: 'Badges',
    general: 'Général',
    fullName: 'Nom complet',
    jobTitle: 'Titre de poste',
    writeIntro: "Écrivez un court texte pour vous présenter",
    contactInfo: 'Informations de contact',
    socialNetworks: 'Réseaux Sociaux',
    paymentInfo: 'Informations de paiement',
    paymentCurrency: 'Devise des paiements',
    phoneNumber: 'Numéro de téléphone',
    facebookURL: 'Facebook (URL du profil)',
    twitterName: "Nom de compte Twitter (sans le '@')",
    googlePlusName: "Google Plus (nom d'utilisateur)",
    instagramName: "Instagram (nom du compte sans le '@')",
    currentPW: 'Mot de passe actuel',
    newPW: 'Nouveau mot de passe',
    confirmPW: 'Confirmation du mot de passe',
    changePW: 'Changer mon mot de passe',
    twoFactorAuth: 'Authentification à deux facteurs',
    enter6digits: 'Entrerz le nombre à 6 chiffres',
    activate2FA: 'Activer 2FA pour mon compte',
    deactivate2FA: 'Désactiver 2FA',
}

const extendedDictionary = { 
    greetUser: username => (<div>Bonjour, <span>{username}</span>.</div>),
    passwordGuidelines: () => (
        <div id="password-guidelines">
            <p>Si jamais vous oubliez votre mot de passe, vous pourrez cliquer sur "j'ai oublié mon mot de passe" afin de demander un code de changement de mot de passe via SMS. Pour recevoir des SMS vous devez indiquer votre numéro de téléphone dans vos informations de contact.</p>
            <p>Pour des raisons de <b>sécurité</b> il est recommandé de changer votre mot de passe de façon régulière.</p>
        </div>
    ),
    presentation2FA: () => (
        <p>
            L'authentification à deux facteurs, parfois appelée '2FA', est une couche de sécurité supplémentaire pouvant être appliquée à votre compte Lilium.
            Une fois activé, le protocole de '2FA' requiert que vous entriez un nomber à 6 chiffres lorsque vous vous connectez dans Lilium, en plus de votre mot de passe.
        </p>
    ),
    getStarted2FA: () => (
        <div id="2fa-get-started">
            <p>Pour débuter, suivez ces quelques étapes :</p>
            <ol>
                <li>
                    Installez l'application Google Authenticator sur votre téléphone intelligent. L'application est disponible pour
                    <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en" target='_blank'> Android </a>
                    et <a href="https://itunes.apple.com/ca/app/google-authenticator/id388497605?mt=8" target='_blank'>iOS</a>.
                </li>
                <li>Dans Google Authenticator, cliquez sur l'icône '+'.</li>
                <li>Choisissez l'option 'scanner un code barre'.</li>
                <li>Centrez le code QR montré sur cette page dans la zone désignée sur votre téléphone intelligent. L'application le détectera automatiquement.</li>
                <li>Vous devriez maintenant voir un compte nommé 'Lilium CMS [nom de compagnie] (nom d'utilisateur). avec un nombre à 6 chiffres qui se rafraichit toutes les 30 secondes.</li>
            </ol>
        </div>
    )
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
