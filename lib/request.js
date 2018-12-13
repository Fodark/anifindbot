const fetch = require('node-fetch')

let headers = {
    'Accept': 'application/json, application/vnd.api+json',
    'Accept-Charset': 'utf-8',
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

function getMatching(query, limit) {
    if(typeof query !== 'string')
        query = ''
    let results = []
    let url = `https://kitsu.io/api/edge/anime?page[limit]=${limit}&filter[text]=${query}`
    
    return fetch(url, {
        headers: headers
    })
    .then(res => {
        return res.json()
    })
    .then(data => {
        if(data.meta.count === 0) {
            throw 'Non-valid show name'
        }
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
    .catch(err => {
        return {
            err: err
        }
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
        synopsis: rawData.attributes.synopsis.split('\r')[0] + '(...)'
    }

    return show
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
    .catch(err => {
        console.log(err)
    })
}

module.exports = {
    generateMessageBody: generateMessageBody,
    getMatching: getMatching,
    generateShow: generateShow,
    getGenres: getGenres
}