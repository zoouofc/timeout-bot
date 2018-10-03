const discord = require('discord.js');
const conf = require('./conf.json');
const client = new discord.Client();

let timeouts = {};
let badbois = {};
let timeoutCorner, afkCorner;

client.on('ready', () => {
    console.log('Bot is ready.');
    client.user.setPresence({
        game: {
            name: 'chat',
            type: 'LISTENING'
        },
        status: 'online'
    });

    timeoutCorner = client.guilds.first().channels.find(ch => ch.name === conf['timeout-channel-name']);
    if (!timeoutCorner) {
        throw new Error('No timeout channel!');
    }
    afkCorner = client.guilds.first().channels.find(ch => ch.name === 'AFK');
});

client.on('voiceStateUpdate', (oldMember, newMember) => {
    console.log(`Voice update. newMember(${newMember.id}) in ${newMember.voiceChannelID} (toc=${timeoutCorner.id})`);
    if (badbois.hasOwnProperty(newMember.id) && newMember.voiceChannelID !== timeoutCorner.id) {
        newMember.setVoiceChannel(timeoutCorner);
    } else if (!badbois[newMember.id] && newMember.voiceChannelID === timeoutCorner.id) {
        newMember.setVoiceChannel(afkCorner);
    }
});

client.on('message', (message) => {
    if (message.channel.type !== 'text') {
        return;
    }

    console.log(`${message.channel.name}::${message.member.user.username}(${message.member.id}): ${message.content}`);
    // test <@!88551141834502144>
    if (/^T <@![0-9]+>$/.test(message.content)) {
        let user = message.mentions.users.first();
        if (user) {
            let member = message.guild.member(user);
            if (member) {
                console.log(`timeout request for member ${member.user.username} (${member.id}) by member ${message.member.user.username} (${message.member.id})`);
                if (!timeouts.hasOwnProperty(member.id)) {
                    timeouts[member.id] = {
                        _user: member.id,
                        usersInvolved: [message.member.id],
                        timer: setTimeout(() => {
                            console.log(`timeout expired for ${member.id}`);
                            delete timeouts[member.id];
                        }, conf['timeout-window'])
                     };
                } else if (timeouts[member.id].usersInvolved.indexOf(message.member.id) === -1) {
                    clearTimeout(timeouts[member.id].timer);
                    timeouts[member.id].usersInvolved.push(message.member.id);
                    if (timeouts[member.id].usersInvolved.length >= conf['min-timeouts']) {
                        // user is getting timed out now
                        delete timeouts[member.id];

                        // get the timeout channel
                        console.log(`Starting timeout on ${member.id}`);
                        member.setVoiceChannel(timeoutCorner);
                        badbois[member.id] = setTimeout(() => {
                            console.log(`Ending timeout on ${member.id}`);
                            delete badbois[member.id];
                        }, conf['timeout-length']);
                    } else {
                        timeouts[member.id].timer = setTimeout(() => {
                            console.log(`timeout expired for ${member.id}`);
                            delete timeouts[member.id];
                        }, conf['timeout-window']);
                    }
                }
            }
        }
    }
});

client.login(conf['bot-token']);
