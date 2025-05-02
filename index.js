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
            model: 'gpt-4o',
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
        } else if (message.content.startsWith('!export')) {
            message.reply("메시지를 노션으로 옮기고 있습니다! 잠시만 기다려주세요:heart:");
            await this.exportToNotion(message);
        } else if (message.content.startsWith('!analyze')) {
            message.reply("당신의 활동을 분석하고 있어요! 잠시만 기다려주세요:heart:");
            await this.analyzeNotionActivities(message);
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
                { id: GATHERING_CH_ID, name: '게릴라게더링' },
                { id: THINK_CH_ID, name: '고민상담소' },
                { id: GOODMORNING_CH_ID, name: '굿모닝' },
                { id: SMALL_TRY_CH_ID, name: '스몰트라이' },
                { id: SMALL_TALK_CH_ID, name: '스몰톡' },
                { id: AFTER_TALK_CH_ID, name: '애프터톡' }
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

                    for (const message of threadMessages.values()) {
                        if (message.id !== starterMessage.id) { // 스타터 메시지는 이미 저장했으므로 제외
                            threadContent.messages.push({
                                id: message.id,
                                author: message.author.globalName,
                                content: message.content,
                                timestamp: message.createdTimestamp,
                                replies: []
                            });
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

                for (const message of channelMessages.values()) {
                    channelContent.messages.push({
                        id: message.id,
                        author: message.author.globalName,
                        content: message.content,
                        timestamp: message.createdTimestamp,
                        replies: []
                    });
                }

                messages.push(channelContent);
            } catch (error) {
                console.error(`일반 채널 메시지 수집 중 오류 발생:`, error);
            }
        }

        return messages;
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

            // 2. Notion DB에서 기존 제목 가져오기
            const notionPages = await this.notion.databases.query({
                database_id: process.env.NOTION_DATABASE_ID,
            });
            const notionTitles = new Set(notionPages.results.map(page => 
                page.properties['활동'].title[0]?.text?.content
            ).filter(Boolean));

            // 3. 데이터베이스 속성 가져오기
            const database = await this.notion.databases.retrieve({
                database_id: process.env.NOTION_DATABASE_ID,
            });
            
            const activityTypeOptions = database.properties['활동 구분'].select.options;
            console.log('활동 구분 옵션:', activityTypeOptions);

            const newMessages = [];

            // 4. 사용자의 메시지만 필터링하여 Notion에 추가
            for (const [channelId, channelData] of Object.entries(discordData)) {
                try {
                    // 활동 구분 옵션에서 일치하는 항목 찾기
                    let matchingOption = activityTypeOptions.find(option => 
                        option.name.toLowerCase() === channelData.name.toLowerCase()
                    );

                    // 옵션이 없으면 새로 추가
                    if (!matchingOption) {
                        console.log(`새로운 활동 구분 추가: ${channelData.name}`);
                        const updatedDatabase = await this.notion.databases.update({
                            database_id: process.env.NOTION_DATABASE_ID,
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
                    }

                    if (!matchingOption) {
                        console.error(`활동 구분 옵션을 찾을 수 없습니다: ${channelData.name}`);
                        continue;
                    }

                    // 사용자의 메시지만 필터링
                    for (const thread of channelData.messages) {
                        // 스레드의 시작 메시지가 사용자의 것인지 확인
                        const isUserThread = thread.starterMessage && 
                                           thread.starterMessage.author === message.author.globalName;

                        // 사용자의 댓글만 필터링
                        const userMessages = thread.messages.filter(msg => 
                            msg.author === message.author.globalName
                        );

                        // 스레드가 사용자의 것이거나 사용자의 댓글이 있는 경우
                        if (isUserThread || userMessages.length > 0) {
                            // 댓글을 시간순으로 정렬
                            const sortedMessages = [...userMessages].sort((a, b) => 
                                a.timestamp - b.timestamp
                            );

                            // 스레드 작성자와 날짜 정보 가져오기
                            const threadAuthor = thread.starterMessage ? 
                                thread.starterMessage.author : 
                                '알 수 없음';
                            const threadDate = thread.starterMessage ? 
                                new Date(thread.starterMessage.timestamp).toISOString() : 
                                new Date().toISOString();

                            const notionPage = await this.notion.pages.create({
                                parent: {
                                    database_id: process.env.NOTION_DATABASE_ID,
                                },
                                properties: {
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
                                    '활동 장소': {
                                        rich_text: [
                                            {
                                                text: {
                                                    content: '디스코드',
                                                },
                                            },
                                        ],
                                    },
                                    '활동 상태': {
                                        status: {
                                            name: '완료',
                                        },
                                    },
                                    '활동 날짜': {
                                        date: {
                                            start: threadDate,
                                        },
                                    },
                                },
                                children: [
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
                                        type: 'paragraph',
                                        paragraph: {
                                            rich_text: [
                                                {
                                                    text: {
                                                        content: thread.starterMessage ? 
                                                            thread.starterMessage.content : 
                                                            '스레드 내용이 없습니다.',
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                    {
                                        object: 'block',
                                        type: 'heading_2',
                                        heading_2: {
                                            rich_text: [
                                                {
                                                    text: {
                                                        content: '댓글',
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                    // 정렬된 댓글 추가
                                    ...sortedMessages.map(msg => ({
                                        object: 'block',
                                        type: 'paragraph',
                                        paragraph: {
                                            rich_text: [
                                                {
                                                    text: {
                                                        content: `${msg.author}: ${msg.content}`,
                                                    },
                                                },
                                            ],
                                        },
                                    })),
                                ],
                            });

                            newMessages.push(thread.name);
                            console.log(`${thread.name} 스레드가 노션에 추가되었습니다.`);
                        }
                    }
                } catch (error) {
                    console.error(`${channelData.name} 채널 처리 중 오류 발생:`, error);
                }
            }

            message.reply(`메시지가 성공적으로 노션으로 옮겨졌습니다! (새로운 메시지: ${newMessages.length}개) :heart:`);

            // 5. 새로운 메시지가 있으면 분석 실행
            if (newMessages.length > 0) {
                message.reply("활동을 분석하고 있어요! 잠시만 기다려주세요:heart:");
                await this.analyzeNotionActivities(message);
            }
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

            // 2. Notion DB에서 사용자의 활동 가져오기
            const notionPages = await this.notion.databases.query({
                database_id: process.env.NOTION_DATABASE_ID,
                filter: {
                    property: '주최자',
                    rich_text: {
                        equals: message.author.globalName
                    }
                }
            });

            if (notionPages.results.length === 0) {
                message.reply("아직 노션에 저장된 활동이 없어요! 먼저 !export 명령어로 활동을 저장해주세요:heart:");
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
                
                // 페이지 내용 가져오기
                const blocks = await this.notion.blocks.children.list({
                    block_id: page.id
                });

                let content = '';
                for (const block of blocks.results) {
                    if (block.type === 'paragraph' && block.paragraph?.rich_text) {
                        content += block.paragraph.rich_text.map(text => text.plain_text).join('') + '\n';
                    }
                }

                activities.push({
                    title: page.properties['활동'].title[0]?.text?.content || '제목 없음',
                    type: activityType,
                    date: activityDate,
                    content: content
                });
            }

            // 4. OpenAI를 사용하여 활동 분석
            const analysisPrompt = [
                {
                    role: 'system',
                    content: `당신은 사용자의 디스코드 활동을 분석하고 응원하는 AI입니다. 
                    사용자의 자기소개와 활동 내용을 분석하여 다음과 같은 관점에서 다정하고 따뜻한 말투로 응답해주세요:
                    
                    1. 자기소개와 목표 분석
                    - 커뮤니티 참여 동기와 목표
                    - 자신이 밝힌 관심사와 특기
                    - 기대하는 바와 희망사항
                    
                    2. 관심사와 참여 패턴
                    - 어떤 주제에 가장 관심이 많은지
                    - 어떤 활동을 자주 하는지
                    - 특별히 열정적인 분야가 있는지
                    - 자기소개에서 밝힌 관심사와 실제 활동의 연관성
                    
                    3. 성장과 변화
                    - 시간이 지나면서 관심사가 어떻게 변화했는지
                    - 어떤 새로운 도전을 시도했는지
                    - 자기소개에서 밝힌 목표에 대한 진척 상황
                    - 어떤 성장이 있었는지
                    
                    4. 의미와 성취
                    - 활동이 어떤 의미를 가졌는지
                    - 어떤 목표를 이룬 것 같은지
                    - 자기소개에서 밝힌 기대사항이 어떻게 실현되었는지
                    - 앞으로의 발전 가능성
                    
                    5. 개인적인 응원과 제안
                    - 자기소개에서 밝힌 목표를 위한 구체적인 제안
                    - 관심사에 맞는 새로운 활동 제안
                    - 성장을 위한 조언
                    
                    응답은 다음과 같은 형식으로 작성해주세요:
                    
                    안녕하세요! 당신의 자기소개와 활동을 함께 분석해보았어요:heart:
                    
                    [자기소개와 목표 분석]
                    ...
                    
                    [관심사와 참여 패턴]
                    ...
                    
                    [성장과 변화]
                    ...
                    
                    [의미와 성취]
                    ...
                    
                    [개인적인 응원과 제안]
                    ...
                    
                    마지막으로 따뜻한 응원의 메시지를 포함해주세요!`
                },
                {
                    role: 'user',
                    content: `다음은 사용자의 자기소개와 활동 데이터입니다. 이를 분석하여 응원해주세요:

                    [자기소개]
                    ${selfIntroduction ? JSON.stringify(selfIntroduction, null, 2) : '자기소개를 찾을 수 없습니다.'}

                    [활동 데이터]
                    ${JSON.stringify(activities, null, 2)}`
                }
            ];

            const analysis = await this.openAIService.getResponse(analysisPrompt);

            // 5. 분석 결과를 Notion에 저장
            const analysisPage = await this.notion.pages.create({
                parent: {
                    database_id: process.env.NOTION_DATABASE_ID,
                },
                properties: {
                    '활동': {
                        title: [
                            {
                                text: {
                                    content: `${message.author.globalName}님의 활동 분석 리포트`,
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
                    '활동 장소': {
                        rich_text: [
                            {
                                text: {
                                    content: '디스코드',
                                },
                            },
                        ],
                    },
                    '활동 상태': {
                        status: {
                            name: '완료',
                        },
                    },
                    '활동 날짜': {
                        date: {
                            start: new Date().toISOString(),
                        },
                    },
                },
                children: [
                    {
                        object: 'block',
                        type: 'heading_1',
                        heading_1: {
                            rich_text: [
                                {
                                    text: {
                                        content: `${message.author.globalName}님의 활동 분석 리포트`,
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
                    {
                        object: 'block',
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [
                                {
                                    text: {
                                        content: analysis,
                                    },
                                },
                            ],
                        },
                    },
                ],
            });

            message.reply(`활동 분석이 완료되었어요! 노션에서 확인해보세요:heart:`);
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
