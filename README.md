# FindersBot
파인더스클럽 디스코드 특정 채널의 새 게시물 정보를 요약하여 데일리로 리포트해주는 챗봇

### 챗봇 초대 링크
https://discord.com/oauth2/authorize?client_id=1350718874672435270&permissions=277025410048&integration_type=0&scope=bot

### 구현 목적
파인더스클럽 디스코드 특정 채널의 새 게시물 정보를 요약하여 데일리로 리포트해주는 챗봇입니다.
현생이 바쁘신 분들도! 디스코드에 익숙하지 않으신 분들도! 파인더스 클럽의 좋은 기회들을 쉽게 팔로우하여 파인클을 만끽하실 수 있으면 좋겠다는 마음에 제작하게 되었습니다.
추후 피드백을 바탕으로 기능을 변경 및 확장해나갈 계획입니다!

### 주요 기능
#### 오늘의 파인클!
User가 대화방 채널에서 '!today' 라는 메세지를 입력 시, 
아래 4개 채널에서 당일 올라온 게시글을 파싱하여 게시글의 링크와 작성자 이름, 간단한 요약본을 메세지 답장기능을 통해 알려줍니다.
1)아임파인더, 2)라운지토크, 3)재능플리마켓, 4)파인딩 챌린지
우선은 제가 사과방에서 매일 오후 10시~12시경 해당 메세지로 챗봇 리포트를 작동시킬 예정입니다!

**동작예시**
<img width="745" alt="기능캡쳐" src="https://github.com/user-attachments/assets/760edbb1-cb3a-4256-b60b-79f6162d41c3" />


### 디스코드 접근 권한
최소 해당 기능을 가진 디스코드 봇이 채널에 오프라인상태로 존재
![image](https://github.com/user-attachments/assets/ad195fc3-28af-4431-9d72-4fa49a4fd676)

discord scope  
- [✓] bot
discord bot권한
- [✓] View Channels
- [✓] Send Messages
- [✓] Send Messages In Threads
- [✓] Embed Links
- [✓] Use Slash Commands

### ETC
 - Local 서버 사용할 예정입니다. (서버 개발경험없음 이슈...)
 - 챗본은 대부분은 오프라인 상태로 존재할 예정이며, 리포트시에만 작동시킬 예정입니다.
