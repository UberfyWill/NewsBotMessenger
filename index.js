var express = require('express');

//body PARSER
var bodyParser = require('body-parser');

//request.js init
var request = require('request');

//express app init
var app = express();

//reddit querying wrapper
var reddit = require('redditor');

//messenger api token
var token = "EAADiRtLZBWKoBALEVQnRa0yQJqZBQImAVhydf6ZCTT9zFMhe2wZCkYJjS4nSbBfU8ZAU1bx82iVwtsio82lZBqWlZBSCFYm3fswOapCVAglxnvsU337ZAdhFPxVnsFNVfPJFvxARQlcBaWnuuultyadGoLZAKF5bu3iE7nxZAdMfNB3gZDZD";

//api.ai for getting query 
var apiAi = require('apiai');
var apiAiApp = apiAi("de036e0dd0754b34ae0118c481c1896a");

//article parsing for time read and reddit
var ArticleParser = require('article-parser');

app.set('port', (process.env.PORT || 8080));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


var NEWS_SOURCES = {
    'NEWS': '/r/worldnews.json',
    'WORLD NEWS': '/r/worldnews.json',
    'GAMES': '/r/gamingnews.json',
    'GAMING': '/r/gamingnews.json',
    'SCIENCE': '/r/science.json',
    'BUSINESS': '/r/business.json',
    'SAD': '/r/offbeat.json',
    'US POLITICS': '/r/politics.json',
    'HAPPY': '/r/upliftingnews.json',
    'EUROPE': '/r/europe.json'

}

app.get('/', function(req, res) {
    res.send('Hello, I am a chatbot!');
});

app.get('/webhook/', function(req, res) {
    if (req.query['hub.verify_token'] === 'news_me') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
});




function sendTextMessage(sender, text) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: token },
        method: 'POST',
        json: {
            recipient: { id: sender },
            message: text
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendPreMessage(sender, category) {
    if (category) {
        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: { access_token: token },
            method: 'POST',
            json: {
                recipient: { id: sender },
                message: {
                    text: `Finding ${category} articles...`
                }
            }
        }, function(error, response, body) {
            if (error) {
                console.log('Error sending messages: ', error)
            } else if (response.body.error) {
                console.log('Error: ', response.body.error)
            }
        });
    }
}


function redditResponse(category) {
    var selection = Math.floor((Math.random() * 10) + 1);
    if (category.toUpperCase() in NEWS_SOURCES) {
        var location = NEWS_SOURCES[category.toUpperCase()];
        reddit.get(location, function(err, response) {
            if (err) throw err;
            console.log(response);
            parseRedditArtcle(response.data.children[selection]);
        });
    } else {
        console.log('alchemyNews.');
    }

    //parseRedditArtcle(articleNotParsed);
}

function secondsToMinutes(seconds) {
    return Math.ceil(seconds / 60);
}

function buildButton(minutes) {
    if (minutes === 1) {
        return "Read More (1 Min)"
    } else {
        return "Read More (" + minutes + " Mins)";
    }
}

function parseRedditArtcle(articleNotParsed) {
    var url = articleNotParsed.data.url;
    var title = articleNotParsed.data.title;
    ArticleParser.extract(url).then((article) => {
        var minutes = secondsToMinutes(article.duration);
        var timeToRead = buildButton(minutes);
        var returned = {
            attachment: {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [{
                        "title": title,
                        "subtitle": article.description,
                        "image_url": article.image,
                        "buttons": [{
                            "type": "web_url",
                            "url": url,
                            "title": timeToRead
                        }]
                    }]
                }
            }
        }
        sendTextMessage(sender, returned);

    }).catch((err) => {
        console.log(err);
    });
    //var summary = summarizer(text);
    //console.log(url, title, text, summary);

}


app.post('/webhook/', function(req, res) {
    messaging_events = req.body.entry[0].messaging
    for (i = 0; i < messaging_events.length; i++) {
        event = req.body.entry[0].messaging[i]
        sender = event.sender.id
        if (event.message && event.message.text) {
            text = event.message.text;
            var textReq = apiAiApp.textRequest(event.message.text);
            textReq.on('response', function(response) {
                var category = (response.result.parameters.topic) ? response.result.parameters.topic : response.result.parameters.keyword;
                sendPreMessage(sender, category);
                redditResponse(category);
            });
            textReq.on('error', function(error) {
                console.log(error);
            });
            textReq.end();

        }
    }
    res.sendStatus(200)
})





app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
});
