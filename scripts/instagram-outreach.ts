import fs from 'fs';
import path from 'path';

/**
 * 인스타그램, 유튜브, 틱톡 크리에이터 타겟팅 아웃리치 스크립트
 * 
 * 크리에이터의 계정 ID를 알고 있으므로, 사전에 해당 ID로 ref 링크를 생성하여
 * "가입 절차 없이 바로 복붙해 판매 수익을 가져갈 수 있는 전용 링크"를 포함한 제안 댓글/DM을 생성합니다.
 * 
 * 사용법:
 *  - 기본 실행: pnpm dlx tsx scripts/instagram-outreach.ts
 *  - 특정 크리에이터 타깃: pnpm dlx tsx scripts/instagram-outreach.ts --creator @mukbang_kim --product "두바이 쫀득 쿠키" --slug 두쫀쿠
 */

const LOG_FILE = path.join(process.cwd(), 'logs', 'marketing-activity.log');
const OUTREACH_FILE = path.join(process.cwd(), 'logs', 'outreach-queue.json');

const TARGET_PRESETS = [
  {
    creatorHandle: 'mukbang_daily',
    category: '먹방/디저트',
    productName: '두바이 쫀득 쿠키 (두쫀쿠)',
    slug: '두쫀쿠',
    hashtags: ['#두바이초콜릿', '#두바이쿠키', '#두쫀쿠', '#디저트먹방', '#간식추천'],
  },
  {
    creatorHandle: 'beauty_unnie',
    category: '뷰티/헤어',
    productName: '모레모 10초 물미역 헤어 트리트먼트',
    slug: '물미역트리트먼트',
    hashtags: ['#물미역트리트먼트', '#헤어에센스', '#머릿결관리', '#손상모복구', '#올영세일'],
  },
  {
    creatorHandle: 'it_tech_bro',
    category: 'IT/테크',
    productName: 'Apple 정품 아이폰 17 Pro Max',
    slug: '애플아이폰',
    hashtags: ['#아이폰17', '#아이폰17프로', '#아이폰자급제', '#애플언박싱', '#앱등이'],
  },
  {
    creatorHandle: 'glow_skin_lab',
    category: '스킨케어',
    productName: '달바 화이트 트러플 프리미엄 물광세럼',
    slug: '물광피부로션',
    hashtags: ['#달바미스트', '#물광피부', '#승무원미스트', '#보습세럼', '#스킨케어추천'],
  },
  {
    creatorHandle: 'chii_lover',
    category: '캐릭터/굿즈',
    productName: '먼작귀 치이카와 정품 봉제인형 & 키링',
    slug: '치이카와',
    hashtags: ['#치이카와', '#먼작귀', '#치이카와인형', '#키링추천', '#귀여운소품'],
  },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace(/^--/, '');
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
      parsed[key] = value;
      if (value !== 'true') i++;
    }
  }
  return parsed;
}

function generateProposals(creatorHandle: string, productName: string, slug: string) {
  const cleanHandle = creatorHandle.replace(/^@+/, '');
  const baseDomain = 'https://inchsales.vercel.app';
  const ytUrl = `${baseDomain}/p/${encodeURIComponent(slug)}?ref=${encodeURIComponent(cleanHandle)}&ch=youtube`;
  const instaUrl = `${baseDomain}/p/${encodeURIComponent(slug)}?ref=${encodeURIComponent(cleanHandle)}&ch=insta`;
  const tiktokUrl = `${baseDomain}/p/${encodeURIComponent(slug)}?ref=${encodeURIComponent(cleanHandle)}&ch=tiktok`;
  const statsUrl = `${baseDomain}/?id=${encodeURIComponent(cleanHandle)}`;

  const ytComment = `안녕하세요 @${cleanHandle}님! 영상 보신 분들이 [${productName}] 구매처를 많이 물어보셔서, @${cleanHandle}님 채널 전용으로 수익 정산 링크를 미리 준비해 두었습니다 😊\n👉 ${ytUrl}\n\n영상 고정댓글이나 더보기란에 이 링크만 복사해 두시면 시청자분들이 구매할 때마다 판매 수익 편하게 정산받으세요 ! (쿠팡 파트너스 별도 가입 불필요, 100원부터 즉시 출금 가능)`;

  const instaComment = `@${cleanHandle} 릴스 보고 [${productName}] 어디서 사는지 물어보는 분들 많길래 @${cleanHandle}님 전용 정산 링크 미리 만들어뒀어요! 🎁👉 ${instaUrl} 프로필 링크나 스토리에 걸어두시면 팬분들도 편하게 사고 판매 수익 편하게 정산받으세요 ! ✨`;

  const tiktokComment = `@${cleanHandle} 틱톡 보고 [${productName}] 어디서 사는지 물어보는 분들 많길래 @${cleanHandle}님 전용 정산 링크 미리 만들어뒀어요! 🎵👉 ${tiktokUrl} 프로필 바이오나 댓글에 달아두시고 판매 수익 편하게 정산받으세요 ! ✨`;

  const instaDm = `안녕하세요 @${cleanHandle} 크리에이터님! 매번 센스 넘치는 콘텐츠 즐겁게 보고 있습니다 ✨\n\n이번 콘텐츠에 소개해주신 [${productName}] 상품에 대해 팬분들의 구매 문의가 쇄도할 것 같아, 번거로운 제휴 가입 절차 없이 바로 수익화하실 수 있도록 @${cleanHandle}님 전용 정산 링크를 미리 생성해 두었습니다.\n\n🔗 @${cleanHandle}님 전용 정산 링크:\n${instaUrl}\n\n💡 핵심 혜택:\n1. 쿠팡 파트너스 별도 가입 불필요 (링크만 게시하면 즉시 유효)\n2. 플랫폼 최고 수준의 투명한 크리에이터 수익 정산\n3. ${baseDomain} 에서 '@${cleanHandle}' 입력 시 누적 클릭 및 수익 실시간 확인 & 100원부터 즉시 계좌 출금\n\n팬분들과의 소통과 채널 수익화에 든든한 날개가 되었으면 좋겠습니다. 항상 응원하겠습니다! 😊`;

  return {
    creatorHandle: cleanHandle,
    productName,
    slug,
    ytUrl,
    instaUrl,
    tiktokUrl,
    statsUrl,
    ytComment,
    instaComment,
    tiktokComment,
    instaDm,
  };
}

