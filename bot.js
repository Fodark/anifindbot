const token = process.env.TOKEN
const Bot = require('node-telegram-bot-api')
const getMatching = require('./lib/request').getMatching
const generateMessageBody = require('./lib/request').generateMessageBody

let bot
if (process.env.NODE_ENV === 'production') {
    bot = new Bot(token)
    bot.setWebHook(process.env.HEROKU_URL + bot.token)
} else {
    bot = new Bot(token, { polling: true })
}

console.log('Started in env: ' + process.env.NODE_ENV)

bot.on('polling_error', error => {
    console.log(error)
})

bot.on('message', (msg) => {
    const chatId = msg.chat.id
    let query
    if(msg.text) {
        query = msg.text.trim()
    } else {
        query = ''
    }
    getMatching(query, 3)
        .then(results => {
            if(!results.err) {
                results.forEach(result => {
                    let message = generateMessageBody(result)
                    bot.sendMessage(chatId, message, {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [[{
                                text: '',
                                switch_inline_query: 'share'
                            }]]
                        }
                    })
                })
            } else {
                bot.sendMessage(chatId, 'Sorry, couldn\'t understand your request')
            }
        })
        .catch(err => {
            console.log(err)
        })
    
})

bot.on('inline_query', query => {
    let searchTerm = query.query.trim()
    let queryId = query.id
    getMatching(searchTerm, 5)
        .then(results => {
            let response = []
            results.forEach(result => {
                response.push({
                    type: 'article',
                    id: result.id,
                    title: result.name,
                    description: result.synopsis,
                    thumb_url: result.thumbnail,
                    input_message_content: {
                        message_text: generateMessageBody(result),
                        parse_mode: 'Markdown'
                    }
                })
            })
            bot.answerInlineQuery(queryId, response)
        })
        .catch(err => {
            console.log(err)
        })
})

module.exports = bot