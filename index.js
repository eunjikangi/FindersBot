require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const OpenAI = require('openai');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// OpenAI API 설정
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const channelId = '1349892246501064830'; // 특정 채널 ID를 입력하세요

// 봇 준비 완료 시 메시지
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// 특정 채널의 모든 메시지를 가져오는 함수
async function loadMessages(channelId, SumMessages) {
    const channel = await client.channels.fetch(channelId);
    let fetchedMessages; // 임시배열
    let tempMsg = [];

    do {
        // 채널의 메시지 가져오기
        fetchedMessages = await channel.messages.fetch({ limit: 100 });

        // 각 메시지를 적절한 형식으로 저장
        fetchedMessages.forEach(msg => {
            tempMsg.push({
                content: msg.content,
                authorId: msg.author.id, // globalName 대신 id로 설정
            });

            // OpenAI 메시지 형식으로 변환하여 저장
            SumMessages.push({
                role: 'assistant',
                content: tempMsg
            });
        });
    } while (fetchedMessages.size === 100); // 더 이상 가져올 메시지가 없을 때까지 반복
}

// 메시지 이벤트 핸들러
client.on('messageCreate', handleMessage);

// 메시지를 처리하는 함수
const userMessages = [
    { 
        role: 'system', 
        content: "너는 디스코드 내에 존재하는 챗봇이고, 너의 이름은 사과방 핑거 프로텍터야. 디스코드의 특정 채널에 오고간 대화들을 학습하여 사용자들에게 친절하게 대답해주는 역할을 해줄거야. 다정하고 깜찍하고 활기찬 말투의 소유자야." 
    }
];

async function handleMessage(message) {
    if (message.author.bot) return; // 봇 메시지는 무시

    // 질문 처리
    if (message.content.startsWith('!ask')) {
        const userMessageContent = message.content.slice(5).trim(); // "!ask " 이후의 내용

        // OpenAI 메시지 형식으로 사용자 메시지를 저장
        userMessages.push({ 
            role: 'user', 
            content: userMessageContent
        });

        const response = await getOpenAIResponse(userMessages); // userMessages를 인자로 전달
       
        // 응답을 사용자에 맞게 추가
        userMessages.push({ 
            role: 'assistant', 
            content: response 
        });

        message.reply(response);
    }

        // 질문 처리
        if (message.content.startsWith('!sum')) {
            const userMessageContent = message.content.slice(5).trim(); // "!sum " 이후의 내용
    
            const openAIMessages = [
                { 
                    role: 'system', 
                    content: "너는 디스코드 내에 존재하는 챗봇이고, 너의 이름은 사과방 핑거 프로텍터야. 디스코드의 특정 채널에 오고간 대화들을 학습하여 사용자들에게 친절하게 대답해주는 역할을 해줄거야. 다정하고 깜찍하고 활기찬 말투의 소유자야." 
                }
            ];

            loadMessages(channelId, openAIMessages);

            // OpenAI 메시지 형식으로 사용자 메시지를 저장
            openAIMessages.push({ 
                role: 'user', 
                content: userMessageContent
            });
    
            const response = await getOpenAIResponse(openAIMessages); // userMessages를 인자로 전달
           
            // 응답을 사용자에 맞게 추가
            openAIMessages.push({ 
                role: 'assistant', 
                content: response 
            });
    
            message.reply(response);
        }
}

// OpenAI API에 요청하여 응답을 가져오는 함수
async function getOpenAIResponse(AImessages) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: AImessages, // JSON 형태의 메시지 배열을 전달
        });

        return response.choices[0].message.content; // 응답 내용 반환
    } catch (error) {
        console.error('Error with OpenAI API:', error);
        return 'API 호출 중 오류가 발생했습니다.'; // 오류 메시지 반환
    }
}

// 봇 로그인
client.login(process.env.DISCORD_TOKEN);