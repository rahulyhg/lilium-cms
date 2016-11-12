var fbads = require('facebook-ads-sdk');
var fb = new fbads("EAAXtl0f2nlMBAL0fAMwBtluymyFpRadhZAOd6VzOpRH6fKAFKjclfI8dIo7w4CVTPUwI0aNsZBkGRIPzKpqHobUYSUzmVW4QZAYTIlOKuxosHwZAEMqiegnPidqYHSt0DCzErMjjZAsnD3QCoEQjpdYOERJFOqYAZD");
// var fb = new fbads("AbwWHyVddMJWw9us");
var AdAccount = fb.AdAccount;
var Campaign = fb.AdCampaign;
var account = new AdAccount({ 'id': 514442 });
var campaign = new Campaign({ 'id': 6057101137605 });

const insightsFields = ['impressions', 'frequency', 'unique_clicks', 'actions', 'spend', 'cpc'];
var campaigns;

account.read(["name"]).then((acc) => { 
    console.log(acc);
 return;
    acc.getAdCampaigns(["name"]).then((camp) => {
        console.log(camp);
    }).catch((error) => {console.log(error);});

}).catch((error) => {console.log(error);});
