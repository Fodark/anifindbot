require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api')
let Promise = require('bluebird')
let rp = require('request-promise')

let token = process.env.BOT_TOKEN

const bot = new TelegramBot(token, { polling: true })

bot.on('polling_error', error => {
    console.log(error)
})

function getGenres(url) {
    var options = {
        method: 'GET',
        url: url,
        headers: {
            'Accept': 'application/json, application/vnd.api+json',
            'Accept-Charset': 'utf-8',
        }
    }
    return rp(options)
}

function getInfos(chatId, query, callback) {
    let url = 'https://kitsu.io/api/edge/anime?page[limit]=5&filter[text]=' + query

    var options = {
        url: url,
        method: 'GET',
        headers: {
            'Accept': 'application/json, application/vnd.api+json',
            'Accept-Charset': 'utf-8',
        }
    }
    let entries = []
    rp(options).then(response => {
        let obj = JSON.parse(response)
        let promises = []
        obj.data.forEach((entry, index) => {
            let id = entry.id
            let name = entry.attributes.titles.en
            let name_en_jp = entry.attributes.titles.en_jp
            let name_jp = entry.attributes.titles.ja_jp
            let rating = entry.attributes.averageRating
            let numberEpisodes = entry.attributes.episodeCount
            let status = entry.attributes.status

            let singleShow = {
                id: id,
                name: name || name_en_jp || name_jp,
                rating: rating,
                episodes: numberEpisodes,
                status: status
            }

            entries[index] = singleShow
            promises.push(getGenres(entry.relationships.genres.links.related))
        })

        return Promise.all(promises)
    })
        .then(presponse => {
            presponse.forEach((entry, index) => {
                let obj = JSON.parse(entry)
                let genres = []
                obj.data.forEach(genre => {
                    genres.push(genre.attributes.name)
                })
                entries[index].genres = genres
            })
            callback(chatId, entries)
        })
}

function sendInChat(chatId, entries) {
    let messageBody = ''
    entries.forEach(entry => {
        messageBody += '*' + entry.name + '*\nStatus: ' + entry.status
            + '\nRating: ' + (entry.rating ? entry.rating : 'N/A') + '\nEpisodes: ' + entry.episodes + '\nGenres: '
        entry.genres.forEach((genre, subindex) => {
            messageBody += genre + (subindex !== (entry.genres.length - 1) ? ', ' : '')
        })
        messageBody += '\n\n'
    })
    bot.sendMessage(chatId, messageBody, {
        parse_mode: 'Markdown'
    })
}

function answerInline(queryid, entries) {
    let results = []
    let messageBody = ''
    entries.forEach(element => {
        messageBody = ''
        messageBody += '*' + element.name + '*\nStatus: ' + element.status
            + '\nRating: ' + (element.rating ? element.rating : 'N/A') + '\nEpisodes: ' + element.episodes + '\nGenres: '
        element.genres.forEach((genre, subindex) => {
            messageBody += genre + (subindex !== (element.genres.length - 1) ? ', ' : '')
        })

        results.push({
            type: 'article',
            id: element.id,
            title: element.name,
            input_message_content: {
                message_text: messageBody,
                parse_mode: 'Markdown'
            }
        })
    })
    bot.answerInlineQuery(queryid, results)
}

bot.onText(/\/anime (.+)/, (msg, match) => {
    const chatId = msg.chat.id
    const query = match[1]

    getInfos(chatId, query, sendInChat)
})

bot.on('inline_query', query => {
    let searchTerm = query.query.trim()
    getInfos(query.id, searchTerm, answerInline)
})