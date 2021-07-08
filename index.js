// Configures the Discord client.
const Discord = require('discord.js')
const client = new Discord.Client()

// The method that loads the store.
const store = require('./store')

// All of the currently bought upgrades.
const upgrades = require('./upgrades')

// The application token.
const { TOKEN } = require('./config.json')

// The key-value database storing all of the application data.
const Keyv = require('keyv')
const keyv = new Keyv('mongodb://localhost:27017/ssinc')
keyv.on('error', err => console.error('Keyv connection error:', err))

// The ID of the channel the bot runs on.
const CHANNEL_ID = '859076445094674454'

// The emojis to accept or deny an action.
const ACCEPT = '✅'
const DENY = '❌'

let num
let inc

/// Loads all application resources, runs the application loop.
async function main () {
  num = await keyv.get('num')
  inc = await keyv.get('inc')

  setInterval(loop, 5000)
}

main()

/// The application loop.
async function loop () {
  for (const name in upgrades) {
    await keyv.set(name, upgrades[name].bought)
  }

  await keyv.set('num', num)
  await keyv.set('inc', inc)
}

client.on('message', async message => {
  // Ignores messages on the wrong channel, or messages from bots.
  if (message.channel.id !== CHANNEL_ID || message.author.bot) { return }

  // Sends a message, deletes it 5s later.
  const sendAndDelete = async (msg, reply = false) => {
    let sentMsg
    if (reply) {
      sentMsg = await message.reply(msg)
    } else {
      sentMsg = await message.channel.send(msg)
    }

    setTimeout(() => { sentMsg.delete() }, 5000)
  }

  const msg = message.content.trim()
  const spaceIdx = msg.indexOf(' ')

  let command
  let args
  if (spaceIdx === -1) {
    command = msg
    args = ''
  } else {
    command = msg.substr(0, spaceIdx)
    args = msg.substr(spaceIdx).trim()
  }

  switch (command) {
    // Opens the store.
    case 'store': {
      await keyv.set('prevID', message.author.id)
      message.channel.send(store(num, upgrades))
      break
    }

    // Buys an upgrade.
    case 'buy': {
      // The specified upgrade does not exist.
      if (!Object.prototype.hasOwnProperty.call(upgrades, args)) {
        message.delete()
        sendAndDelete("that's not an upgrade!", true)
      }

      // If the upgrade can't be bought
      const upgrade = upgrades[args]
      if (upgrade.cost > num) return sendAndDelete("you don't have enough points for this upgrade!", true)
      if (upgrade.bought) return sendAndDelete('this upgrade has already been bought!', true)

      // Confirmation message
      const confMsg = await message.reply(`are you sure you want to buy this upgrade?\n\`\`\`${upgrade.description} Requires ${upgrade.cost} points.\`\`\``)
      await confMsg.react(ACCEPT)
      await confMsg.react(DENY)
      const rCollector = confMsg.createReactionCollector(
        (react, user) => user.id === message.author.id && (react.emoji.name === ACCEPT || react.emoji.name === DENY),
        { time: 30000 }
      )

      // Collects the reaction.
      rCollector.on('collect', async (react, _) => {
        if (react.emoji.name === ACCEPT) {
          num -= upgrade.cost
          upgrade.bought = true

          if (!upgrade.slowmode) {
            inc = upgrade.execUpgrade(inc)
            message.channel.send(`Bought! Current points: ${num} and current point gain: ${inc}`)
          } else {
            await upgrade.execUpgrade(message)
            message.channel.send(`Bought! Current points: ${num}, current point gain: ${inc} and current slowmode is ${message.channel.rateLimitPerUser}`)
          }
        } else {
          const canceledMsg = await message.channel.send('Upgrade canceled.')
          setTimeout(() => { canceledMsg.delete() }, 5000)
        }

        rCollector.stop('done')
      })

      // If no reaction is recieved.
      rCollector.on('end', async (_, msg) => {
        if (msg !== 'done') {
          sendAndDelete('Looks like there was no confirmation.')
        }

        confMsg.delete()
      })

      break
    }

    // Counts to the next number.
    default: {
      const msgNum = Number(message.content)

      // This was not a number!
      if (isNaN(msgNum)) {
        await message.delete()
        const sentMsg = await message.channel.send(`<@${message.author.id}>, that's not a number!`)
        setTimeout(async () => {
          await sentMsg.delete()
        }, 5000)
        return
      }

      // The same person can't count twice.
      if (await keyv.get('prevID') === message.author.id) {
        message.delete()
        const sentMsg = await message.reply("you can't count more than 1 time in a row!")
        setTimeout(() => { sentMsg.delete() }, 5000)
        return
      }

      if (num + inc === msgNum) {
        // We have succesfully counted to the next number!
        num = msgNum
        await keyv.set('prevID', message.author.id)
        await keyv.set('prevMsgID', message.id)
      } else {
        // You goofed up, try again.
        message.delete()
        const sentMsg = await message.reply("that's not the right number!")
        setTimeout(() => { sentMsg.delete() }, 5000)
      }
    }
  }
})

client.on('messageDelete', async message => {
  if (await keyv.get('prevMsgID') === message.id) {
    try {
      const webhook = await message.channel.createWebhook(
        message.author.username, { avatar: message.author.displayAvatarURL() }
      )
      await webhook.send(message.content)
      await webhook.delete()
    } catch (error) {
      message.channel.send('Error:' + error)
    }
  }
})

// Posts the initialization message.
client.once('ready', async () => {
  console.log(`Connected as ${client.user.tag}!`)

  const playss = await client.channels.fetch(CHANNEL_ID)
  playss.send(`Current number: ${num}, increment by ${inc}`)
})

client.login(TOKEN)
