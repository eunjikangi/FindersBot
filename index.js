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

class OpenAIService {
    constructor(apiKey) {
        this.openai = new OpenAI({ apiKey });
    }

    async getResponse(messages) {
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
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
            ],
            partials: [
                Partials.Channel,
                Partials.Message
            ]
        });

        this.openAIService = null;
        this.userMessages = [];
        this.channelName = DEFAULT_CHANNEL_NAME;
        this.channelEmoji = DEFAULT_CHANNEL_EMOJI;
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
        });

        this.client.on('messageCreate', (message) => this.handleMessage(message));
    }

    async handleMessage(message) {
        if (message.author.bot) return; // 봇 메시지는 무시

      // 1. Channel Message 처리
      if (message.content.startsWith('!today')) 
      {
        message.reply("오늘 올라온 게시글을 열심히 모으고 있습니다! 잠시만 기다려주세요:heart: ");
        await this.ShowTodayPosts(message);
      }
      else if (message.content.startsWith('!chat'))
      {
        message.reply("오늘의 대화를 열심히 요약하고 있습니다! 잠시만 기다려주세요:heart: ");
        await this.handleSumMessage(message);
      }
      else if (message.content.startsWith('<@1350718874672435270>'))
      {
        await this.handleAskMessage(message);
      }
      else if (message.mentions.repliedUser != null)
      {
        if(message.mentions.repliedUser.id == '1350718874672435270')
        {
            await this.handleAskMessage(message);
        }
      }
      else if (message.content.startsWith('!finder'))
      {
        const userName = message.content.split(" ")[1];

        if(userName == undefined)
        {
          message.reply(":see_no_evil:에러발생:see_no_evil:\n!finder 이름 형식으로 입력해주세요!\n ex) !finder 은지캉");
        }
        else
        {
            await this.GetIamFinderPosts(message, userName);
        }
      }
  }

    async ShowTodayPosts(message) {
        let replyMessage = `${this.channelEmoji}오늘 파인클에 새로 올라온 게시물이에요!${this.channelEmoji}\n\n`

        replyMessage += await this.GetChannelResponse(message, IAM_FINDER_CH_ID, '[🤗｜아임파인더]\n');
        replyMessage += await this.GetChannelResponse(message, CHALLENGE_CH_ID, '[:parachute:｜파인딩 첼린지]\n');
        replyMessage += await this.GetChannelResponse(message, LOUNGE_TALK_CH_ID, '[🎙｜라운지토크]\n');
        replyMessage += await this.GetChannelResponse(message, FLEA_MARKET_CH_ID, '[💞｜재능플리마켓]\n');

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
                content: `다음 글에서 주제, 내용, 날짜, 장소를 간략하게 요약해줘. 해당 정보가 없다면 생략해줘. 
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
