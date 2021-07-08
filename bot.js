const Discord = require('discord.js');
const client = new Discord.Client();
const upgrades = require('./upgrades')
const { token } = require('./config.json')

const Keyv = require('keyv');
const keyv = new Keyv('mongodb://localhost:27017/ssinc');
keyv.on('error', err => console.error('Keyv connection error:', err));

async function main() {

    for (upgrade in upgrades) {
        upgrades[upgrade].bought = await keyv.get(upgrade)
    }

    num = await keyv.get('num')
    inc = await keyv.get('inc')

    setInterval(async () => {
        for (upgrade in upgrades) {
            await keyv.set(upgrade, upgrades[upgrade].bought)
        }

        await keyv.set('num', num)
        await keyv.set('inc', inc)
    }, 5000)
}
main()
let { num, inc } = main

client.on('message', async message => {
    if (message.channel.name.toLowerCase().trim() !== 'playss' || message.author.bot) return

    const sendAndDelete = async (m, c = false) => {
        let sentMsg;
        if (c) sentMsg = await message.reply(m)
        else sentMsg = await message.channel.send(m)
        setTimeout(() => { sentMsg.delete() }, 5000)
    }

    let args = message.content.toLowerCase().trim().split(/ +/)
    const command = args.shift()

    if (command === 'store') {
        let store = '';
        let notftl = [];
        for (upgrade in upgrades) {
            if (upgrades[upgrade].cost <= num && !upgrades[upgrade].bought) store += `\`\`\`${upgrades[upgrade].description} Requires ${upgrades[upgrade].cost} points.\`\`\`\n`
            notftl.push(upgrades[upgrade])
        }
        if (!store) store = '```Nothing Available!```\n'

        const biggerUpgrades = notftl.filter(upgrade => upgrade.cost > num);
        let biggerCosts = [];
        for (upgrade of biggerUpgrades) biggerCosts.push(upgrade.cost)
        const nextCost = Math.min(...biggerCosts);
        const nextUpgrades = biggerUpgrades.filter(upgrade => upgrade.cost === nextCost && !upgrade.bought)
        if (nextUpgrades.length === 1) store += 'Next upgrade: ' 
        else if (nextUpgrades.length > 1) store += 'Next upgrades: '
        for (upgrade of nextUpgrades) {
            if (nextUpgrades.length === 1) { store += `${upgrade.name}: requires ${upgrade.cost} points.` }
            else if (nextUpgrades.length > 1) {
                store += `, ${upgrade.name}: requires ${upgrade.cost} points`
            }
        }
        if (nextUpgrades.length > 1) {
            store = store.replace(', ', '');
            store += '.';
        }
        await keyv.set('prevID', message.author.id)
        return message.channel.send(store)
    }

    if (command === 'buy') {
        if (!upgrades.hasOwnProperty(args.join(' '))) {
            message.delete();
            return sendAndDelete("that's not an upgrade!", true)
        }

        let upgrade;
        for (upg in upgrades) {
            if (upg = args.join(' ')) { upgrade = upgrades[upg] }
        }
        if (upgrade.cost > num) return sendAndDelete("you don't have enough points for this upgrade!", true)
        if (upgrade.bought) return sendAndDelete('this upgrade has already been bought!', true)
        
        const confMsg = await message.reply(`are you sure you want to buy this upgrade?\n\`\`\`${upgrade.description} Requires ${upgrade.cost} points.\`\`\``)
        await confMsg.react('✅')
        await confMsg.react('❌')
        const rCollector = confMsg.createReactionCollector((r, u) => (r.emoji.name === '✅' || r.emoji.name === '❌') && u.id === message.author.id, { time: 30000 })
        rCollector.on('collect', async (r, u) => {
            if (r.emoji.name === '✅') {
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
                setTimeout(() => {canceledMsg.delete()}, 5000)
            }
            rCollector.stop('done')
        })
        rCollector.on('end', async (c,r) => { 
            if (r !== 'done') {
                sendAndDelete('Looks like there was no confirmation.')
            }
            confMsg.delete()
        })
        return
    }

    if (!message.content.match(/^(\d+)/)) {
        await message.delete()
        const sentMsg = await message.channel.send(`<@${message.author.id}>, that's not a number!`)
        setTimeout(async () => {
            await sentMsg.delete();
        }, 5000)
        return
    }

    const prevID = await keyv.get('prevID')

    if (prevID === message.author.id) {
        message.delete();
        const sentMsg = await message.reply("you can't count more than 1 time in a row!")
        setTimeout(() => { sentMsg.delete() }, 5000)
        return
    }

    const msgNum = Number(message.content.match(/^(\d+)/)[0])

    if (num + inc === msgNum) {
        num = msgNum
        await keyv.set('prevID', message.author.id)
        await keyv.set('prevMsgID', message.id)
    } else {
        message.delete()
        const sentMsg = await message.reply("that's not the right number!")
        setTimeout(() => { sentMsg.delete() }, 5000)
    }
});

client.on('messageDelete', async message => {
    if (await keyv.get('prevMsgID') === message.id) {
        try {
			const webhook = await message.channel.createWebhook(message.author.username, { avatar: message.author.displayAvatarURL() })
			await webhook.send(message.content)
			await webhook.delete()
		} catch(error) {
			message.channel.send('Error:' + error)
		}
    }
})

client.once('ready', async () => {
    console.log(`Connected as ${client.user.tag}!`)

    const playss = await client.channels.fetch('859076445094674454')
    playss.send(`Current number: ${num}, increment by ${inc}`)
});

client.login(token);