require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
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
                너의 이름은 사과방 핑거 프로텍터야.
                너는 다정하고 깜찍하고 활기찬 말투의 소유자야.`
              }
        ];
    }
}

const NORMAL_CHANNEL_ID = '1349892246501064830';
const FORUM_CHANNEL_ID  = '1353940419133706310';
const FORUM_CHANNEL_ID_2  = '1355108765233320037';

const IAM_FINDER_CH_ID = '1346330549731721298';
const CHALLENGE_CH_ID = '1348486199257600000';
const LOUNGE_TALK_CH_ID = '1346332258759475290';
const FLEA_MARKET_CH_ID = '1346332310211006534';
const APPLE_CHANNEL_ID = '1346335433591623824';

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
      else if (message.content.startsWith('!chat'))
      {
        await this.handleSumMessage(message);
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
        responses += await this.GetSummerizedPosts(ch, posts);
        return responses;
    }

    async GetSummerizedPosts(ch, posts) {
        return await Promise.all(posts.map(async (post) => {
            const openAIprompt = this.openAIService.buildInitialOpenAIMessages();

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
            if(ch != IAM_FINDER_CH_ID) {
                summerizedContent = await this.openAIService.getResponse(openAIprompt);
            }
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
        // 1. 사과방 챗봇 페르소나 설정
        const openAIMessages = this.openAIService.buildInitialOpenAIMessages();

        // 2. 사과방 채팅방 메세지 파싱
        const userMessageContent = await this.loadMessages(APPLE_CHANNEL_ID);

        // 3. user의 호출 message 추출
        openAIMessages.push({ 
            role: 'user', 
            content: `다음은 '사과방'의 대화 내용입니다.
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

            다음은 사과방의 대화 내용입니다!
            ${userMessageContent}` 
        });

        // 4. OpenAI 응답 받아오기
        let response = ':apple: 오늘의 사과방 대화요약 :apple: \n';
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
                if(isSameDate(msgCreatedDate, today))
                {
                    if(!msg.author.bot)
                    {
                        todaysChatData.push(`${msg.author.globalName} : ${msg.content} `);
                    }
                }
                else
                {
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

// 봇 인스턴스 생성 및 시작
const bot = new DiscordBot();
bot.start();