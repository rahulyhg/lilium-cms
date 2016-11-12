var google = require('googleapis')
var Dfp = require('node-google-dfp'),
    dfpUser = new Dfp.User('1020360', "Narcity Media", "v201608")
    analytics = google.analytics('v3');
var request = require('request');
var lickstatsCred = {
  mtlblogSecret : '57ddc918861cce673bfc593d-ed2dc5c4-95de-49a3-aa63-2f24f15f7a80',
  narcitySecret : '580638ca993144835fb57133-f5d9fff3-7300-45c6-be6d-061cee8aa821'
};

var instagram = require('instagram-node').instagram();


var jwtClient = new google.auth.JWT(
  'ganalytics@production-team-146115.iam.gserviceaccount.com',
  './ganalyticskey.pem',
  null,
  ['https://www.googleapis.com/auth/dfp','https://www.googleapis.com/auth/analytics.readonly']);


 function getDfpStats(dfpCampaignId, cb){
    // NARCITY HOUSE CAMPAIGN ID EXAMPLE "0720-BFI"
   dfpUser.setClient(jwtClient)
   dfpUser.getService('LineItemService', function (err, lineItemService) {
    if (err) {
      return console.error(err);
    }

    var statement = new Dfp.Statement("WHERE name LIKE '" + dfpCampaignId +"%'");

    lineItemService.getLineItemsByStatement(statement, function (err, results) {
      results.rval.results.forEach(function(campaign) {
        var dfpStats = {
          campaignName: campaign.name,
          website: campaign.name.substring(campaign.name.lastIndexOf("-") + 2),
          type: campaign.creativePlaceholders.map(function(ad){
            return { 
              width: ad.size.width,
              height: ad.size.height
            }
          }),
          startDate: campaign.startDateTime.date.month + "/" +campaign.startDateTime.date.day + "/" + campaign.startDateTime.date.year,
          endDate: campaign.endDateTime.date.month + "/" +campaign.endDateTime.date.day + "/" + campaign.endDateTime.date.year,
          impressionsBooked: campaign.primaryGoal.units,
          impressionsDelivered: campaign.stats.impressionsDelivered,
          clicksDelivered: campaign.stats.clicksDelivered,
          videoStartViews: campaign.stats.videoStartsDelivered,
          ctr: (campaign.stats.clicksDelivered / campaign.stats.impressionsDelivered * 100 ).toFixed(2) + "%"
        }
        cb(dfpStats)
      })
    });
  });
};

//google Analytics
function getAnalytics(link, startDate, endDate, cb){
  formatedLink = link.split('.com')[1]
  if (link.includes('narcity')) {
    var siteId = 'ga:90686041'
    var siteName = 'Narcity ' + formatedLink.split('/')[1]
  } else {
    var siteId = 'ga:56108990'
    var siteName = 'MTL Blog'
  }
  analytics.data.ga.get({ 
        auth: jwtClient,
        'ids': siteId,
        'start-date': startDate,
        'end-date': endDate,
        'metrics': 'ga:pageviews,ga:avgTimeOnPage',
        'dimensions': 'ga:pagePath,ga:pageTitle',
        'filters':"ga:pagePath==" + formatedLink,
        'samplingLevel': "DEFAULT"
    }, function(err, result) {
        console.log(err);
        var avgTimeMins = result.totalsForAllResults["ga:avgTimeOnPage"] / 60
        var avgTimeRemainingSeconds = Math.round(result.totalsForAllResults["ga:avgTimeOnPage"] % 60)
        if(avgTimeRemainingSeconds<10){
         var timeOnPage = Math.round(avgTimeMins) + ":" + "0" + avgTimeRemainingSeconds
       } else {
         var timeOnPage = Math.round(avgTimeMins) + ":" + avgTimeRemainingSeconds
       }
        analyticsResults = {
          website: siteName,
          reportStartDate: startDate,
          title: result.rows[0][1],
          url: link,
          views: result.totalsForAllResults["ga:pageviews"],
          engagementTime: timeOnPage
        }
        cb(analyticsResults)
    });
}


//LickStats
function getLickstats (campaignId, brand, startDate, endDate, cb) {
  switch (brand) {
      case 'mtlBlog' :
        var bearerCredential = lickstatsCred.mtlblogSecret
        break;
      case 'narcity' :
        var bearerCredential = lickstatsCred.narcitySecret
        break;
  }

  var dateQuery = encodeURI("?range[start]="+ startDate + "T00:00:00-04:00&range[end]="+ endDate + "T23:59:59-04:00")

  request.get("https://api.lickstats.com/v1/campaignlinks/"+ campaignId + "/stats" + dateQuery, {
    'headers': {
      'Authorization': 'Bearer ' + bearerCredential
    }
  }, function (error, response, body) {
     if (!error && response.statusCode == 200) {
        var totalCount = {
          "totalCount": JSON.parse(body).segments[0].count
        }
        cb(totalCount)
      }
  });
};

module.exports = {
  getDfpStats: getDfpStats,
  getAnalytics: getAnalytics,
  getLickstats: getLickstats
}
