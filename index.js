require('dotenv').config();

const path = require('path');
const fs = require('fs'); // 파일 시스템 모듈 가져오기
const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});

const { Partials,  Client, GatewayIntentBits, escapeBulletedList} = require('discord.js');
const OpenAI = require('openai');
const { Client: NotionClient } = require('@notionhq/client');

class OpenAIService {
    constructor(apiKey) {
        this.openai = new OpenAI({ apiKey });
    }

    async getResponse(messages) {
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4.1',
            messages: messages,
        });
        return response.choices[0].message.content;
    }

    buildInitialOpenAIMessages() {
        return [
            {
                role: 'system',
                content: `너는 디스코드 내에 존재하는 챗봇이고,
                너의 이름은 애플핑이야.
                사과방의 핑거 프로텍터 라는 뜻이지.
                너는 다정하고 깜찍하고 활기찬 말투의 소유자야.`
            }
        ];
    }
}

const IAM_FINDER_CH_ID = '1346330549731721298';
const CHALLENGE_CH_ID = '1348486199257600000';
const LOUNGE_TALK_CH_ID = '1346332258759475290';
const FLEA_MARKET_CH_ID = '1346332310211006534';
const FINDERS_STAGE_CH_ID = '1348485773963427851';
const GATHERING_CH_ID = '1346332405174243369';
const THINK_CH_ID = '1144159465449467974';
const INTERVIEW_CH_ID = '1346331812863148114';
const INTERVIEW_ZIP_CH_ID = '1346332033424687114';

const GOODMORNING_CH_ID = '1346332674322731089';
const SMALL_TRY_CH_ID = '1346333285814505502';
const SMALL_TALK_CH_ID = '1346333747544588308';
const AFTER_TALK_CH_ID = '1346333867002302596';

const DEFAULT_CHANNEL_NAME = '사과';
const DEFAULT_CHANNEL_EMOJI = '🍎';

const CHANNEL_COUNT = 12;
const channelMap = {
    "1346334076126232576": "블루베리",
    "1346334969479303190": "망고",
    "1346335023015530506": "토마토",
    "1346335090422186004": "귤",
    "1346335210710503466": "포도",
    "1346335262535323688": "복숭아",
    "1346335320953847838": "올리브",
    "1346335378864341042": "체리",
    "1346335433591623824": "사과",
    "1346335484259074069": "레몬",
    "1346335536415248405": "아보카도",
    "1346335585975140352": "라임"
};

class DiscordBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildMessageTyping,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildWebhooks,
                GatewayIntentBits.GuildInvites,
                GatewayIntentBits.GuildIntegrations,
                GatewayIntentBits.GuildScheduledEvents,
            ],
            partials: [
                Partials.Channel,
                Partials.Message,
                Partials.User,
                Partials.GuildMember,
                Partials.Reaction,
                Partials.ThreadMember
            ]
        });

        this.openAIService = null;
        this.userMessages = [];
        this.channelName = DEFAULT_CHANNEL_NAME;
        this.channelEmoji = DEFAULT_CHANNEL_EMOJI;

        this.notion = new NotionClient({
            auth: process.env.NOTION_TOKEN,
        });
    }

    async getUserDatabase(userName) {
        try {
            // 사용자의 데이터베이스 검색
            const response = await this.notion.search({
                query: `${userName}님의 디스코드 활동 기록`,
                filter: {
                    property: 'object',
                    value: 'database'
                }
            });

            if (response.results.length > 0) {
                return response.results[0];
            }
            return null;
        } catch (error) {
            console.error('Error getting user database:', error);
            return null;
        }
    }

    async start() {
        await this.client.login(process.env.DISCORD_TOKEN);

        this.openAIService = new OpenAIService(process.env.OPENAI_API_KEY);

        for (let ch = 0; ch <= CHANNEL_COUNT; ch++) {
            const keys = Object.keys(channelMap);
            const ChId = keys[ch];
            const ChName = channelMap[ChId];

            const prompt = [{
                    role: 'system',
                    content: `너는 디스코드 내에 존재하는 챗봇이고,
                    너의 이름은 ${ChName}핑이야.
                    ${ChName}방의 핑거 프로텍터 라는 뜻이지.
                    너는 다정하고 깜찍하고 활기찬 말투의 소유자야.`
                }];
            this.userMessages[ch] = prompt;
        }

        this.client.once('ready', () => {
            console.log(`Logged in as ${this.client.user.tag}`);
            console.log('Bot is ready!');
        });

        this.client.on('messageCreate', (message) => this.handleMessage(message));
    }

    async handleMessage(message) {
        if (message.author.bot) return; // 봇 메시지는 무시

        // 1. Channel Message 처리
        if (message.content.startsWith('!today')) {
            message.reply("오늘 올라온 게시글을 열심히 모으고 있습니다! 잠시만 기다려주세요:heart: ");
            await this.ShowTodayPosts(message);
        } else if (message.content.startsWith('!chat')) {
            message.reply("오늘의 대화를 열심히 요약하고 있습니다! 잠시만 기다려주세요:heart: ");
            await this.handleSumMessage(message);
        } else if (message.content.startsWith('<@1350718874672435270>')) {
            await this.handleAskMessage(message);
        } else if (message.mentions.repliedUser != null) {
            if (message.mentions.repliedUser.id == '1350718874672435270') {
                await this.handleAskMessage(message);
            }
        } else if (message.content.startsWith('!finder')) {
            const userName = message.content.split(" ")[1];

            if (userName == undefined) {
                message.reply(":see_no_evil:에러발생:see_no_evil:\n!finder 이름 형식으로 입력해주세요!\n ex) !finder 은지캉");
            } else {
                await this.GetIamFinderPosts(message, userName);
            }
        } else if (message.content.startsWith('!update')) {
            message.reply("Discord 데이터를 업데이트하고 있습니다! 잠시만 기다려주세요:heart:");
            await this.updateDiscordData();
        } else if (message.content.startsWith('!report')) {
            message.reply("메시지를 노션으로 옮기고 있습니다! 잠시만 기다려주세요:heart:");
            await this.exportToNotion(message);
        }
    }

    async ShowTodayPosts(message) {
        let replyMessage = `${this.channelEmoji}오늘 파인클에 새로 올라온 게시물이에요!${this.channelEmoji}\n\n`

        replyMessage += await this.GetChannelResponse(message, IAM_FINDER_CH_ID, '[🤗｜아임파인더]\n');
        replyMessage += await this.GetChannelResponse(message, CHALLENGE_CH_ID, '[:parachute:｜파인딩 첼린지]\n');
        replyMessage += await this.GetChannelResponse(message, LOUNGE_TALK_CH_ID, '[🎙｜라운지토크]\n');
        replyMessage += await this.GetChannelResponse(message, FLEA_MARKET_CH_ID, '[💞｜재능플리마켓]\n');
        replyMessage += await this.GetChannelResponse(message, "1348485773963427851", '[🎤｜파인더스 스테이지]\n');
        replyMessage += await this.GetChannelResponse(message, "1346332405174243369", '[:raised_back_of_hand:｜게릴라게더링]\n');
        replyMessage += await this.GetChannelResponse(message, "1144159465449467974", '[🤔｜고민상담소]\n');
        
        message.reply(replyMessage);
    }

    async GetChannelResponse(message, ch, outputMessage) {
        const posts = await this.getTodayPosts(ch);
        let responses = ''

        if (posts.length == 0) return responses;

        responses += outputMessage;
        responses += await this.GetSummerizedPosts(message, ch, posts);
        return responses;
    }

    async GetSummerizedPosts(message, ch, posts) {
        return await Promise.all(posts.map(async (post) => {

        const currentChannelId = message.channelId;
        const fetchedChannel = await this.client.channels.fetch(currentChannelId);

        let currentChannelName = fetchedChannel.name;
        let currentChannelEmoji = DEFAULT_CHANNEL_EMOJI;
        
        if (channelMap.hasOwnProperty(currentChannelId)) {
            currentChannelName = channelMap[currentChannelId];
            currentChannelEmoji = getChannelEmoji(fetchedChannel.name);
        }

        // 2. 방 챗봇 페르소나 설정
        const openAIprompt = [
            {
                role: 'system',
                content: `너는 디스코드 내에 존재하는 챗봇이고,
                너의 이름은 ${currentChannelName}핑이야.
                ${currentChannelName}의 핑거 프로텍터 라는 뜻이지${currentChannelEmoji}.
                너는 다정하고 깜찍하고 활기찬 말투의 소유자야.`
            }
        ];

            openAIprompt.push({
                role: 'user',
                content: `다음 글에서 주제, 내용, 날짜, 장소를 간략하게 요약해줘. 해당 정보가 없다면 해당 정보는 생략해줘. 
                예시1)
                * 주제: 최애를 소개하는 라운지 토크
                * 내용: 사과방 지구가 좋아하는 것을 소개하고, 다른 사람들의 취향을 살펴보며 공유하는 시간 (최대 3줄 정도 요약해주세요.)
                * 날짜: 4/5(토) 오후 8시
                * 장소: 온라인(디스코드)
                
                예시2)
                * 주제: 고양이와 함께하는 삶
                * 내용:
                    * 함께하는 고양이의 귀여움과 희노애락을 나누는 시간
                    * 각자의 고양이를 소개하고 만나게 된 이야기 공유
                    * 좋아하는 순간을 함께 나누는 팔불출 타임
                * 날짜: 4/5(토) 오후 9시
                * 장소: 온라인(디스코드)
                
                예시3)
                * 주제: 감사 챌린지 참여를 위한 온라인 그룹
                * 내용: 긍정적인 마음가짐을 위해 매일 감사한 일을 공유하고 서로 응원하는 소규모 그룹 활동
                * 날짜: 
                    * 챌린지 기간 : 3월 31일(월) ~ 4월 30일(수)
                    * OT 모임 : 3/30(일) 오후 8시
                * 장소: 온라인

                예시4)
                * 주제: 감사 챌린지 참여를 위한 온라인 그룹
                * 내용: 긍정적인 마음가짐을 위해 매일 감사한 일을 공유하고 서로 응원하는 소규모 그룹 활동

                다음은 요약할 글 정보입니다. 
                ${post.content}`
            });

            let summerizedContent = '';
            if (ch != IAM_FINDER_CH_ID) {
                summerizedContent = await this.openAIService.getResponse(openAIprompt);
            }
            return `${post.link} - ${post.author}\n${summerizedContent}\n\n`;
        }));
    }

    async GetIamFinderPosts(message, userName) {
        const link = await this.getLinkByAuthorFromJson(userName); // 포럼 게시글 가져오기

        if (link == null)
        {
            message.reply("아임파인더 정보를 찾지 못했어요:face_holding_back_tears:");
            return;
        }

        let replyMessage = `:gift_heart: ${userName}님의 아임파인더 :gift_heart:\n`
        replyMessage += `${link}\n`;

        message.reply(replyMessage);
    }

    async getLinkByAuthorFromJson(author) {
        try {
            const filePath = path.join(__dirname, 'threadData.json'); // 파일 경로 설정
            const data = await fs.promises.readFile(filePath, 'utf8'); // JSON 파일 읽기
            const jsonData = JSON.parse(data); // JSON 문자열을 객체로 변환
    
            const entry = jsonData.find(item => item.author === author); // author에 해당하는 항목 찾기
            return entry ? entry.link : null; // 링크 반환
        } catch (error) {
            console.error('오류 발생:', error);
            return null;
        }
    }

    async makeImFinderJSON() {
        const channel = await this.client.channels.fetch(IAM_FINDER_CH_ID);
        let activeThreads = await channel.threads.fetchActive();
        let archivedThreads = await channel.threads.fetchArchived();
    
        const threadData = [];
    
        for (const thread of activeThreads.threads.values()) {
            const starterMessage = await thread.fetchStarterMessage();
            
            threadData.push({
                author: starterMessage.author.globalName,
                link: `https://discord.com/channels/${thread.guild.id}/${thread.id}`
            });
        }
    
        for (const thread of archivedThreads.threads.values()) {
            const starterMessage = await thread.fetchStarterMessage();
            
            threadData.push({
                author: starterMessage.author.globalName,
                link: `https://discord.com/channels/${thread.guild.id}/${thread.id}`
            });
        }

        console.log(threadData);

        // Define the path for the JSON file
        const filePath = path.join(__dirname, 'threadData.json');
    
        // Write data to JSON file
        fs.writeFileSync(filePath, JSON.stringify(threadData, null, 2), 'utf-8');
    
        console.log(`Data has been saved to ${filePath}`);
    }


    async fetchThreadsForFindUser(forumChannelId, filterFunc = null) {
        const channel = await this.client.channels.fetch(forumChannelId);
        let Activethreads = await channel.threads.fetchActive(); // 활성화된 스레드 가져오기 (활성화가 안되어있나보다)
        let archivedThreads = await channel.threads.fetchArchived()

        const threadData = [];
    
        for (const thread of Activethreads.threads.values()) { // for...of 루프 사용
            const starterMessage = await thread.fetchStarterMessage(); // 스레드의 시작 메시지를 가져오기
            
            if (filterFunc) {
                // Today 넘어가면 종료
                if(filterFunc(thread))
                {
                    threadData.push({
                        id: thread.id,
                        title: thread.name,
                        author: starterMessage.author.globalName,
                        content: starterMessage.content, // 메시지 내용
                        link: `https://discord.com/channels/${thread.guild.id}/${thread.id}`
                    });

                    break;
                }
            }
        }
    
        return threadData;
    }

    async handleAskMessage(message) {
        const userMessageContent = this.extractUserMessage(message.content);

    // 1. 채팅방 페르소나 설정
    const currentChannelId = message.channelId;
    const fetchedChannel = await this.client.channels.fetch(currentChannelId);
    let MessageIndex = 8;
    
    const keys = Object.keys(channelMap);
    const index = keys.indexOf(currentChannelId);

    if (index !== -1) {
        MessageIndex = index;
    }

        this.userMessages[MessageIndex].push({ 
            role: 'user', 
            content: userMessageContent });

        const response = await this.openAIService.getResponse(this.userMessages[MessageIndex]);

        this.userMessages[MessageIndex].push({ 
            role: 'assistant', 
            content: response });

        this.replyToMessage(message, response);
    }

    async handleSumMessage(message) {
        // 1. 채팅방 메세지 파싱
        const currentChannelId = message.channelId;
        const userMessageContent = await this.loadMessages(currentChannelId);
        const fetchedChannel = await this.client.channels.fetch(currentChannelId);

        let currentChannelName = fetchedChannel.name;
        let currentChannelEmoji = DEFAULT_CHANNEL_EMOJI;
        
        if (channelMap.hasOwnProperty(currentChannelId)) {
            currentChannelName = getSimpleChannelName(fetchedChannel.name);
            currentChannelEmoji = getChannelEmoji(fetchedChannel.name);
        }

        // 2. 방 챗봇 페르소나 설정
        const openAIMessages = [
            {
                role: 'system',
                content: `너는 디스코드 내에 존재하는 챗봇이고,
                너의 이름은 ${currentChannelName}핑이야.
                ${currentChannelName}의 핑거 프로텍터 라는 뜻이지${currentChannelEmoji}.
                너는 다정하고 깜찍하고 활기찬 말투의 소유자야.`
            }
        ];

        // 3. user의 호출 message 추출
        openAIMessages.push({
            role: 'user',
            content: `다음은 '${currentChannelName}방'의 대화 내용입니다. 
            하루 간 오고간 대화 내용을 2~3줄 정도로 요약해주세요. 
            추천하는 항목과 함께 링크가 첨부되어있으면, 해당 링크도 같이 정리해서 첨부해주세요. 
            요런 리스트로 해당하는 내용이 없다면, 그냥 간략하게만 요약하셔도 됩니다. 다정하게 얘기해주세요!            
            다음은 답변 예시입니다. 닉네임뒤에는 꼭 '님'을 붙여주세요.

            오늘 대화 요약 (3월 28일)

            1. 신나는 챗봇 소식: 은지캉님이 새로운 챗봇을 소개하며 회원들로부터 많은 관심과 격려를 받았어요! 특별한 기능에 대한 아이디어를 나누는 쓰레드도 안내했답니다.
             - 아이디어 제안 링크: 챗봇 아이디어 쓰레드
            2. 빵 추천: 지구님이 판교의 타르틴 빵에 대한 추억을 돌아보며 다른 회원들과 맛있는 빵에 대한 대화를 나누었어요!
            3. 음악 공유 및 추천: 뜸돌이님이 회원들과 함께 듣기 좋은 노래를 공유하며, 짧은 감상을 나눴어요. 특히 '웨이브 투 어스'의 'Sunny Days'가 추천되었습니다! 🌞
             - 추천곡 링크: 웨이브 투 어스 - Sunny Days
            4. 명상 및 자기개발: 뜸돌이님이 명상 소식을 전하며, 불안과 우울에서 벗어나자는 메시지를 전했어요!
            5. 일상 이야기: 지구님과 다니님이 비 오는 날의 에피소드를 나누며 저마다의 추억을 공유했답니다. 🌧️

            [추천 링크] (대화방에서 오고간 링크들 총정리해서 보여주세요. 이 메세지는 출력하지 마세요 ㅠ)
            - URL1
            - URL2

            이렇게 오늘도 서로의 경험과 인사이트를 나누며 소중한 시간을 보냈답니다! 다음에도 재미있는 이야기를 많이 나눠요! 💖✨

            다음은 ${currentChannelName}방의 대화 내용입니다!
            ${userMessageContent}`
        });

        // 4. OpenAI 응답 받아오기
        let response = `${currentChannelEmoji} 오늘의 ${currentChannelName}방 대화요약 ${currentChannelEmoji} \n`;
        response += await this.openAIService.getResponse(openAIMessages);
        this.replyToMessage(message, response);
    }

    async getTodayPosts(forumChannelId) {
        const today = new Date();
        const isToday = (thread) => {
            const threadCreatedAt = new Date(thread.createdAt);
            return isSameDate(threadCreatedAt, today);
        };

        return await this.fetchThreads(forumChannelId, isToday);
    }

    async getIamFinder(forumChannelId) {
        return await this.fetchThreads(forumChannelId);
    }

    async fetchThreads(forumChannelId, filterFunc = null) {
        const channel = await this.client.channels.fetch(forumChannelId);
        const threads = await channel.threads.fetchActive(); // 활성화된 스레드 가져오기
        const threadData = [];

        for (const thread of threads.threads.values()) { // for...of 루프 사용
            const starterMessage = await thread.fetchStarterMessage(); // 스레드의 시작 메시지를 가져오기
            
            if (filterFunc) {
                // Today 넘어가면 종료
                if(!filterFunc(thread))
                {
                    break;
                }
            }

            threadData.push({
                id: thread.id,
                title: thread.name,
                author: starterMessage.author.globalName,
                content: starterMessage.content, // 메시지 내용
                link: `https://discord.com/channels/${thread.guild.id}/${thread.id}`
            });
        }

        return threadData;
    }

    async loadMessages(channelId) {
        const FetchedChannel = await this.client.channels.fetch(channelId);
        const today = new Date();

        let fetchedMessages;
        let todaysChatData = [];

        let escape = false;

        do {
            fetchedMessages = await FetchedChannel.messages.fetch({ limit: 100 });

            fetchedMessages.forEach(msg => {
                const msgCreatedDate = new Date(msg.createdTimestamp);
                if (isSameDate(msgCreatedDate, today)) {
                    if (!msg.author.bot) {
                        todaysChatData.push(`${msg.author.globalName} : ${msg.content} `);
                    }
                }
                else {
                    escape = true;
                }
            });
        } while (fetchedMessages.size === 100 && escape == false);

        return todaysChatData;
    }

    extractUserMessage(content) {
        return content.split(' ').slice(1).join(' '); // "!ask " 또는 "!sum " 이후의 내용
    }

    replyToMessage(message, response) {
        message.reply(response);
    }

    async updateDiscordData() {
        try {
            const channelIds = [
                { id: CHALLENGE_CH_ID, name: '파인딩-챌린지' },
                { id: LOUNGE_TALK_CH_ID, name: '라운지토크' },
                { id: FLEA_MARKET_CH_ID, name: '재능플리마켓' },
                { id: FINDERS_STAGE_CH_ID, name: '파인더스 스테이지' },
                { id: GATHERING_CH_ID, name: '게릴라-게더링' },
                { id: THINK_CH_ID, name: '고민상담소' },
                { id: INTERVIEW_CH_ID, name: '1:1인터뷰' },
                { id: INTERVIEW_ZIP_CH_ID, name: '1:1인터뷰집' },
            ];

            const allChannelData = {};

            for (const channel of channelIds) {
                try {
                    const channelData = await this.collectChannelMessages(channel.id);
                    allChannelData[channel.id] = {
                        name: channel.name,
                        messages: channelData
                    };
                    console.log(`${channel.name} 채널의 메시지 ${channelData.length}개가 저장되었습니다.`);
                } catch (error) {
                    console.error(`${channel.name} 채널 데이터 수집 중 오류 발생:`, error);
                }
            }

            // JSON 파일로 저장
            const cachePath = path.join(__dirname, 'discordData.json');
            await fs.promises.writeFile(cachePath, JSON.stringify(allChannelData, null, 2));
            console.log('Discord 데이터가 성공적으로 업데이트되었습니다.');

        } catch (error) {
            console.error('Discord 데이터 업데이트 중 오류 발생:', error);
        }
    }

    async collectChannelMessages(channelId) {
        const messages = [];
        const channel = await this.client.channels.fetch(channelId);
        if (!channel) return messages;

        // 스레드 처리
        if (channel.threads) {
            const activeThreads = await channel.threads.fetchActive();
            const archivedThreads = await channel.threads.fetchArchived();

            for (const thread of [...activeThreads.threads.values(), ...archivedThreads.threads.values()]) {
                try {
                    const starterMessage = await thread.fetchStarterMessage();
                    const threadMessages = await thread.messages.fetch({ limit: 100 });
                    
                    const threadContent = {
                        id: thread.id,
                        name: thread.name,
                        starterMessage: {
                            id: starterMessage.id,
                            author: starterMessage.author.globalName,
                            content: starterMessage.content,
                            timestamp: starterMessage.createdTimestamp
                        },
                        messages: []
                    };

                    // 먼저 모든 메시지를 저장
                    for (const message of threadMessages.values()) {
                        if (message.id !== starterMessage.id) {
                            const messageData = {
                                id: message.id,
                                author: message.author.globalName,
                                content: message.content,
                                timestamp: message.createdTimestamp,
                                replies: []
                            };
                            threadContent.messages.push(messageData);
                        }
                    }

                    // 답글 관계 처리
                    for (const message of threadMessages.values()) {
                        if (message.id !== starterMessage.id && message.reference) {
                            try {
                                const referencedMessageId = message.reference.messageId;
                                const originalMessage = threadContent.messages.find(m => m.id === referencedMessageId);
                                const replyMessage = threadContent.messages.find(m => m.id === message.id);

                                if (originalMessage && replyMessage) {
                                    // 원본 메시지에 답글 정보 추가
                                    if (!originalMessage.replies) {
                                        originalMessage.replies = [];
                                    }
                                    originalMessage.replies.push({
                                        id: replyMessage.id,
                                        author: replyMessage.author,
                                        content: replyMessage.content,
                                        timestamp: replyMessage.timestamp
                                    });

                                    // 답글 메시지에 원본 정보 추가
                                    replyMessage.originalMessage = originalMessage.content;
                                    replyMessage.originalAuthor = originalMessage.author;
                                }
                            } catch (error) {
                                console.error(`답글 관계 처리 중 오류 발생:`, error);
                            }
                        }
                    }

                    messages.push(threadContent);
                } catch (error) {
                    console.error(`스레드 메시지 수집 중 오류 발생:`, error);
                }
            }
        }

        // 일반 메시지 처리
        if (channel.type !== 15) { // 15는 포럼 채널 타입
            try {
                const channelMessages = await channel.messages.fetch({ limit: 100 });
                const channelContent = {
                    id: channel.id,
                    name: channel.name,
                    starterMessage: null,
                    messages: []
                };

                // 먼저 모든 메시지를 저장
                for (const message of channelMessages.values()) {
                    const messageData = {
                        id: message.id,
                        author: message.author.globalName,
                        content: message.content,
                        timestamp: message.createdTimestamp,
                        replies: []
                    };
                    channelContent.messages.push(messageData);
                }

                // 답글 관계 처리
                for (const message of channelMessages.values()) {
                    if (message.reference) {
                        try {
                            const referencedMessageId = message.reference.messageId;
                            const originalMessage = channelContent.messages.find(m => m.id === referencedMessageId);
                            const replyMessage = channelContent.messages.find(m => m.id === message.id);

                            if (originalMessage && replyMessage) {
                                // 원본 메시지에 답글 정보 추가
                                if (!originalMessage.replies) {
                                    originalMessage.replies = [];
                                }
                                originalMessage.replies.push({
                                    id: replyMessage.id,
                                    author: replyMessage.author,
                                    content: replyMessage.content,
                                    timestamp: replyMessage.timestamp
                                });

                                // 답글 메시지에 원본 정보 추가
                                replyMessage.originalMessage = originalMessage.content;
                                replyMessage.originalAuthor = originalMessage.author;
                            }
                        } catch (error) {
                            console.error(`답글 관계 처리 중 오류 발생:`, error);
                        }
                    }
                }

                messages.push(channelContent);
            } catch (error) {
                console.error(`일반 채널 메시지 수집 중 오류 발생:`, error);
            }
        }

        return messages;
    }

    async createUserDatabase(userName) {
        try {
            // 1. 기존 DB의 스키마 가져오기
            const templateDb = await this.notion.databases.retrieve({
                database_id: process.env.NOTION_DATABASE_ID,
            });

            // 템플릿 DB 속성 로깅
            console.log('Template DB Properties:', JSON.stringify(templateDb.properties, null, 2));

            // 2. 속성 복사
            const properties = {};
            for (const [key, value] of Object.entries(templateDb.properties)) {
                // 각 속성 타입에 따른 처리
                switch (value.type) {
                    case 'title':
                        properties[key] = { type: 'title', title: {} };
                        break;
                    case 'rich_text':
                        properties[key] = { type: 'rich_text', rich_text: {} };
                        break;
                    case 'select':
                        properties[key] = { 
                            type: 'select', 
                            select: { 
                                options: value.select.options.map(option => ({
                                    name: option.name,
                                    color: option.color
                                }))
                            }
                        };
                        break;
                    case 'status':
                        // status 타입은 빈 객체로 설정
                        properties[key] = { 
                            type: 'status', 
                            status: {} 
                        };
                        break;
                    case 'date':
                        properties[key] = { type: 'date', date: {} };
                        break;
                    case 'multi_select':
                        properties[key] = { 
                            type: 'multi_select', 
                            multi_select: { 
                                options: value.multi_select.options.map(option => ({
                                    name: option.name,
                                    color: option.color
                                }))
                            }
                        };
                        break;
                    case 'number':
                        properties[key] = { 
                            type: 'number', 
                            number: value.number 
                        };
                        break;
                    case 'checkbox':
                        properties[key] = { type: 'checkbox', checkbox: {} };
                        break;
                    case 'url':
                        properties[key] = { type: 'url', url: {} };
                        break;
                    case 'email':
                        properties[key] = { type: 'email', email: {} };
                        break;
                    case 'phone_number':
                        properties[key] = { type: 'phone_number', phone_number: {} };
                        break;
                    case 'formula':
                        properties[key] = { 
                            type: 'formula', 
                            formula: value.formula 
                        };
                        break;
                    case 'relation':
                        properties[key] = { 
                            type: 'relation', 
                            relation: value.relation 
                        };
                        break;
                    case 'rollup':
                        properties[key] = { 
                            type: 'rollup', 
                            rollup: value.rollup 
                        };
                        break;
                    case 'created_time':
                        properties[key] = { type: 'created_time', created_time: {} };
                        break;
                    case 'created_by':
                        properties[key] = { type: 'created_by', created_by: {} };
                        break;
                    case 'last_edited_time':
                        properties[key] = { type: 'last_edited_time', last_edited_time: {} };
                        break;
                    case 'last_edited_by':
                        properties[key] = { type: 'last_edited_by', last_edited_by: {} };
                        break;
                    default:
                        properties[key] = value;
                }
            }

            // 3. 새로운 DB 생성
            const newDb = await this.notion.databases.create({
                parent: {
                    type: "page_id",
                    page_id: process.env.NOTION_WORKSPACE_PAGE_ID,
                },
                title: [
                    {
                        type: "text",
                        text: {
                            content: `${userName}님의 디스코드 활동 기록`,
                        },
                    },
                ],
                properties: properties,
                is_inline: templateDb.is_inline,
                description: templateDb.description,
                icon: templateDb.icon,
                cover: templateDb.cover,
            });

            return {
                id: newDb.id,
                url: newDb.url,
            };
        } catch (error) {
            console.error('사용자 DB 생성 실패:', error);
            throw error;
        }
    }

    async createNotionPageWithChunks(userDbId, pageProperties, children) {
        const MAX_BLOCKS_PER_PAGE = 80;
        const chunks = [];
        
        // 기본 페이지 속성과 함께 첫 번째 청크 생성
        const firstChunk = children.slice(0, MAX_BLOCKS_PER_PAGE);
        const firstPage = await this.notion.pages.create({
            parent: {
                database_id: userDbId,
            },
            properties: pageProperties,
            children: firstChunk,
            is_inline: true,
            public_url: true
        });

        // 페이지 공유 설정 업데이트
        await this.notion.pages.update({
            page_id: firstPage.id,
            properties: {},
            public_url: true,
            permissions: [
                {
                    type: 'public',
                    access: 'full'
                }
            ]
        });

        chunks.push(firstPage);

        // 나머지 메시지들을 새로운 페이지로 생성
        for (let i = MAX_BLOCKS_PER_PAGE; i < children.length; i += MAX_BLOCKS_PER_PAGE) {
            const chunk = children.slice(i, i + MAX_BLOCKS_PER_PAGE);
            const nextPage = await this.notion.pages.create({
                parent: {
                    database_id: userDbId,
                },
                properties: {
                    '활동': {
                        title: [
                            {
                                text: {
                                    content: `${pageProperties['활동'].title[0].text.content} (계속)`,
                                },
                            },
                        ],
                    },
                    '활동 구분': pageProperties['활동 구분'],
                    '주최자': pageProperties['주최자'],
                    '활동 날짜': pageProperties['활동 날짜'],
                    '활동 상태': pageProperties['활동 상태'],
                    '역할': pageProperties['역할']
                },
                children: chunk,
                is_inline: true,
                public_url: true
            });

            // 페이지 공유 설정 업데이트
            await this.notion.pages.update({
                page_id: nextPage.id,
                properties: {},
                public_url: true,
                permissions: [
                    {
                        type: 'public',
                        access: 'full'
                    }
                ]
            });

            chunks.push(nextPage);
        }

        return chunks;
    }

    async exportToNotion(message) {
        try {
            // 1. 저장된 Discord 데이터 로드
            const cachePath = path.join(__dirname, 'discordData.json');
            if (!fs.existsSync(cachePath)) {
                message.reply('먼저 !update 명령어로 Discord 데이터를 업데이트해주세요.');
                return;
            }

            const discordData = JSON.parse(await fs.promises.readFile(cachePath, 'utf8'));
            const userName = message.author.globalName;

            // 2. 사용자 DB 확인 및 생성
            const newDb = await this.createUserDatabase(userName);
            let userDbId = newDb.id;
            let userDbUrl = newDb.url;
            let userDb = await this.notion.databases.retrieve({
                database_id: userDbId,
            });

            // 3. 데이터베이스 속성 가져오기
            if (!userDb.properties['활동 구분']) {
                console.log('활동 구분 속성이 없어 새로 생성합니다.');
                await this.notion.databases.update({
                    database_id: userDbId,
                    properties: {
                        '활동 구분': {
                            select: {
                                options: []
                            }
                        }
                    }
                });
                // 업데이트된 DB 정보 다시 가져오기
                userDb = await this.notion.databases.retrieve({
                    database_id: userDbId,
                });
            }

            // 활동 상태 속성이 없으면 생성
            if (!userDb.properties['활동 상태']) {
                console.log('활동 상태 속성이 없어 새로 생성합니다.');
                await this.notion.databases.update({
                    database_id: userDbId,
                    properties: {
                        '활동 상태': {
                            type: 'status',
                            status: {}
                        }
                    }
                });
                // 업데이트된 DB 정보 다시 가져오기
                userDb = await this.notion.databases.retrieve({
                    database_id: userDbId,
                });
            }

            const activityTypeOptions = userDb.properties['활동 구분'].select.options;
            console.log('활동 구분 옵션:', JSON.stringify(activityTypeOptions, null, 2));

            const newMessages = [];

            // 4. 사용자의 메시지만 필터링하여 Notion에 추가
            for (const [channelId, channelData] of Object.entries(discordData)) {
                try {
                    console.log(`처리 중인 채널: ${channelData.name}`);
                    // 활동 구분 옵션에서 일치하는 항목 찾기
                    let matchingOption = activityTypeOptions.find(option => 
                        option.name.toLowerCase() === channelData.name.toLowerCase()
                    );

                    console.log(`매칭된 옵션:`, matchingOption);

                    // 옵션이 없으면 새로 추가
                    if (!matchingOption) {
                        console.log(`새로운 활동 구분 추가: ${channelData.name}`);
                        const updatedDatabase = await this.notion.databases.update({
                            database_id: userDbId,
                            properties: {
                                '활동 구분': {
                                    select: {
                                        options: [
                                            ...activityTypeOptions,
                                            {
                                                name: channelData.name,
                                                color: 'default'
                                            }
                                        ]
                                    }
                                }
                            }
                        });
                        
                        matchingOption = updatedDatabase.properties['활동 구분'].select.options.find(
                            option => option.name.toLowerCase() === channelData.name.toLowerCase()
                        );
                        console.log(`추가된 후 매칭된 옵션:`, matchingOption);
                    }

                    if (!matchingOption) {
                        console.error(`활동 구분 옵션을 찾을 수 없습니다: ${channelData.name}`);
                        continue;
                    }

                    // 기존 메시지 ID 목록 가져오기
                    const existingPages = await this.notion.databases.query({
                        database_id: userDbId,
                        filter: {
                            property: '활동 구분',
                            select: {
                                equals: matchingOption.name
                            }
                        }
                    });

                    const existingMessageIds = new Set();
                    for (const page of existingPages.results) {
                        const blocks = await this.notion.blocks.children.list({
                            block_id: page.id
                        });
                        for (const block of blocks.results) {
                            if (block.type === 'callout' && block.callout.rich_text[0]?.text?.content) {
                                const content = block.callout.rich_text[0].text.content;
                                const match = content.match(/ID: (\d+)/);
                                if (match) {
                                    existingMessageIds.add(match[1]);
                                }
                            }
                        }
                    }

                    // 사용자의 메시지만 필터링
                    for (const thread of channelData.messages) {
                        // 스레드의 시작 메시지가 사용자의 것인지 확인
                        const isUserThread = thread.starterMessage && 
                                           thread.starterMessage.author === message.author.globalName;

                        // 사용자와 관련된 모든 댓글과 답글 찾기
                        const relatedMessages = [];
                        const processedMessageIds = new Set();

                        for (const msg of thread.messages) {
                            // 이미 존재하는 메시지는 건너뛰기
                            if (existingMessageIds.has(msg.id)) {
                                continue;
                            }

                            // 사용자가 작성한 메시지
                            if (msg.author === message.author.globalName) {
                                relatedMessages.push({
                                    ...msg,
                                    type: 'user_message'
                                });
                                processedMessageIds.add(msg.id);
                                
                                // 사용자의 메시지에 대한 답글
                                if (msg.replies && msg.replies.length > 0) {
                                    for (const reply of msg.replies) {
                                        if (!processedMessageIds.has(reply.id) && !existingMessageIds.has(reply.id)) {
                                            relatedMessages.push({
                                                ...reply,
                                                type: 'reply_to_user',
                                                originalMessage: msg.content,
                                                originalAuthor: msg.author
                                            });
                                            processedMessageIds.add(reply.id);
                                        }
                                    }
                                }
                            }
                            
                            // 사용자가 답글을 단 메시지
                            if (msg.replies && msg.replies.length > 0) {
                                for (const reply of msg.replies) {
                                    if (reply.author === message.author.globalName && 
                                        !processedMessageIds.has(reply.id) && 
                                        !existingMessageIds.has(reply.id)) {
                                        relatedMessages.push({
                                            ...reply,
                                            type: 'user_reply',
                                            originalMessage: msg.content,
                                            originalAuthor: msg.author
                                        });
                                        processedMessageIds.add(reply.id);
                                    }
                                }
                            }
                        }

                        // 스레드가 사용자의 것이거나 관련 메시지가 있는 경우
                        if (isUserThread || relatedMessages.length > 0) {
                            // 메시지를 시간순으로 정렬
                            const sortedMessages = [...relatedMessages].sort((a, b) => 
                                a.timestamp - b.timestamp
                            );

                            // 스레드 작성자와 날짜 정보 가져오기
                            const threadAuthor = thread.starterMessage ? 
                                thread.starterMessage.author : 
                                '알 수 없음';
                            const threadDate = thread.starterMessage ? 
                                new Date(thread.starterMessage.timestamp).toISOString() : 
                                new Date().toISOString();

                            // 페이지 속성 정의
                            const pageProperties = {
                                '활동': {
                                    title: [
                                        {
                                            text: {
                                                content: thread.name,
                                            },
                                        },
                                    ],
                                },
                                '활동 구분': {
                                    select: {
                                        id: matchingOption.id,
                                        name: matchingOption.name,
                                    },
                                },
                                '주최자': {
                                    rich_text: [
                                        {
                                            text: {
                                                content: threadAuthor,
                                            },
                                        },
                                    ],
                                },
                                '활동 날짜': {
                                    date: {
                                        start: threadDate,
                                    },
                                }
                            };

                            // '활동 상태' 속성이 존재하는 경우에만 추가
                            if (userDb.properties['활동 상태']) {
                                pageProperties['활동 상태'] = {
                                    status: {
                                        name: '완료'
                                    }
                                };
                            }

                            // '역할' 속성이 존재하는 경우에만 추가
                            if (userDb.properties['역할']) {
                                pageProperties['역할'] = {
                                    select: {
                                        name: isUserThread ? '주최' : '참여',
                                    },
                                };
                            }

                            const children = [
                                {
                                    object: 'block',
                                    type: 'heading_1',
                                    heading_1: {
                                        rich_text: [
                                            {
                                                text: {
                                                    content: thread.name,
                                                },
                                            },
                                        ],
                                    },
                                },
                                {
                                    object: 'block',
                                    type: 'paragraph',
                                    paragraph: {
                                        rich_text: [
                                            {
                                                text: {
                                                    content: `작성자: ${threadAuthor}`,
                                                },
                                            },
                                        ],
                                    },
                                },
                                // 스레드 내용 추가
                                {
                                    object: 'block',
                                    type: 'callout',
                                    callout: {
                                        rich_text: [
                                            {
                                                text: {
                                                    content: thread.starterMessage ? 
                                                        thread.starterMessage.content : 
                                                        '스레드 내용이 없습니다.',
                                                },
                                            },
                                        ],
                                        icon: {
                                            emoji: "📝"
                                        },
                                        color: "gray_background"
                                    }
                                },
                                {
                                    object: 'block',
                                    type: 'heading_2',
                                    heading_2: {
                                        rich_text: [
                                            {
                                                text: {
                                                    content: '대화 내용',
                                                },
                                            },
                                        ],
                                    },
                                },
                                // 모든 메시지와 답글 추가
                                ...thread.messages.map(msg => {
                                    // 메시지가 사용자의 것인지 확인
                                    const isUserMessage = msg.author === message.author.globalName;
                                    const isReplyToUser = msg.originalAuthor === message.author.globalName;
                                    
                                    return {
                                        object: 'block',
                                        type: 'callout',
                                        callout: {
                                            rich_text: [
                                                {
                                                    text: {
                                                        content: `${msg.author}님의 메시지\n\n${msg.content}`,
                                                    },
                                                },
                                            ],
                                            icon: {
                                                emoji: isUserMessage ? "💬" : (isReplyToUser ? "↩️" : "💭")
                                            },
                                            color: isUserMessage ? "green_background" : (isReplyToUser ? "yellow_background" : "gray_background")
                                        }
                                    };
                                }),
                            ];

                            const pages = await this.createNotionPageWithChunks(userDbId, pageProperties, children);
                            newMessages.push(thread.name);
                            console.log(`${thread.name} 스레드가 노션에 추가되었습니다. (${pages.length} 페이지)`);
                        }
                    }
                } catch (error) {
                    console.error(`${channelData.name} 채널 처리 중 오류 발생:`, error);
                }
            }

            // 7. 새로운 메시지가 있으면 분석 실행
            if (newMessages.length > 0) {
                await this.analyzeNotionActivities(message);
            }

            // 6. 결과 메시지에 DB 링크 포함
            const resultMessage = `메시지가 성공적으로 노션으로 옮겨졌습니다! (새로운 메시지: ${newMessages.length}개) :heart:\n`;
            const dbLinkMessage = `당신의 활동 기록을 확인하세요: ${userDbUrl}

[사용 방법]
1. 활동기록 링크에 접속하여 접근권한 신청! (제가 최대한 빨리 승인을 해보겠습니다:face_holding_back_tears:)
2. 활동기록 DB 페이지 자체를 My workspace에 복제한다! (좌측 땡땡땡 버튼 -> Duplicate to -> My Workspace)
3. 🍎다니님 템플릿을 자신의 Notion Space로 복제한다! (https://puzzled-mahogany-c80.notion.site/_-1cd687e8fae38033b520cc88dccdf70e?pvs=4)
4. 복제된 DB에서 move to 를 사용하여 다니님 템플릿으로 페이지 옮기기!


:sparkles:
파인더분들의 '나다운 일과 삶'을 응원합니다!!
조용하고 소소하게 일상 속 작은 도움을 주는 구두주걱 같은 삶을 꿈꾸는 은지캉 드림:gift_heart:`;
            
            message.reply(resultMessage + dbLinkMessage);

        } catch (error) {
            console.error('노션으로 내보내기 실패:', error);
            message.reply('메시지를 노션으로 옮기는데 실패했습니다. 다시 시도해주세요.');
        }
    }

    async analyzeNotionActivities(message) {
        try {
            // 1. IAM_FINDER_CH_ID에서 사용자의 자기소개 가져오기
            const iamFinderChannel = await this.client.channels.fetch(IAM_FINDER_CH_ID);
            const activeThreads = await iamFinderChannel.threads.fetchActive();
            const archivedThreads = await iamFinderChannel.threads.fetchArchived();

            let selfIntroduction = null;
            for (const thread of [...activeThreads.threads.values(), ...archivedThreads.threads.values()]) {
                try {
                    const starterMessage = await thread.fetchStarterMessage();
                    if (starterMessage.author.globalName === message.author.globalName) {
                        selfIntroduction = {
                            title: thread.name,
                            content: starterMessage.content,
                            date: thread.createdAt
                        };
                        break;
                    }
                } catch (error) {
                    console.error('스레드 메시지 가져오기 실패:', error);
                }
            }

            // 2. 사용자 DB에서 활동 가져오기
            const userName = message.author.globalName;
            const userDb = await this.getUserDatabase(userName);

            if (!userDb) {
                message.reply("먼저 !ex 명령어로 활동을 저장해주세요:heart:");
                return;
            }

            const userDbId = userDb.id;

            // 사용자 DB의 속성 구조 확인
            const notionPages = await this.notion.databases.query({
                database_id: userDbId,
                filter: {
                    property: '활동 구분',
                    select: {
                        is_not_empty: true
                    }
                }
            });

            if (notionPages.results.length === 0) {
                message.reply("아직 노션에 저장된 활동이 없어요!");
                return;
            }

            // 3. 활동 데이터 수집
            const activities = [];
            for (const page of notionPages.results) {
                const pageContent = await this.notion.pages.retrieve({
                    page_id: page.id
                });

                const activityType = page.properties['활동 구분'].select?.name || '기타';
                const activityDate = page.properties['활동 날짜'].date?.start || new Date().toISOString();
                const isHost = page.properties['주최자'].rich_text[0]?.text?.content === userName;
                
                // 페이지 내용 가져오기
                const blocks = await this.notion.blocks.children.list({
                    block_id: page.id
                });

                let userMessages = [];
                
                for (const block of blocks.results) {
                    if (block.type === 'callout') {
                        const messageContent = block.callout.rich_text[0]?.text?.content || '';
                        if (messageContent.includes(userName)) {
                            userMessages.push({
                                content: messageContent,
                                timestamp: block.created_time
                            });
                        }
                    }
                }

                // 메시지를 시간순으로 정렬
                userMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                activities.push({
                    title: page.properties['활동'].title[0]?.text?.content || '제목 없음',
                    type: activityType,
                    date: activityDate,
                    isHost: isHost,
                    userMessages: userMessages.map(msg => msg.content)
                });
            }

            // 4. OpenAI를 사용하여 활동 분석
            const analysisPrompt = [
                {
                    role: 'system',
                    content: `     아래 제공된 사용자 활동 데이터, 댓글 내용, 자기소개글, 관심사 태그, 참여 기록, 목표 설정 정보 등을 바탕으로, 파인더스 클럽의 중요한 취지—즉, '나다운 일과 삶을 찾기', '서로의 경험과 관심사를 존중하며 함께 성장하기'—에 부합하는 따뜻하고 의미 있는 분석을 진행해 주세요.
                    이 분석은 사용자 개개인이 자신의 이야기를 깊이 있게 돌아보고, 예상치 못한 가능성과 강점을 발견할 수 있도록 도움을 주는 것을 목표로 합니다.
                    
                    - 사용자가 처음 세운 목표 또는 탐구 주제에 대해 얼마나 성취했고, 어떤 방향으로 성장하고 있는지 따뜻하게 평가해 주세요.
                    - 성과와 동시에 부족한 부분이나 더 도전해보고 싶은 점도 자연스럽게 피드백해 주세요.
                    
  
                    - 활동 기록, 자기소개, 태그 및 참여 내용 등을 분석하여, 사용자 자신이 자연스럽게 끌리는 관심사와 강점을 도출해 주세요.
                    - 이 과정에서 배려심, 자기주도성, 창의성, 공감력 등 사용자의 고유한 성격과 특성도 함께 살펴봐 주세요.
                    
            
                    - 활동하며 느꼈던 감정 또는 의미 부여했던 순간, 그리고 감동 혹은 자랑스러웠던 경험을 부드럽고 따뜻한 어조로 정리해 주세요.
                    - 이 과정이 '나다운 나'를 더 잘 이해하고, 서로를 존중하는 클럽의 정신과 어떻게 어우러지는지도 함께 표현해 주세요.
                    
 
                    - 활동 빈도, 참여한 채널이나 경험들이 어떤 방향성을 보여주는지 평가해 주세요.
                    - 지금까지의 활동이 사용자에게 어떤 성취감 또는 성장의 징후를 보여주는지 함께 설명해 주세요.
                    
  
                    - 사용자님이 관심 갖고 있는 주제 또는 강점을 더 깊게 탐구하거나, 새로운 경험으로 확장할 수 있는 따뜻한 추천을 해 주세요.
                    - '나다운 일과 삶을 만들어 가는' 길에 도움이 될 만한 제언도 포함해 주세요.
 
 
                    - 지금까지의 활동과 분석 내용을 간단히 정리하며, 사용자가 자신의 이야기를 통해 앞으로 어떻게 성장할 수 있을지에 대한 작은 응원과 조언을 적어 주세요.
                    
                    주의 사항
                    - 이 분석은, 사용자 한 사람 한 사람의 내면과 잠재력을 존중하고, 따뜻한 마음으로 읽기 쉽고 격려하는 표현을 담아 작성해 주세요.
                    - 언제나처럼, 솔직한 마음과 존중하는 태도를 잊지 말아 주세요.
             
                    해당 내용을 바탕으로 요약을 해주시고, 포맷은 리포트 형식으로 해주세요.
                    마지막으로 따뜻한 응원의 메시지를 포함해주세요! 대답은 1900자 이하로 해주세요.`
                },
                {
                    role: 'user',
                    content: `다음은 사용자의 활동 데이터입니다. 이를 분석하여 응원해주세요:

                    [자기소개]
                    ${selfIntroduction ? JSON.stringify({
                        title: selfIntroduction.title,
                        content: selfIntroduction.content,
                        date: selfIntroduction.date
                    }, null, 2) : '자기소개를 찾을 수 없습니다.'}

                    [활동 데이터]
                    ${JSON.stringify(activities, null, 2)}`
                }
            ];

            const analysis = await this.openAIService.getResponse(analysisPrompt);

            // 5. 분석 결과를 사용자 DB에 저장
            const pageProperties = {
                '활동': {
                    title: [
                        {
                            text: {
                                content: `${userName}님의 활동 분석 리포트`,
                            },
                        },
                    ],
                },
                '활동 구분': {
                    select: {
                        name: '활동 리포트',
                    },
                },
                '주최자': {
                    rich_text: [
                        {
                            text: {
                                content: 'AI 분석',
                            },
                        },
                    ],
                },
                '활동 날짜': {
                    date: {
                        start: new Date().toISOString(),
                    },
                },
            };

            // DB에 존재하는 속성만 추가
            if (userDb.properties['활동 장소']) {
                pageProperties['활동 장소'] = {
                    rich_text: [
                        {
                            text: {
                                content: '디스코드',
                            },
                        },
                    ],
                };
            }

            if (userDb.properties['활동 상태']) {
                pageProperties['활동 상태'] = {
                    status: {
                        name: '완료'
                    }
                };
            }

            const analysisPage = await this.notion.pages.create({
                parent: {
                    database_id: userDbId,
                },
                properties: pageProperties,
                children: [
                    {
                        object: 'block',
                        type: 'heading_1',
                        heading_1: {
                            rich_text: [
                                {
                                    text: {
                                        content: `${userName}님의 활동 분석 리포트`,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        object: 'block',
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [
                                {
                                    text: {
                                        content: `작성일: ${new Date().toLocaleDateString()}`,
                                    },
                                },
                            ],
                        },
                    },
                    // 분석 결과를 2000자씩 나누어 저장
                    ...analysis.match(/.{1,2000}/g).map(chunk => ({
                        object: 'block',
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [
                                {
                                    text: {
                                        content: chunk,
                                    },
                                },
                            ],
                        },
                    })),
                ],
            });

            // 데이터베이스 공유 설정 업데이트
            const updatedDb = await this.notion.databases.update({
                database_id: userDbId,
                is_inline: false
            });

            // 데이터베이스의 부모 페이지 공유 설정 업데이트
            const parentPage = await this.notion.pages.retrieve({
                page_id: userDb.parent.page_id
            });

            await this.notion.pages.update({
                page_id: parentPage.id,
                public_url: true,
                permissions: [
                    {
                        type: 'public',
                        access: 'full'
                    }
                ]
            });

            // 첫 번째 메시지 (노션 링크 포함) 전송
            await message.reply(analysis);
            
        } catch (error) {
            console.error('활동 분석 중 오류 발생:', error);
            message.reply('활동 분석에 실패했어요. 다시 시도해주세요:heart:');
        }
    }
}

const isSameDate = (date1, date2) => {
    return date1.getFullYear() === date2.getFullYear()
        && date1.getMonth() === date2.getMonth()
        && date1.getDate() === date2.getDate();
}

const getSimpleChannelName = (channelName) => {
    const splittedChannelName = channelName.split("|");
    if (splittedChannelName.length > 1) {
        return splittedChannelName[1].trim();
    } else {
        return channelName;
    }
}

const getChannelEmoji = (channelName) => {
    const splittedChannelName = channelName.split("|");
    if (splittedChannelName.length > 1) {
        return splittedChannelName[0].trim();
    } else {
        return DEFAULT_CHANNEL_EMOJI;
    }
}

// 봇 인스턴스 생성 및 시작
const bot = new DiscordBot();
bot.start();