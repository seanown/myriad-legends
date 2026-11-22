/* First-run onboarding + sign-in nudges for MYRIAD LEGENDS (Sean 2026-11-22).
   Concepts from WikiGacha's first-run screens, our own look: starfield, gold, 五行.
   Uses globals from index.html: S, save, L, $, esc, CARDS, BYRAR, bigCardHTML, setImg, packSVG,
   gInit, gLib, gSignedIn, openCloud, toast, today, RAR, OBO_SUB. */
(function(){
const OB={
zh_hant:{risk:'引繼碼要自己保管好：弄丟就找不回帳號，別人拿到也能登入。建議用 Google 登入。',skip:'跳過',next:'下一步',go:'開始召喚！',
 t1:'歡迎來到萬象傳奇錄',s1:'神話、英雄、國寶，萬象化為傳奇卡牌。收集它們，組成你的隊伍。',
 t2:'開啟你的第一包！',hw:'玩法說明',h:['每包 6 張卡，每張都獨立抽出','每分鐘恢復 1 包，最多存 10 包','每 10 包必出金卡包（SR 以上）','5 種卡牌：角色、寶物、神兵、名馬、戰場'],
 t3:'收集與稀有度',s3:'7 種稀有度，從 C 到 EXR。越稀有，邊框與光效越華麗。',lux:'LUX：全世界只有一張（即將推出）',
 t4:'組隊對戰',s4:'5 名角色 + 1 張戰場卡出陣。善用五行相剋與神魔互剋。',b:['每日首領戰','單人隨機對戰','好友對戰（隊伍碼）','修行與飛升'],
 t5:'別讓卡牌消失！',s5:'你的卡牌現在只存在這台裝置上。清除瀏覽器資料或換手機就會消失。登入後永久保存，每台裝置都能玩同一份。',
 code:'使用引繼碼',later:'稍後再說（右上角「登入」隨時可設定）',safe:'你的卡牌已受保護',id:'玩家編號',comm:'加入社群',
 nt:r=>`恭喜抽到 ${r}！`,ns:'這張卡目前只存在這台裝置上。登入一下，永久保存你的收藏。',nl:'先不用',np:n=>`已開 ${n} 包！你的收藏越來越珍貴了。`},
zh_hans:{risk:'引继码要自己保管好：弄丢就找不回账号，别人拿到也能登录。建议用 Google 登录。',skip:'跳过',next:'下一步',go:'开始召唤！',
 t1:'欢迎来到万象传奇录',s1:'神话、英雄、国宝，万象化为传奇卡牌。收集它们，组成你的队伍。',
 t2:'开启你的第一包！',hw:'玩法说明',h:['每包 6 张卡，每张都独立抽出','每分钟恢复 1 包，最多存 10 包','每 10 包必出金卡包（SR 以上）','5 种卡牌：角色、宝物、神兵、名马、战场'],
 t3:'收集与稀有度',s3:'7 种稀有度，从 C 到 EXR。越稀有，边框与光效越华丽。',lux:'LUX：全世界只有一张（即将推出）',
 t4:'组队对战',s4:'5 名角色 + 1 张战场卡出阵。善用五行相克与神魔互克。',b:['每日首领战','单人随机对战','好友对战（队伍码）','修行与飞升'],
 t5:'别让卡牌消失！',s5:'你的卡牌现在只存在这台设备上。清除浏览器数据或换手机就会消失。登录后永久保存，每台设备都能玩同一份。',
 code:'使用引继码',later:'稍后再说（右上角「登录」随时可设置）',safe:'你的卡牌已受保护',id:'玩家编号',comm:'加入社群',
 nt:r=>`恭喜抽到 ${r}！`,ns:'这张卡目前只存在这台设备上。登录一下，永久保存你的收藏。',nl:'先不用',np:n=>`已开 ${n} 包！你的收藏越来越珍贵了。`},
ja:{risk:'引き継ぎコードは自分で大切に保管してください。なくすとアカウントは戻せず、他人に知られるとログインされます。Google ログインがおすすめです。',skip:'スキップ',next:'次へ',go:'召喚スタート！',
 t1:'萬象傳奇錄へようこそ',s1:'神話、英雄、国宝。万象が伝説のカードになる。集めて、自分だけのチームを作ろう。',
 t2:'最初のパックを開けよう！',hw:'遊び方',h:['1パック6枚、1枚ずつ独立して抽選','1分ごとに1パック回復、最大10パック','10パックごとにゴールドパック（SR以上）','カードは5種類：キャラ、宝物、神兵、名馬、戦場'],
 t3:'コレクションとレアリティ',s3:'レアリティは C から EXR まで7段階。レアほど枠と光が豪華に。',lux:'LUX：世界に1枚だけ（近日登場）',
 t4:'チームでバトル',s4:'キャラ5人＋戦場カード1枚で出陣。五行相剋と神魔の相剋を活かそう。',b:['デイリーボス戦','ソロランダムバトル','フレンド対戦（チームコード）','修行と飛昇'],
 t5:'カードを失わないで！',s5:'カードは今この端末にだけ保存されています。ブラウザのデータ削除や機種変更で消えてしまいます。ログインすれば永久保存、どの端末でも同じデータで遊べます。',
 code:'引き継ぎコードを使う',later:'あとで（右上の「ログイン」からいつでも）',safe:'カードは保護されています',id:'プレイヤー番号',comm:'コミュニティに参加',
 nt:r=>`${r} 獲得おめでとう！`,ns:'このカードは今この端末にしかありません。ログインしてコレクションを永久保存しよう。',nl:'あとで',np:n=>`${n} パック開封！コレクションがどんどん貴重に。`},
ko:{risk:'인계 코드는 직접 잘 보관하세요. 잃어버리면 계정을 되찾을 수 없고, 다른 사람이 알면 로그인할 수 있습니다. Google 로그인을 권장합니다.',skip:'건너뛰기',next:'다음',go:'소환 시작!',
 t1:'만상전기록에 오신 것을 환영합니다',s1:'신화, 영웅, 국보. 만상이 전설의 카드가 됩니다. 모아서 나만의 팀을 만드세요.',
 t2:'첫 번째 팩을 열어 보세요!',hw:'플레이 방법',h:['팩당 카드 6장, 한 장씩 독립 추첨','1분마다 1팩 회복, 최대 10팩','10팩마다 골드 팩 (SR 이상)','카드 5종류: 캐릭터, 보물, 신병, 명마, 전장'],
 t3:'수집과 희귀도',s3:'희귀도는 C부터 EXR까지 7단계. 희귀할수록 테두리와 빛이 화려해집니다.',lux:'LUX: 전 세계에 단 한 장 (출시 예정)',
 t4:'팀 배틀',s4:'캐릭터 5명 + 전장 카드 1장으로 출전. 오행 상극과 신마 상극을 활용하세요.',b:['일일 보스전','솔로 랜덤 배틀','친구 대전 (팀 코드)','수행과 비승'],
 t5:'카드를 잃지 마세요!',s5:'카드는 지금 이 기기에만 저장되어 있습니다. 브라우저 데이터를 지우거나 폰을 바꾸면 사라집니다. 로그인하면 영구 보관되고 어느 기기에서나 같은 데이터로 플레이할 수 있습니다.',
 code:'인계 코드 사용',later:'나중에 (오른쪽 위 「로그인」에서 언제든지)',safe:'카드가 보호되고 있습니다',id:'플레이어 번호',comm:'커뮤니티 참여',
 nt:r=>`${r} 획득 축하합니다!`,ns:'이 카드는 지금 이 기기에만 있습니다. 로그인해서 컬렉션을 영구 보관하세요.',nl:'나중에',np:n=>`${n}팩 개봉! 컬렉션이 점점 귀해지고 있어요.`},
en:{risk:'Keep your transfer code safe: lose it and the account cannot be recovered, and anyone who has it can log in. Google sign-in is recommended.',skip:'Skip',next:'Next',go:'Start summoning!',
 t1:'Welcome to MYRIAD LEGENDS',s1:'Myths, heroes and national treasures, all turned into legendary cards. Collect them and build your team.',
 t2:'Open your first pack!',hw:'How it works',h:['6 cards per pack, each rolled on its own','1 free pack every minute, hold up to 10','Every 10th pack is a Gold pack (SR or better)','5 card types: characters, treasures, weapons, steeds, battlefields'],
 t3:'Collect & compete',s3:'7 rarity tiers from C to EXR. The rarer the card, the more dazzling its frame and shine.',lux:'LUX: only one copy in the whole world (coming soon)',
 t4:'Battle with your team',s4:'Field 5 characters plus 1 battlefield card. Use the Five Elements and the god vs demon counters.',b:['Daily boss','Solo random battle','Friend battle (team code)','Training and ascension'],
 t5:"Don't lose your cards!",s5:'Right now your cards live only on this device. Clearing browser data or changing phones wipes them. Sign in to keep them safe forever and play the same collection on every device.',
 code:'Use a transfer code',later:"Later (tap “Sign in” at the top any time)",safe:'Your cards are protected',id:'Player ID',comm:'Join the community',
 nt:r=>`You pulled ${r}!`,ns:'This card only exists on this device right now. Sign in to keep your collection safe forever.',nl:'Not now',np:n=>`${n} packs opened! Your collection is getting valuable.`},
es:{risk:'Guarda bien tu código: si lo pierdes no se puede recuperar la cuenta, y quien lo tenga puede entrar. Recomendamos entrar con Google.',skip:'Saltar',next:'Siguiente',go:'¡A invocar!',
 t1:'Bienvenido a MYRIAD LEGENDS',s1:'Mitos, héroes y tesoros nacionales convertidos en cartas legendarias. Colecciónalos y forma tu equipo.',
 t2:'¡Abre tu primer sobre!',hw:'Cómo funciona',h:['6 cartas por sobre, cada una se sortea por separado','1 sobre gratis cada minuto, hasta 10 guardados','Cada 10 sobres, un sobre dorado (SR o más)','5 tipos de carta: personajes, tesoros, armas, corceles y campos de batalla'],
 t3:'Colecciona y compite',s3:'7 niveles de rareza, de C a EXR. Cuanto más rara, más brillan su marco y sus efectos.',lux:'LUX: una sola copia en todo el mundo (próximamente)',
 t4:'Combate en equipo',s4:'Saca 5 personajes y 1 carta de campo de batalla. Aprovecha los Cinco Elementos y el choque entre dioses y demonios.',b:['Jefe diario','Combate aleatorio en solitario','Duelo con amigos (código de equipo)','Entrenamiento y ascensión'],
 t5:'¡No pierdas tus cartas!',s5:'Ahora tus cartas solo están en este dispositivo. Si borras los datos del navegador o cambias de móvil, desaparecen. Inicia sesión para guardarlas para siempre y jugar la misma colección en cualquier dispositivo.',
 code:'Usar un código de transferencia',later:'Más tarde («Entrar» arriba, cuando quieras)',safe:'Tus cartas están protegidas',id:'ID de jugador',comm:'Únete a la comunidad',
 nt:r=>`¡Has conseguido ${r}!`,ns:'Esta carta solo existe en este dispositivo. Inicia sesión para guardar tu colección para siempre.',nl:'Ahora no',np:n=>`¡${n} sobres abiertos! Tu colección vale cada vez más.`},
fr:{risk:'Gardez votre code précieusement : perdu, le compte est irrécupérable, et quiconque le possède peut se connecter. La connexion Google est recommandée.',skip:'Passer',next:'Suivant',go:"C'est parti !",
 t1:'Bienvenue dans MYRIAD LEGENDS',s1:'Mythes, héros et trésors nationaux transformés en cartes légendaires. Collectionnez-les et formez votre équipe.',
 t2:'Ouvrez votre premier paquet !',hw:'Comment ça marche',h:['6 cartes par paquet, chacune tirée séparément','1 paquet gratuit par minute, jusqu’à 10 en réserve','Tous les 10 paquets, un paquet doré (SR ou mieux)','5 types de cartes : personnages, trésors, armes, montures, champs de bataille'],
 t3:'Collectionnez et affrontez',s3:'7 niveaux de rareté, de C à EXR. Plus la carte est rare, plus son cadre et ses effets brillent.',lux:'LUX : un seul exemplaire au monde (bientôt)',
 t4:'Combattez en équipe',s4:'Alignez 5 personnages et 1 carte champ de bataille. Jouez avec les Cinq Éléments et l’opposition dieux / démons.',b:['Boss quotidien','Combat solo aléatoire','Duel entre amis (code d’équipe)','Entraînement et ascension'],
 t5:'Ne perdez pas vos cartes !',s5:'Pour l’instant, vos cartes ne sont que sur cet appareil. Effacer les données du navigateur ou changer de téléphone les supprime. Connectez-vous pour les garder pour toujours et jouer la même collection partout.',
 code:'Utiliser un code de transfert',later:'Plus tard (« Connexion » en haut, à tout moment)',safe:'Vos cartes sont protégées',id:'ID joueur',comm:'Rejoindre la communauté',
 nt:r=>`Vous avez obtenu ${r} !`,ns:'Cette carte n’existe que sur cet appareil. Connectez-vous pour protéger votre collection pour toujours.',nl:'Plus tard',np:n=>`${n} paquets ouverts ! Votre collection prend de la valeur.`},
pt:{risk:'Guarde bem seu código: se perder, a conta não pode ser recuperada, e quem tiver o código pode entrar. Recomendamos entrar com o Google.',skip:'Pular',next:'Próximo',go:'Começar a invocar!',
 t1:'Bem-vindo ao MYRIAD LEGENDS',s1:'Mitos, heróis e tesouros nacionais transformados em cartas lendárias. Colecione e monte seu time.',
 t2:'Abra seu primeiro pacote!',hw:'Como funciona',h:['6 cartas por pacote, cada uma sorteada separadamente','1 pacote grátis por minuto, até 10 guardados','A cada 10 pacotes, um pacote dourado (SR ou melhor)','5 tipos de carta: personagens, tesouros, armas, montarias e campos de batalha'],
 t3:'Colecione e dispute',s3:'7 níveis de raridade, de C a EXR. Quanto mais rara, mais brilham a moldura e os efeitos.',lux:'LUX: uma única cópia no mundo inteiro (em breve)',
 t4:'Batalhe com seu time',s4:'Escale 5 personagens e 1 carta de campo de batalha. Use os Cinco Elementos e o confronto entre deuses e demônios.',b:['Chefe diário','Batalha solo aleatória','Duelo com amigos (código de time)','Treino e ascensão'],
 t5:'Não perca suas cartas!',s5:'Agora suas cartas estão só neste aparelho. Limpar os dados do navegador ou trocar de celular apaga tudo. Entre para guardá-las para sempre e jogar a mesma coleção em qualquer aparelho.',
 code:'Usar código de transferência',later:'Depois (toque em «Entrar» no topo quando quiser)',safe:'Suas cartas estão protegidas',id:'ID do jogador',comm:'Entre na comunidade',
 nt:r=>`Você tirou ${r}!`,ns:'Esta carta só existe neste aparelho. Entre para guardar sua coleção para sempre.',nl:'Agora não',np:n=>`${n} pacotes abertos! Sua coleção está ficando valiosa.`}
};
// Community links: shown only when filled in (Sean to confirm which ones exist).
const COMMUNITY=[/* {n:'Discord',u:'https://discord.gg/…',c:'#5865f2'} */];
const O=k=>(OB[L]||OB.en)[k];
const signed=()=>!!S.cloud;
const LUXN='LEGENDARY UX';

const css=`
.ob-ov{position:fixed;inset:0;z-index:38;display:flex;flex-direction:column;align-items:center;color:var(--ink);
 background:radial-gradient(ellipse at 50% 30%,#1b1530 0%,#0a0812 55%,#040307 100%);overflow:hidden}
.ob-ov:before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.7;
 background-image:radial-gradient(1px 1px at 12% 20%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 72% 12%,#fff 50%,transparent 51%),radial-gradient(1.5px 1.5px at 40% 70%,#f5d995 50%,transparent 51%),radial-gradient(1px 1px at 85% 60%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 25% 88%,#fff 50%,transparent 51%),radial-gradient(1.5px 1.5px at 60% 40%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 92% 85%,#f5d995 50%,transparent 51%),radial-gradient(1px 1px at 5% 55%,#fff 50%,transparent 51%);
 animation:obtw 6s ease-in-out infinite alternate}
@keyframes obtw{from{opacity:.4}to{opacity:.85}}
.ob-top{position:relative;width:100%;max-width:560px;display:flex;justify-content:flex-end;padding:calc(env(safe-area-inset-top,0px) + 12px) 16px 0}
.ob-skip{background:none;border:0;color:var(--muted);font-family:inherit;font-weight:600;font-size:14px;cursor:pointer;padding:6px 8px}
.ob-track{position:relative;flex:1;width:100%;max-width:560px;overflow:hidden}
.ob-rail{display:flex;height:100%;transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.ob-sl{flex:0 0 100%;height:100%;overflow-y:auto;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:8px 20px 12px;text-align:center}
.ob-sl>:first-child{margin-top:auto!important}.ob-sl>:last-child{margin-bottom:auto!important}
.ob-card.sm{width:min(150px,40vw)}
.ob-risk{font-size:12px;color:#e9a08f;line-height:1.45;max-width:320px}
.ob-sl h2{margin:16px 0 8px;font:900 clamp(22px,6vw,30px)/1.25 "Noto Serif TC","Songti TC",serif;color:#fff;letter-spacing:.5px}
.ob-sl h2 .g{background:linear-gradient(180deg,#fff1c1,#d9a640);-webkit-background-clip:text;background-clip:text;color:transparent}
.ob-sl p.s{margin:0 auto;max-width:420px;color:#d8cfbf;font-size:15px;line-height:1.6}
.ob-card{width:min(210px,52vw);filter:drop-shadow(0 0 26px color-mix(in srgb,var(--glow,#e3b866) 55%,transparent));animation:obfl 4s ease-in-out infinite}
.ob-card .tcard{width:100%!important;animation:none}
@keyframes obfl{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.ob-pack{width:min(150px,38vw);animation:obfl 3.5s ease-in-out infinite;filter:drop-shadow(0 0 22px rgba(227,184,102,.45))}.ob-pack svg{width:100%;height:auto;display:block}
.ob-tap{margin-top:8px;color:var(--gold2);font-family:inherit;font-weight:800;font-size:13px;line-height:1;letter-spacing:3px}
.ob-how{margin-top:14px;width:100%;max-width:420px;text-align:left;border:1px solid rgba(227,184,102,.45);border-radius:14px;padding:12px 16px;background:rgba(20,15,28,.7)}
.ob-how b{color:var(--gold);font-size:15px}.ob-how ul{list-style:none;margin:8px 0 0;padding:0}.ob-how li{display:flex;gap:10px;align-items:flex-start;padding:5px 0;font-size:14px;line-height:1.45;color:#e8e0d0}
.ob-how li i{font-style:normal;width:22px;flex:none;text-align:center}
.ob-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:14px;max-width:440px}
.ob-chip{border:1.5px solid var(--c);color:var(--c);border-radius:999px;padding:3px 10px;white-space:nowrap;font-family:inherit;font-weight:700;font-size:12px;line-height:1.2;background:color-mix(in srgb,var(--c) 10%,transparent);box-shadow:0 0 10px color-mix(in srgb,var(--c) 35%,transparent)}
.ob-chip b{margin-right:5px}
.ob-chip.lux{--c:#fff;border-image:linear-gradient(90deg,#ff6b6b,#ffd24a,#5fd18f,#5aa7ff,#c58cff) 1;border-radius:0;background:linear-gradient(90deg,rgba(255,107,107,.15),rgba(197,140,255,.15))}
.ob-luxn{margin-top:10px;font-size:13px;color:#cfc4ae}
.ob-orbs{display:flex;gap:10px;justify-content:center;margin:6px 0 4px}
.ob-orbs span{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font:900 20px "Noto Serif TC",serif;color:#fff;box-shadow:inset 0 -4px 10px rgba(0,0,0,.45),0 0 14px var(--o);background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--o) 60%,#fff),var(--o) 60%,color-mix(in srgb,var(--o) 60%,#000))}
.ob-bat{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px;width:100%;max-width:420px}
.ob-bat div{border:1px solid rgba(227,184,102,.35);border-radius:12px;padding:10px 8px;background:rgba(20,15,28,.7);font-size:13.5px}
.ob-pair{display:flex;align-items:center;justify-content:center;gap:4px;padding:12px 0 6px;position:relative}
.ob-pair .ob-card{width:min(124px,31vw);animation:none}
.ob-pair .ob-card:first-child{transform:rotate(-9deg) translateY(8px)}.ob-pair .ob-card:last-child{transform:rotate(9deg) translateY(8px)}
.ob-cloud{position:absolute;left:50%;top:50%;transform:translate(-50%,-30%);width:58px;height:58px;border-radius:50%;display:grid;place-items:center;font-size:26px;z-index:3;
 background:radial-gradient(circle,#2a2140,#120d1d);border:2px solid var(--gold);box-shadow:0 0 24px rgba(227,184,102,.6);animation:obpulse 1.8s ease-in-out infinite}
@keyframes obpulse{0%,100%{box-shadow:0 0 14px rgba(227,184,102,.45)}50%{box-shadow:0 0 34px rgba(227,184,102,.9)}}
.ob-sign{display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:16px;width:100%;max-width:340px}
.ob-gb{min-height:44px;display:flex;justify-content:center}
.ob-code{width:100%;padding:11px 16px;border-radius:999px;border:1.5px solid var(--gold);background:rgba(227,184,102,.08);color:var(--gold2);font-family:inherit;font-weight:700;font-size:15px;cursor:pointer}
.ob-later{background:none;border:0;color:var(--muted);font-family:inherit;font-weight:600;font-size:13px;cursor:pointer;text-decoration:underline;padding:6px}
.ob-safe{margin-top:16px;padding:12px 18px;border-radius:14px;border:1.5px solid var(--jade);color:#bff0dc;background:rgba(95,179,154,.12);font-weight:700}
.ob-safe small{display:block;margin-top:4px;color:#e8e0d0;font-weight:600}
.ob-comm{margin-top:14px;font-size:12px;color:var(--muted)}.ob-comm div{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:6px}
.ob-comm a{padding:6px 14px;border-radius:999px;color:#fff;text-decoration:none;font-family:inherit;font-weight:700;font-size:13px;background:var(--c)}
.ob-bot{position:relative;width:100%;max-width:560px;display:flex;align-items:center;justify-content:space-between;padding:10px 20px calc(env(safe-area-inset-bottom,0px) + 18px)}
.ob-dots{display:flex;gap:6px}.ob-dots i{width:7px;height:7px;border-radius:4px;background:#4a4252;transition:all .3s}.ob-dots i.on{width:24px;background:var(--gold)}
.ob-next{min-width:120px;padding:12px 22px;border-radius:14px;border:0;font-family:inherit;font-weight:800;font-size:16px;color:#1a1206;cursor:pointer;background:linear-gradient(180deg,#f5d995,#d9a640);box-shadow:0 4px 18px rgba(227,184,102,.4)}
.ob-nudge{position:fixed;inset:0;z-index:44;display:flex;align-items:flex-end;justify-content:center;background:rgba(5,4,7,.7);animation:obin .25s ease-out}
@keyframes obin{from{opacity:0}to{opacity:1}}
.ob-nbox{position:relative;width:100%;max-width:440px;margin:0 12px calc(env(safe-area-inset-bottom,0px) + 12px);border-radius:18px;padding:20px 18px 14px;text-align:center;
 background:radial-gradient(ellipse at 50% 0%,#2a2140,#0f0b17 70%);border:1.5px solid var(--gold);box-shadow:0 0 40px rgba(227,184,102,.35);animation:obup .3s cubic-bezier(.2,.8,.2,1)}
@keyframes obup{from{transform:translateY(40px)}to{transform:none}}
.ob-nbox h3{margin:4px 0 6px;font:900 22px "Noto Serif TC",serif;color:#fff}.ob-nbox p{margin:0 0 4px;color:#d8cfbf;font-size:14px;line-height:1.55}
.ob-nbox .ob-sign{margin:12px auto 0}
.ob-lock{display:inline-grid;place-items:center;width:50px;height:50px;border-radius:50%;font-size:24px;border:2px solid var(--gold);background:#1a1426;animation:obpulse 1.8s ease-in-out infinite}
`;
function addCss(){if(document.getElementById('obCss'))return;const s=document.createElement('style');s.id='obCss';s.textContent=css;document.head.appendChild(s)}

function pick(rar,n){const out=[];for(const r of rar){const a=(BYRAR[r]||[]).filter(c=>c.k==='char'&&c.m);for(const c of a){out.push(c);if(out.length>=n)return out}}
  for(const r of rar)for(const c of (BYRAR[r]||[])){if(!out.includes(c))out.push(c);if(out.length>=n)return out}return out}
const cardBox=(c,glow)=>c?`<div class="ob-card" style="--glow:var(--r${c.y})" data-obc="${c.i}">${bigCardHTML(c,false)}</div>`:'';
const RCHIP=['EXR','UR','SSR','SR','R','UC','C'];

function signBlock(where){
  if(signed())return `<div class="ob-safe">✓ ${O('safe')}${S.uid?`<small>${O('id')} #${S.uid}</small>`:''}</div>`;
  return `<div class="ob-sign"><div class="ob-gb" data-obg="${where}"></div><button class="ob-code" data-obcode>🔑 ${O('code')}</button><div class="ob-risk">⚠ ${O('risk')}</div>${where==='ob'?`<button class="ob-later" data-oblater>${O('later')}</button>`:''}</div>`;
}
async function gRender(host){const el=host.querySelector('[data-obg]');if(!el)return;
  try{const id=await gInit();if(!id){el.remove();return}await gLib();
    google.accounts.id.initialize({client_id:id,callback:gSignedIn});
    google.accounts.id.renderButton(el,{theme:'filled_black',size:'large',shape:'pill',width:300,text:'signin_with',locale:({zh_hant:'zh-TW',zh_hans:'zh-CN'})[L]||L})}catch(e){el.remove()}}
function bindSign(host,close){
  const c=host.querySelector('[data-obcode]');if(c)c.onclick=()=>{openCloud()};
  const l=host.querySelector('[data-oblater]');if(l)l.onclick=close;
  gRender(host);
}

function slides(){
  const [hero]=pick(['EXR','UR'],1),[ur]=pick(['UR','SSR'],1),[r]=pick(['R','SR'],1);
  const how=O('h'),ic=['🃏','⏳','✨','⚔️'];
  const chips=RCHIP.map(k=>`<span class="ob-chip" style="--c:var(--r${k})"><b>${k}</b>${OBO_SUB[k]}</span>`).join('');
  const orb=[['木','#3f9a5a'],['火','#c8402c'],['土','#c9a23a'],['金','#cfcfd6'],['水','#2b3550']].map(([t,c])=>`<span style="--o:${c}">${t}</span>`).join('');
  const bat=O('b'),bic=['🐉','🎲','🤝','🏯'];
  const comm=COMMUNITY.length?`<div class="ob-comm">${O('comm')}<div>${COMMUNITY.map(x=>`<a href="${esc(x.u)}" target="_blank" rel="noopener" style="--c:${x.c}">${esc(x.n)}</a>`).join('')}</div></div>`:'';
  return [
   `${cardBox(hero)}<h2><span class="g">${O('t1')}</span></h2><p class="s">${O('s1')}</p>`,
   `<h2>${O('t2')}</h2><div class="ob-pack">${packSVG('white')}</div><div class="ob-tap">▲ ${T('tap_open').replace(/[▲\s]/g,'')||'TAP'} ▲</div>
    <div class="ob-how"><b>${O('hw')}</b><ul>${how.map((x,i)=>`<li><i>${ic[i]}</i><span>${x}</span></li>`).join('')}</ul></div>`,
   `${cardBox(ur).replace('ob-card','ob-card sm')}<h2>${O('t3')}</h2><p class="s">${O('s3')}</p><div class="ob-chips"><span class="ob-chip lux"><b>LUX</b>${LUXN}</span>${chips}</div><div class="ob-luxn">✦ ${O('lux')}</div>`,
   `<div class="ob-orbs">${orb}</div><h2>${O('t4')}</h2><p class="s">${O('s4')}</p><div class="ob-bat">${bat.map((x,i)=>`<div>${bic[i]} ${x}</div>`).join('')}</div>`,
   `<div class="ob-pair">${cardBox(r)}<div class="ob-cloud">${signed()?'✓':'☁'}</div>${cardBox(ur)}</div><h2>${O('t5')} 🔒</h2><p class="s">${O('s5')}</p><div data-obsign>${signBlock('ob')}</div>${comm}`
  ];
}

let cur=0;
function obShow(after,start){
  addCss();document.getElementById('obOv')?.remove();
  const sl=slides(),n=sl.length;cur=Math.min(start||0,n-1);
  const host=document.createElement('div');host.className='ob-ov';host.id='obOv';
  host.innerHTML=`<div class="ob-top"><button class="ob-skip" data-obskip>${O('skip')}</button></div>
   <div class="ob-track"><div class="ob-rail">${sl.map(h=>`<div class="ob-sl">${h}</div>`).join('')}</div></div>
   <div class="ob-bot"><div class="ob-dots">${sl.map(()=>'<i></i>').join('')}</div><button class="ob-next" data-obnext></button></div>`;
  document.body.appendChild(host);
  host.querySelectorAll('[data-obc]').forEach(el=>{const c=BYID[el.dataset.obc];const a=el.querySelector('[data-art]');if(c&&a)setImg(a,c)});
  const rail=host.querySelector('.ob-rail'),dots=[...host.querySelectorAll('.ob-dots i')],nx=host.querySelector('[data-obnext]');
  const close=()=>{S.onboarded=Date.now();save();host.remove();if(after)after()};
  const show=()=>{rail.style.transform=`translateX(${-cur*100}%)`;dots.forEach((d,i)=>d.classList.toggle('on',i===cur));nx.textContent=cur===n-1?O('go'):O('next');host.querySelector('[data-obskip]').style.visibility=cur===n-1?'hidden':''};
  nx.onclick=()=>{if(cur<n-1){cur++;show()}else close()};
  host.querySelector('[data-obskip]').onclick=()=>{cur=n-1;show()}; // skip jumps to the sign-in step, never past it
  let x0=null;host.addEventListener('touchstart',e=>{x0=e.touches[0].clientX},{passive:true});
  host.addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)<50)return;cur=Math.max(0,Math.min(n-1,cur+(dx<0?1:-1)));show()});
  addEventListener('keydown',function k(e){if(!document.body.contains(host)){removeEventListener('keydown',k);return}if(e.key==='ArrowRight'){cur=Math.min(n-1,cur+1);show()}if(e.key==='ArrowLeft'){cur=Math.max(0,cur-1);show()}});
  bindSign(host,close);show();
}
// Called after any sign-in / code change: refresh open onboarding or nudge.
function obSigned(){
  const ov=document.getElementById('obOv');if(ov){const b=ov.querySelector('[data-obsign]');if(b)b.innerHTML=signBlock('ob');const cl=ov.querySelector('.ob-cloud');if(cl)cl.textContent=signed()?'✓':'☁';bindSign(ov,()=>ov.querySelector('[data-obnext]').click())}
  const nd=document.getElementById('obNudge');if(nd&&signed()){nd.querySelector('.ob-sign')?.replaceWith(Object.assign(document.createElement('div'),{innerHTML:signBlock('nd')}));setTimeout(()=>nd.remove(),1600)}
}
// Keep reminding unsigned players: first SR+ pull, then at 30 / 100 / 300 / 1000 packs. At most once a day after the first.
const MILE=[30,100,300,1000];
function obNudge(res){
  if(signed()||document.getElementById('obNudge')||document.getElementById('obOv'))return;
  const best=res.reduce((a,r)=>RAR.indexOf(r.c.y)>RAR.indexOf(a)?r.c.y:a,'C');
  const ns=S.nudge||(S.nudge={sr:0,mile:0,day:null});
  let title=null;
  if(RAR.indexOf(best)>=3&&!ns.sr){ns.sr=1;title=O('nt')(best)}
  else if(ns.day!==today()){const m=MILE.filter(x=>(S.packsOpened||0)>=x).length;if(m>ns.mile){ns.mile=m;title=O('np')(S.packsOpened)}
    else if(RAR.indexOf(best)>=4){title=O('nt')(best)}}
  if(!title)return;ns.day=today();save();addCss();
  const host=document.createElement('div');host.className='ob-nudge';host.id='obNudge';
  host.innerHTML=`<div class="ob-nbox"><div class="ob-lock">🔒</div><h3>${esc(title)}</h3><p>${O('ns')}</p>${signBlock('nd')}<button class="ob-later" data-obno>${O('nl')}</button></div>`;
  document.body.appendChild(host);
  const close=()=>host.remove();host.querySelector('[data-obno]').onclick=close;host.onclick=e=>{if(e.target===host)close()};
  bindSign(host,close);
}
window.obShow=obShow;window.obSigned=obSigned;window.obNudge=obNudge;
})();
