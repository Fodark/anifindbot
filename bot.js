const token = process.env.TOKEN
const fetch = require('node-fetch')

const Bot = require('node-telegram-bot-api')
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

let headers = {
    'Accept': 'application/json, application/vnd.api+json',
    'Accept-Charset': 'utf-8',
}

function getGenres(url) {
    return fetch(url, { 
        headers: headers 
    })
    .then(res => {
        return res.json()
    })
    .then(data => {
        let genres = []
        data.data.forEach(elem => {
            genres.push(elem.attributes.name)
        })
        return genres
    })
}

function generateShow(rawData) {
    let name_canon = rawData.attributes.canonicalTitle
    let name_en = rawData.attributes.titles.en
    let name_en_jp = rawData.attributes.titles.en_jp
    let name_jp = rawData.attributes.titles.ja_jp

    let show = {
        id: rawData.id,
        name: name_canon || name_en || name_en_jp || name_jp,
        rating: rawData.attributes.averageRating,
        numberEpisodes: rawData.attributes.episodeCount,
        status: rawData.attributes.status,
        thumbnail: rawData.attributes.posterImage.tiny,
        thumbnail_medium: rawData.attributes.posterImage.medium,
        genres_url: rawData.relationships.genres.links.related,
        synopsis: rawData.attributes.synopsis.split('\r')[0] + '...'
    }

    return show
}

function getMatching(query, limit) {
    let results = []
    let url = `https://kitsu.io/api/edge/anime?page[limit]=${limit}&filter[text]=${query}`

    return fetch(url, {
        headers: headers
    })
    .then(res => {
        return res.json()
    })
    .then(data => {
        let genresPromises = []
        data.data.forEach(elem => {
            let show = generateShow(elem)
            results.push(show)
            genresPromises.push(getGenres(show.genres_url))
        })
        return Promise.all(genresPromises)
    })
    .then(genresPromises => {
        genresPromises.forEach((genres, index) => {
            results[index].genres = genres
        })

        return results
    })
}

function generateMessageBody(show) {
    let rating = show.rating || 'N/A'

    let message = 
        `📺 *Name:* [${show.name}](${show.thumbnail_medium})\n` +
        `✔️ *Status:* ${show.status}\n` +
        `💹 *Rating:* ${rating}\n` +
        `#️⃣ *Episodes:* ${show.numberEpisodes}\n` +
        `❇️ *Genres:* ${show.genres.toString()}\n` +
        `📚 *Synopsis:* ${show.synopsis}`

    return message
}

bot.on('message', (msg) => {
    const chatId = msg.chat.id
    let query = msg.text.trim()
    getMatching(query, 3)
    .then(results => {
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
})

module.exports = bot