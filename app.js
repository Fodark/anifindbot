const TelegramBot = require('node-telegram-bot-api')
let fs = require('fs')
let https = require('https')

let file = 'bot_token'
let token = fs.readFileSync(file, 'utf-8')
//console.log(token)

const bot = new TelegramBot(token, { polling: true })

bot.onText(/\/echo (.+)/, (msg, match) => {
    // 'msg' is the received Message from Telegram
    // 'match' is the result of executing the regexp above on the text content
    // of the message

    const chatId = msg.chat.id
    const resp = match[1] // the captured "whatever"

    // send back the matched "whatever" to the chat
    bot.sendMessage(chatId, resp)
})

bot.onText(/\/anime (.+)/, (msg, match) => {
    const chatId = msg.chat.id
    const query = match[1]
    //console.log(query)
    let url = 'https://kitsu.io/api/edge/anime?page[limit]=5&filter[text]=' + query
    https.get(url, resp => {
        let data = ''
        resp.on("data", function (chunk) {
            data += chunk;
        })

        resp.on('end', () => {
            let dataJson = JSON.parse(data)
            let results = dataJson.data
            let finalMessage = ''
            results.forEach(result => {
                let id = result.id
                let name = result.attributes.titles.en
                let rating = result.attributes.averageRating
                let numberEpisodes = result.attributes.episodeCount
                if(name != undefined)
                    finalMessage += '*' + name + '*\nRating: ' + rating + '\nEpisodes: ' + numberEpisodes + '\n\n'
            })
            bot.sendMessage(chatId, finalMessage, {
                parse_mode: 'markdown'
            })
        })
    })
    //bot.sendMessage(chatId, 'You\'re looking for ' + query + ', right?')
})