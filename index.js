require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const OpenAI = require('openai');

class OpenAIService {
    constructor(apiKey) {
        this.openai = new OpenAI({ apiKey });
    }

    async getResponse(messages) {
        const response = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: messages,
        });
        return response.choices[0].message.content; 
    }

    buildInitialOpenAIMessages() {
        return [
            {
                role: 'system',
                content: `너는 디스코드 내에 존재하는 챗봇이고,
                너의 이름은 사과방 핑거 프로텍터야.
                너는 다정하고 깜찍하고 활기찬 말투의 소유자야.`
              }
        ];
    }

    async loadMessages(channelId, messages) {
        // 메시지 로드 로직 (여기에 구현 필요)
    }
}

const NORMAL_CHANNEL_ID = '1349892246501064830';
const FORUM_CHANNEL_ID  = '1353940419133706310';
const FORUM_CHANNEL_ID_2  = '1355108765233320037';

const IAM_FINDER_CH_ID = '1346330549731721298';
const CHALLENGE_CH_ID = '1348486199257600000';
const LOUNGE_TALK_CH_ID = '1346332258759475290';
const FLEA_MARKET_CH_ID = '1346332310211006534';

class DiscordBot {
    constructor() {
        this.openAIService = new OpenAIService(process.env.OPENAI_API_KEY);
        
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });

        this.channelId = NORMAL_CHANNEL_ID; // 특정 채널 ID를 입력하세요
        this.userMessages = this.openAIService.buildInitialOpenAIMessages();

        this.client.once('ready', () => {
            console.log(`Logged in as ${this.client.user.tag}`);
        });

        this.client.on('messageCreate', (message) => this.handleMessage(message));
    }

    start() {
      this.client.login(process.env.DISCORD_TOKEN);
    }

    async handleMessage(message) {
      if (message.author.bot) return; // 봇 메시지는 무시

      if (message.content.startsWith('!today')) 
      {
        await this.ShowTodayPosts(message);
      }
      else if (message.content.startsWith('!appleChat'))
      {

      }
  }

    async ShowTodayPosts(message) {
        let replyMessage = ':apple:오늘 파인클에 새로 올라온 게시물이에요!:apple:\n\n'
        
        replyMessage += await this.GetChannelResponse(IAM_FINDER_CH_ID, '[🤗｜아임파인더]\n');
        replyMessage += await this.GetChannelResponse(CHALLENGE_CH_ID, '[:parachute:｜파인딩 첼린지]\n');
        replyMessage += await this.GetChannelResponse(LOUNGE_TALK_CH_ID, '[🎙｜라운지토크]\n');
        replyMessage += await this.GetChannelResponse(FLEA_MARKET_CH_ID, '[💞｜재능플리마켓]\n');

        message.reply(replyMessage);
    }

    async GetChannelResponse(ch, message) {
        const posts = await this.getTodayPosts(ch);
        let responses = ''

        if (posts.length == 0) return responses;

        responses += message;
        responses += await this.GetSummerizedPosts(posts);
        return responses;
    }

    async GetSummerizedPosts(posts) {
        return await Promise.all(posts.map(async (post) => {
            const openAIprompt = this.openAIService.buildInitialOpenAIMessages();

            openAIprompt.push({
                role: 'user',
                content: `다음 글에서 주제, 내용, 날짜, 장소를 간략하게 요약해줘. 해당 정보가 없다면 생략해줘. 
                예시1)
                * 주제: 최애를 소개하는 라운지 토크
                * 내용: 사과방 지구가 좋아하는 것을 소개하고, 다른 사람들의 취향을 살펴보며 공유하는 시간 (최대 3줄 정도 요약해주세요.)
                * 날짜: 3/25 화요일
                * 장소: 온라인(디스코드 등)
                
                예시2)
                * 주제: 책 읽기 챌린지
                * 내용: 30분 책 읽기
                * 날짜: 없음
                * 장소: 없음

                다음은 요약할 글 정보입니다. 
                ${post.content}`
            });

            const summerizedContent = await this.openAIService.getResponse(openAIprompt);
            return `${post.link} - ${post.author}\n${summerizedContent}\n\n`;
        }));
    }

    async GetIamFinderPosts(message) {
        const author = '은지캉';
        const posts = await this.getTodayPosts(FORUM_CHANNEL_ID); // 포럼 게시글 가져오기

        const responses = await Promise.all(posts.map(async (post) => {
            const openAIprompt = this.openAIService.buildInitialOpenAIMessages();

            openAIprompt.push({
                role: 'user',
                content: `다음 내용을 최대 10줄로 요약해줘. ${post.content}`
            });

            const summerizedResponse = await this.openAIService.getResponse(openAIprompt);
            return `${post.author}님의 아임파인더입니다! - ${post.link}\n: ${summerizedResponse}`;
        }));

        message.reply(`[아임파인더]\n${responses.join('\n')}`);
    }

    async handleAskMessage(message) {
        const userMessageContent = this.extractUserMessage(message.content);
        this.userMessages.push({ role: 'user', content: userMessageContent });

        const response = await this.openAIService.getResponse(this.userMessages);
        
        this.userMessages.push({ role: 'assistant', content: response });

        this.replyToMessage(message, response);
    }

    async handleSumMessage(message) {
        const userMessageContent = this.extractUserMessage(message.content);
        const openAIMessages = this.openAIService.buildInitialOpenAIMessages();

        await this.openAIService.loadMessages(this.channelId, openAIMessages);
        openAIMessages.push({ role: 'user', content: userMessageContent });

        const response = await this.openAIService.getResponse(openAIMessages);
        openAIMessages.push({ role: 'assistant', content: response });

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
            
            if (filterFunc && !filterFunc(thread)) {
                continue; // 필터 함수가 주어지고, 조건을 만족하지 않으면 스킵
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

// 봇 인스턴스 생성 및 시작
const bot = new DiscordBot();
bot.start();