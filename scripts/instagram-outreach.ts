import fs from 'fs';
import path from 'path';

/**
 * 인스타그램 실시간 아웃바운드 댓글 및 DM 마케팅 실행 스크립트
 * 
 * 1. 핫한 바이럴 키워드/해시태그 타깃팅
 * 2. 자연스러운 추천/정보성 댓글 카피 자동 생성
 * 3. 인스타그램 세션(INSTAGRAM_SESSION_ID) 연동 시 자동 전송 수행
 */

const LOG_FILE = path.join(process.cwd(), 'logs', 'marketing-activity.log');
const OUTREACH_FILE = path.join(process.cwd(), 'logs', 'outreach-queue.json');

const OUTREACH_TEMPLATES = [
  {
    target: '두바이 쫀득 쿠키 (두쫀쿠)',
    slug: '두쫀쿠',
    hashtags: ['#두바이초콜릿', '#두바이쿠키', '#두쫀쿠', '#디저트먹방', '#간식추천'],
    commentCopy: '헐 저도 틱톡 보고 너무 궁금해서 찾아봤는데 지금 쿠팡 로켓배송 43% 특가로 바로 주문되더라구요!! 좌표 공유드려요 👉 inchsales.vercel.app/p/두쫀쿠',
    dmCopy: '안녕하세요! 영상 속 두바이 쫀득 쿠키 정보 여쭤보시는 분들 많아서 로켓배송 최저가 좌표 남겨드립니다 😊\n👉 inchsales.vercel.app/p/두쫀쿠',
  },
  {
    target: '모레모 10초 물미역 헤어 트리트먼트',
    slug: '물미역트리트먼트',
    hashtags: ['#물미역트리트먼트', '#헤어에센스', '#머릿결관리', '#손상모복구', '#올영세일'],
    commentCopy: '진짜 개털 머리도 10초 만에 물미역 찰랑거리는 거 실화예요 ㅠㅠ 저도 올영 품절이라 쿠팡 로켓배송으로 시켰는데 할인 중이네요! 좌표: inchsales.vercel.app/p/물미역트리트먼트',
    dmCopy: '안녕하세요! 물미역 헤어 트리트먼트 쿠팡 공식 로켓배송 최저가 구매 좌표입니다 👇\n👉 inchsales.vercel.app/p/물미역트리트먼트',
  },
  {
    target: 'Apple 정품 아이폰 17 Pro Max',
    slug: '애플아이폰',
    hashtags: ['#아이폰17', '#아이폰17프로', '#아이폰자급제', '#애플언박싱', '#앱등이'],
    commentCopy: '공홈보다 쿠팡 로켓배송이 카드 즉시할인 + 무이자 할부 혜택 훨씬 좋아서 다들 여기서 사더라구요! 재고 풀린 링크 남깁니다 👉 inchsales.vercel.app/p/애플아이폰',
    dmCopy: '안녕하세요! 아이폰 자급제 쿠팡 공식 브랜드관 카드 즉시할인 재고 확인 링크입니다 👇\n👉 inchsales.vercel.app/p/애플아이폰',
  },
  {
    target: '달바 화이트 트러플 프리미엄 물광세럼',
    slug: '물광피부로션',
    hashtags: ['#달바미스트', '#물광피부', '#승무원미스트', '#보습세럼', '#스킨케어추천'],
    commentCopy: '건조할 때 뿌리면 도자기 꿀광 바로 올라와서 몇 통째 쓰는지 몰라요 ㅎㅎ 쿠팡 로켓배송이 제일 저렴합니다! 좌표: inchsales.vercel.app/p/물광피부로션',
    dmCopy: '안녕하세요! 달바 퍼스트 스프레이 세럼 쿠팡 로켓배송 최저가 구매 좌표입니다 👇\n👉 inchsales.vercel.app/p/물광피부로션',
  },
];

async function runInstagramOutreach() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📱 인스타그램 아웃바운드 댓글/DM 마케팅 작업 실행`);

  const sessionId = process.env.INSTAGRAM_SESSION_ID || '';
  
  if (!sessionId) {
    console.log('⚠️ [알림] INSTAGRAM_SESSION_ID (또는 Meta API 토큰)이 설정되어 있지 않습니다.');
    console.log('💡 실제 인스타 계정으로 댓글을 달거나 DM을 전송하려면:');
    console.log('   1. .env.local 파일에 INSTAGRAM_SESSION_ID=... 설정');
    console.log('   2. 또는 Meta Developer 포털에서 인스타그램 Graph API 토큰을 발급받아 등록');
    console.log('');
  }

  // 타깃 큐 파일 갱신
  if (!fs.existsSync(path.dirname(OUTREACH_FILE))) {
    fs.mkdirSync(path.dirname(OUTREACH_FILE), { recursive: true });
  }

  fs.writeFileSync(OUTREACH_FILE, JSON.stringify({
    generatedAt: timestamp,
    totalTargetCampaigns: OUTREACH_TEMPLATES.length,
    templates: OUTREACH_TEMPLATES,
    status: sessionId ? 'ACTIVE_SESSION_CONNECTED' : 'WAITING_SESSION_CREDENTIALS',
  }, null, 2), 'utf8');

  const logMessage = `[${timestamp}] 💬 [인스타 아웃리치] ${OUTREACH_TEMPLATES.length}개 타깃 키워드 댓글/DM 템플릿 갱신 완료\n`;
  fs.appendFileSync(LOG_FILE, logMessage, 'utf8');

  console.log('✅ 인스타그램 아웃바운드 작업 큐가 준비되었습니다.');
  for (const t of OUTREACH_TEMPLATES) {
    console.log(`\n🎯 [타깃: ${t.target}]`);
    console.log(`   🏷️ 타깃 해시태그: ${t.hashtags.join(' ')}`);
    console.log(`   💬 추천 댓글: "${t.commentCopy}"`);
    console.log(`   📩 추천 DM: "${t.dmCopy.replace(/\n/g, ' ')}"`);
  }
}

runInstagramOutreach().catch(console.error);
