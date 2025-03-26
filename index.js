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
                디스코드의 특정 채널에 오고간 대화들을 학습하여
                사용자들에게 친절하게 대답해주는 역할을 해줄거야.
                다정하고 깜찍하고 활기찬 말투의 소유자야.`
              }
        ];
    }

    async loadMessages(channelId, messages) {
        // 메시지 로드 로직 (여기에 구현 필요)
    }
}

const NORMAL_CHANNEL_ID = '1349892246501064830';
const FORUM_CHANNEL_ID  = '1353940419133706310';

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

        // message create event 등록
        this.client.on('messageCreate', (message) => this.handleMessage(message));
    }

    start() {
      this.client.login(process.env.DISCORD_TOKEN);
    }

    async handleMessage(message) {
      if (message.author.bot) return; // 봇 메시지는 무시

      if (message.content.startsWith('!ask')) 
      {
          await this.handleAskMessage(message);
      } else if (message.content.startsWith('!sum')) 
      {
          await this.handleSumMessage(message);
      } else if (message.content.startsWith('!forumPosts')) 
      {
          const posts = await this.getForumPosts(); // 포럼 게시글 가져오기
          const response = posts.map(post => `${post.title} - ${post.author}: ${post.link}`).join('\n');
          message.reply(`포럼 게시글:\n${response}`);
      }
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

    async getForumPosts() {
        const channel = await this.client.channels.fetch(FORUM_CHANNEL_ID);
        const threads = await channel.threads.fetchActive(); // 활성화된 스레드 가져오기 (스레드 == 게시글)
        const threadData = [];
    
        for (const thread of threads.threads.values()) { // for...of 루프 사용
            const threadMessages = await thread.messages.fetch(); // 게시글 내용을 가져오기
    
            threadMessages.forEach(message => {
                threadData.push({
                    id: thread.id,
                    title: thread.name,
                    author: message.author.globalName, // 메시지 작성자 이름 사용
                    content: message.content, // 메시지 내용
                    link: `https://discord.com/channels/${thread.guild.id}/${thread.id}`
                });
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

// 봇 인스턴스 생성 및 시작
const bot = new DiscordBot();
bot.start();