async function runOutreach() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🎯 [선발급 ref] 인플루언서 맞춤 제안문 생성기 작동 (유튜브 / 인스타 / 틱톡)`);

  const args = parseArgs();
  
  if (args.creator) {
    // 단일 타깃 모드
    const creator = args.creator;
    const product = args.product || '두바이 쫀득 쿠키';
    const slug = args.slug || '두쫀쿠';

    const proposal = generateProposals(creator, product, slug);

    console.log('\n======================================================');
    console.log(`✨ 타겟 크리에이터: @${proposal.creatorHandle}`);
    console.log(`📦 대상 상품: ${proposal.productName} (/p/${proposal.slug})`);
    console.log('======================================================\n');

    console.log('🎬 [유튜브 댓글용 제안문] --------------------------------');
    console.log(proposal.ytComment);
    console.log('\n📸 [인스타그램 댓글용 제안문] ----------------------------');
    console.log(proposal.instaComment);
    console.log('\n🎵 [틱톡 댓글용 제안문] ----------------------------------');
    console.log(proposal.tiktokComment);
    console.log('\n📩 [인스타그램 협업 제안 DM 전문] -------------------------');
    console.log(proposal.instaDm);
    console.log('\n📊 [크리에이터 실시간 정산 확인 링크] ----------------------');
    console.log(proposal.statsUrl);
    console.log('======================================================\n');
    return;
  }

  // 기본 프리셋 모드
  const items = TARGET_PRESETS.map((p) => ({
    ...p,
    ...generateProposals(p.creatorHandle, p.productName, p.slug),
  }));

  if (!fs.existsSync(path.dirname(OUTREACH_FILE))) {
    fs.mkdirSync(path.dirname(OUTREACH_FILE), { recursive: true });
  }

  fs.writeFileSync(OUTREACH_FILE, JSON.stringify({
    generatedAt: timestamp,
    totalTargetCreators: items.length,
    targets: items,
  }, null, 2), 'utf8');

  const logMessage = `[${timestamp}] 🎯 [크리에이터 맞춤 타깃팅] ${items.length}명 선발급 제안 큐 갱신 완료\n`;
  fs.appendFileSync(LOG_FILE, logMessage, 'utf8');

  console.log(`✅ ${items.length}개 타겟 크리에이터 대상 제안 세트가 생성되었습니다. (logs/outreach-queue.json)`);
  items.forEach((item, idx) => {
    console.log(`\n[${idx + 1}] @${item.creatorHandle} (${item.category} -> ${item.productName})`);
    console.log(`    🔗 유튜브 링크: ${item.ytUrl}`);
    console.log(`    🔗 인스타 링크: ${item.instaUrl}`);
    console.log(`    🔗 틱톡 링크: ${item.tiktokUrl}`);
    console.log(`    💬 틱톡 댓글 샘플: "${item.tiktokComment.slice(0, 60)}..."`);
  });
}

runOutreach().catch(console.error);
