const fs = require('fs');

class UnderNet extends global.Discord.Client {
    constructor() {
        super({
            retryLimit: 30,
            disableMentions: 'everyone'
        });
        this.config = require('./config.json');

        this.connectedChannels = this.config.channels;
        this.hooks = new Map();
        this.messages = new Map();
        this.parentMessageId = new Map();

        super.login(this.config.token);
        this.once('ready', async () => {
            for (let i = 0; i < this.connectedChannels.length; ++i) {
                const channel = this.channels.resolve(this.connectedChannels[i]),
                    hooks = await channel.fetchWebhooks(),
                    hA = Array.from(hooks);
                for (let j = 0; j < hA.length; ++j) {
                    if (hA[j][1].owner.id == this.user.id) {
                        this.hooks.set(this.connectedChannels[i], hA[j][1]);
                        break;
                    }
                }

                if (!this.hooks.has(this.connectedChannels[i])) {
                    const hook = await channel.createWebhook('CollabChannelhook', {
                        avatar: this.user.avatarURL
                    });
                    this.hooks.set(this.connectedChannels[i], hook);
                }
            };
            fs.readdir('./events/', (err, events) => {
                if (err) throw err;
                for (let i = 0; i < events.length; ++i) {
                    const ev = require('./events/' + events[i]);
                    this.on(events[i].split('.js')[0], ev.run);
                }
                console.log("online!");
            });
        });
    }

    getMemberInfo = (userId, guildId) => {
        return new Promise((resolve) => {
            this.users.fetch(userId).then(user => {
                const data = {
                    avatar: user.avatarURL({
                        format: 'png',
                        dynamic: true,
                        size: 512
                    }),
                    name: user.username
                };

                if (guildId) {
                    const member = this.guilds.cache.get(guildId).member(user);
                    if (member && member.nickname) data.name = member.nickname;
                }
                resolve(data)
            });
        });
    };

    sendHookMessage = (channelId, userId, msg) => {
        return new Promise(async (resolve, reject) => {
            const hook = this.hooks.get(channelId),
                channel = this.channels.resolve(channelId),
                user = await this.getMemberInfo(userId, channel.guild.id),
                data = {
                    username: user.name,
                    avatarURL: user.avatar,
                    embeds: msg.embeds,
                    tts: false,
                    split: {
                        maxLength: 2000
                    }
                };
            if (msg.attachments.size) {
                data.files = Array.from(msg.attachments).map(a => a[1].proxyURL);
            }

            // note that the '** **' produces a space since
            // the discord.js library makes the promise resolve to undefined
            // if no characters are sent
            hook.send(msg.content || '** **', data)
                .then(resolve)
                .catch(reject);
        });
    };


};

module.exports = UnderNet;