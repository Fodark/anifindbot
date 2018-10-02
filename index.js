require('dotenv').config()

let bot = require('./bot')
require('./web')(bot)