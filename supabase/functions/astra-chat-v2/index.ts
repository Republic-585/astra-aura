const BOT_TOKEN=Deno.env.get("TELEGRAM_BOT_TOKEN")??Deno.env.get("BOT_TOKEN");
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")??"";
const SUPABASE_SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const PRODUCTS={
 compatibility:{key:"compatibility_v1",stars:299,title:"Совместимость ASTRA AURA"},
 forecast:{key:"annual_forecast_v1",stars:249,title:"Личный прогноз на год"},
 club:{key:"aura_club_monthly_v1",stars:99,title:"ASTRA AURA Club"}
};
const MONTH=2592000;
const PWA_URL="https://republic-585.github.io/astra-aura/?v=9";
const menu={keyboard:[
 [{text:"👤 Мой кабинет",web_app:{url:PWA_URL}}],
 [{text:"🔮 РАЗБОР"}],
 [{text:"🧾 Мои покупки"}],
],resize_keyboard:true,is_persistent:true};

function tg(method:string,body:Record<string,unknown>){return fetch("https://api.telegram.org/bot"+BOT_TOKEN+"/"+method,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}).then(async r=>{const d=await r.json();if(!d.ok)throw new Error(JSON.stringify(d));return d.result;});}
async function db(path:string,options:RequestInit={}){const r=await fetch(SUPABASE_URL+"/rest/v1/"+path,{...options,headers:{apikey:SUPABASE_SERVICE_ROLE_KEY,Authorization:"Bearer "+SUPABASE_SERVICE_ROLE_KEY,"content-type":"application/json",...(options.headers||{})}});if(!r.ok)throw new Error("DB "+r.status+": "+await r.text());const raw=await r.text();return raw.trim()?JSON.parse(raw):null;}
function digits(s:string){return s.replace(/\D/g,"").split("").reduce((a,x)=>a+Number(x),0);}
function reduceNumber(v:number){let n=v;while(n>9&&!([11,22,33].includes(n)))n=String(n).split("").reduce((a,x)=>a+Number(x),0);return n;}
function singleDigit(v:number){let n=Math.abs(v);while(n>9)n=String(n).split("").reduce((a,x)=>a+Number(x),0);return n;}
function baseNumber(n:number){return [11,22,33].includes(n)?Number(String(n).split("").reduce((a,x)=>a+Number(x),0)):n;}
function parseDate(s:string){const m=s.trim().match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);if(!m)return null;const day=+m[1],month=+m[2],year=+m[3],d=new Date(Date.UTC(year,month-1,day));if(d.getUTCFullYear()!==year||d.getUTCMonth()!==month-1||d.getUTCDate()!==day||year<1900||year>2100)return null;return{day,month,year};}
function dateLabel(d:any){return String(d.day).padStart(2,"0")+"."+String(d.month).padStart(2,"0")+"."+d.year;}
function clean(x:any){return String(x??"").replace(/—/g,"-").replace(/–/g,"-").trim();}
function labelNumber(n:number){return [11,22,33].includes(n)?"мастер-число "+n:"число "+n;}
function mainKeyboard(){return{reply_markup:menu};}
async function sendLong(chatId:number,text:string,extra:any={}){let r=text;while(r.length>3800){let i=r.lastIndexOf("\n",3800);if(i<1000)i=3800;await tg("sendMessage",{chat_id:chatId,text:r.slice(0,i),...extra});r=r.slice(i).trim();}if(r)await tg("sendMessage",{chat_id:chatId,text:r,...extra});}

async function isOwner(uid:number){
  try{
    const r=await db("numerology_admins?telegram_user_id=eq."+uid+"&select=role");
    return Boolean(r?.[0] && (r[0].role==="owner" || r[0].role==="admin"));
  }catch(e){console.error(e);return false;}
}
async function compatibility(a:number,b:number){
 const x=Math.min(a,b),y=Math.max(a,b);
 const r=await db("numerology_compatibility?number_a=eq."+x+"&number_b=eq."+y+"&select=*");
 return r?.[0]??{meaning:"Сочетание двух жизненных путей стоит рассматривать через различия в темпе, ценностях и способах действовать.",strengths:"Разные качества могут дополнять друг друга.",challenges:"Различия требуют ясных договорённостей и уважения границ.",guidance:"Говорите о целях, ролях, деньгах и личном пространстве прямо."};
}
function rhythm(a:number,b:number){
 if(a===b)return "резонанс";
 const d=Math.min(Math.abs(a-b),9-Math.abs(a-b));
 if(d<=2)return "близкий ритм";
 if(d>=4)return "контраст";
 return "разный ритм";
}
async function compatibilityLayers(a:any,b:any){
 const specs=[{key:"mind",label:"🧠 Ум · коммуникация"},{key:"action",label:"⚙️ Действие · совместная работа"},{key:"realization",label:"🎯 Реализация · цели и деньги"},{key:"outcome",label:"🌙 Итог · долгий горизонт"}];
 const layers=[];
 for(const spec of specs){
   const av=a[spec.key],bv=b[spec.key],an=a.fourNumbers[spec.key],bn=b.fourNumbers[spec.key];
   layers.push({key:spec.key,label:spec.label,number1:an,number2:bn,relation:rhythm(an,bn),meaning1:clean(av?.meaning),meaning2:clean(bv?.meaning),strengths1:clean(av?.strengths),strengths2:clean(bv?.strengths),challenges1:clean(av?.challenges),challenges2:clean(bv?.challenges),money1:clean(av?.money),money2:clean(bv?.money),realization1:clean(av?.realization),realization2:clean(bv?.realization),purpose1:clean(av?.purpose),purpose2:clean(bv?.purpose)});
 }
 return {layers,communication:"Сопоставьтесь не только по совпадениям: при "+layers[0].relation+" полезно заранее договориться о темпе общения, способе обсуждать разногласия и личном пространстве.",money:"Финансовые привычки полезно обсуждать отдельно. Число Реализации показывает символические темы отношения к результату и ресурсам, но не предсказывает доход.",business:"Для бизнеса особенно важны Число Действия и Число Реализации: заранее распределите ответственность, критерии результата, деньги и право финального решения.",realizationMoney1:clean(a.realization?.money),realizationMoney2:clean(b.realization?.money)};
}
function compatibilityText(a:any,b:any,c:any,l:any){
 return ["❤️ ПОЛНЫЙ РАЗБОР СОВМЕСТИМОСТИ","",dateLabel(a.d)+" · "+labelNumber(a.nums.life),dateLabel(b.d)+" · "+labelNumber(b.nums.life),"","✨ ОСНОВА ПАРЫ\n"+clean(c.meaning),"","💞 ЛИЧНЫЕ ОТНОШЕНИЯ\n"+clean(c.strengths)+"\n\nЗона внимания: "+clean(c.challenges)+"\n\nЧто важно: "+clean(c.guidance),"","🧠 КОММУНИКАЦИЯ\n"+l.communication+"\n\nПервый: число "+l.layers[0].number1+" - "+l.layers[0].meaning1+"\nВторой: число "+l.layers[0].number2+" - "+l.layers[0].meaning2,"","⚙️ ДЕЙСТВИЯ И БЫТ\nПервый: число "+l.layers[1].number1+" - "+l.layers[1].meaning1+"\nВторой: число "+l.layers[1].number2+" - "+l.layers[1].meaning2+"\n\nПрактика: "+l.layers[1].relation+" - полезно заранее разделить роли и зоны ответственности.","","🎯 ЦЕЛИ И ФИНАНСЫ\n"+l.money+"\n\nПервый: "+(l.realizationMoney1||"нет отдельного описания")+"\nВторой: "+(l.realizationMoney2||"нет отдельного описания"),"","💼 БИЗНЕС\n"+l.business+"\n\nЧисло Действия: "+l.layers[1].number1+" / "+l.layers[1].number2+"\nЧисло Реализации: "+l.layers[2].number1+" / "+l.layers[2].number2,"","🌙 ДОЛГИЙ ГОРИЗОНТ\nПервый: число "+l.layers[3].number1+" - "+l.layers[3].purpose1+"\nВторой: число "+l.layers[3].number2+" - "+l.layers[3].purpose2,"","🧭 ИТОГ\nЦифры не определяют судьбу пары и не дают объективного прогноза совместного будущего. Это символическая карта для разговора о ценностях, ролях, деньгах, границах и целях."].join("\n");
}

async function ownerDeliver(chatId:number,key:string,payload:string){
  if(key===PRODUCTS.forecast.key){
    const x=await profile(payload);
    if(!x)return;
    const out=["🔮 ПОЛНЫЙ ПРОГНОЗ ASTRA AURA","",x.nums.currentYear+" · персональный год "+x.nums.personalYear,"",clean(x.personalYear.meaning),"","🗓 12 МЕСЯЦЕВ"];
    for(let mo=1;mo<=12;mo++){
      const n=baseNumber(reduceNumber(x.nums.personalYear+mo));
      const r=await row("personal_month",String(n));
      out.push("\n"+mo+". "+clean(r.title)+" · число "+n,clean(r.meaning),clean(r.practical_advice));
    }
    out.push("","🌙 Итог","Это карта тем для саморефлексии и планирования, а не обещание конкретных событий.");
    await sendLong(chatId,out.join("\n"),mainKeyboard());
    return;
  }
  if(key===PRODUCTS.compatibility.key){
    const parts=payload.split("|");
    if(parts.length!==2)return;
    const a=await profile(parts[0]),b=await profile(parts[1]);
    if(!a||!b)return;
    const c=await compatibility(a.nums.life,b.nums.life),l=await compatibilityLayers(a,b);
    await sendLong(chatId,compatibilityText(a,b,c,l),mainKeyboard());
    return;
  }
  if(key===PRODUCTS.club.key){
    await tg("sendMessage",{chat_id:chatId,text:"💎 ASTRA AURA Club\n\nРежим владельца: доступ открыт бесплатно. ✨",...mainKeyboard()});
  }
}


async function hmac(keyData:Uint8Array|string,data:string){
 const enc=new TextEncoder();
 const key=await crypto.subtle.importKey("raw",typeof keyData==="string"?enc.encode(keyData):keyData,{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 return new Uint8Array(await crypto.subtle.sign("HMAC",key,enc.encode(data)));
}
function hex(bytes:Uint8Array){return [...bytes].map(b=>b.toString(16).padStart(2,"0")).join("");}
async function verifyTelegramWebApp(initData:string){
 if(!initData||!BOT_TOKEN)throw new Error("telegram_auth_missing");
 const p=new URLSearchParams(initData),hash=p.get("hash")??"",authDate=Number(p.get("auth_date")??0);
 if(!hash||!authDate||Math.abs(Date.now()/1000-authDate)>86400)throw new Error("telegram_auth_expired");
 const pairs=[...p.entries()].filter(([k])=>k!=="hash").sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+"="+v);
 const secret=await hmac("WebAppData",BOT_TOKEN);
 const calc=hex(await hmac(secret,pairs.join("\n")));
 if(calc!==hash)throw new Error("telegram_auth_invalid");
 const rawUser=p.get("user");if(!rawUser)throw new Error("telegram_user_missing");
 return JSON.parse(rawUser);
}
async function getAstraTelegramUser(initData:string){
 const tg=await verifyTelegramWebApp(initData),externalId=String(tg.id);
 const displayName=[tg.first_name,tg.last_name].filter(Boolean).join(" ")||tg.username||"Telegram user";
 const rows=await db("astra_users?channel=eq.telegram&external_id=eq."+encodeURIComponent(externalId)+"&select=*");
 if(rows?.[0])return {user:rows[0],telegram:tg};
 const created=await db("astra_users",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({channel:"telegram",external_id:externalId,display_name:displayName,preferred_mode:"numerology"})});
 return {user:created?.[0],telegram:tg};
}
async function cabinetData(initData:string){
 const {user,telegram}=await getAstraTelegramUser(initData);
 if(!user)throw new Error("user_create_failed");
 const people=await db("astra_saved_people?user_id=eq."+user.id+"&select=id,name,birth_date,relationship,created_at&order=created_at.desc&limit=50");
 const readings=await db("astra_readings?user_id=eq."+user.id+"&select=id,reading_type,title,is_paid,created_at&order=created_at.desc&limit=50");
 return {user,telegram,people:people??[],readings:readings??[]};
}
async function saveCabinetProfile(initData:string,name:string,birthDate:string){
 const {user}=await getAstraTelegramUser(initData);
 if(!user)throw new Error("user_create_failed");
 const updated=await db("astra_users?id=eq."+user.id,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({display_name:name||user.display_name,birth_date:birthDate||null,preferred_mode:"numerology",updated_at:new Date().toISOString()})});
 return updated?.[0]??user;
}
async function saveCabinetPerson(initData:string,name:string,birthDate:string,relationship:string=""){
 const {user}=await getAstraTelegramUser(initData);
 if(!user)throw new Error("user_create_failed");
 const created=await db("astra_saved_people",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({user_id:user.id,name,birth_date:birthDate,relationship:relationship||null})});
 return created?.[0]??null;
}

async function getBotUser(uid:number){const r=await db("astra_users?channel=eq.telegram&external_id=eq."+uid+"&select=*");return r?.[0]??null;}
async function rememberBirthDate(uid:number,birthDate:string){const user=await getBotUser(uid);if(!user)return null;const updated=await db("astra_users?id=eq."+user.id,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({birth_date:birthDate,updated_at:new Date().toISOString()})});return updated?.[0]??user;}
async function event(uid:number,key:string,product:string|null=null,metadata:any={}){try{await db("numerology_events",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({telegram_user_id:uid,event_key:key,product_key:product,metadata})});}catch(e){console.error(e);}}
async function setSession(uid:number,mode:string,step:number,data:any={}){await db("numerology_sessions?on_conflict=telegram_user_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({telegram_user_id:uid,mode,step,data,updated_at:new Date().toISOString()})});}
async function getSession(uid:number){const r=await db("numerology_sessions?telegram_user_id=eq."+uid+"&select=*");return r?.[0]??null;}
async function clearSession(uid:number){await db("numerology_sessions?telegram_user_id=eq."+uid,{method:"DELETE"});}
async function row(category:string,key:string){const r=await db("numerology_knowledge?category=eq."+encodeURIComponent(category)+"&key=eq."+encodeURIComponent(key)+"&select=*");return r?.[0]??{};}
async function rule(ruleKey:string){
 const r=await db("numerology_rules?rule_key=eq."+encodeURIComponent(ruleKey)+"&select=*");
 return r?.[0]??{};
}
async function weeklyForecast(p:any){
 const now=new Date(),out:any[]=[],currentYear=now.getUTCFullYear(),startDay=now.getUTCDate(),startMonth=now.getUTCMonth()+1;
 for(let i=0;i<7;i++){
  const dt=new Date(Date.UTC(currentYear,startMonth-1,startDay+i)),y=dt.getUTCFullYear(),m=dt.getUTCMonth()+1,d=dt.getUTCDate();
  const py=baseNumber(reduceNumber(p.d.month+p.d.day+digits(String(y)))),pm=baseNumber(reduceNumber(py+m)),pd=baseNumber(reduceNumber(pm+d));
  out.push({date:String(d).padStart(2,"0")+"."+String(m).padStart(2,"0")+"."+y,number:pd});
 }
 return out;
}
async function breakdownText(p:any){
 const s=profileSynthesis(p),w=weeklyForecast(p),lines=["🔮 ASTRA AURA · РАЗБОР","","📅 "+dateLabel(p.d),"","🧬 ТВОЯ АРХИТЕКТУРА",s.architecture,"","✨ СУТЬ",s.synthesis,"","🌟 ТАЛАНТЫ И СИЛЬНЫЕ СТОРОНЫ",s.talent,s.strengths,"","🧠 УМ · "+p.fourNumbers.mind,clean(p.mind?.meaning),"","⚙️ ДЕЙСТВИЕ · "+p.fourNumbers.action,clean(p.action?.meaning),"","🎯 РЕАЛИЗАЦИЯ · "+p.fourNumbers.realization,clean(p.realization?.meaning),"","🌙 ИТОГ · "+p.fourNumbers.outcome,clean(p.outcome?.meaning),"","❤️ ОТНОШЕНИЯ",s.relationships,"","💰 ДЕНЬГИ И РЕСУРСЫ",s.money,"","🧭 ПРЕДНАЗНАЧЕНИЕ",s.purpose,"","📆 ПРОГНОЗ НА БЛИЖАЙШИЕ 7 ДНЕЙ"];
 for(const x of w){const r=await row("personal_day",String(x.number));lines.push("",x.date+" · число дня "+x.number,clean(r.title),clean(r.meaning),clean(r.practical_advice));}
 lines.push("","💎 СОВМЕСТИМОСТЬ","Полный разбор совместимости раскроет отношения, коммуникацию, быт, цели и финансы.");
 return lines.join("\n");
}
async function profile(s:string){
 const d=parseDate(s);
 if(!d)return null;
 const yearSum=digits(String(d.year));
 const life=reduceNumber(reduceNumber(d.month)+reduceNumber(d.day)+yearSum);
 const attitude=reduceNumber(d.month+d.day);
 const currentYear=new Date().getUTCFullYear();
 const personalYear=baseNumber(reduceNumber(d.month+d.day+digits(String(currentYear))));
 const personalMonth=baseNumber(reduceNumber(personalYear+new Date().getUTCMonth()+1));
 const mind=singleDigit(d.day);
 const action=singleDigit(digits(String(d.day).padStart(2,"0")+String(d.month).padStart(2,"0")+String(d.year)));
 const realizationNumber=singleDigit(mind+action);
 const outcome=singleDigit(mind+action+realizationNumber);
 const full=digits(String(d.day).padStart(2,"0")+String(d.month).padStart(2,"0")+String(d.year));
 const karmic=[13,14,16,19].includes(full)?full:([13,14,16,19].includes(d.day)?d.day:null);
 const lifeCategory=[11,22,33].includes(life)?"master":"core";
 const attitudeCategory=[11,22,33].includes(attitude)?"master":"core";
 const [lifeRow,birthdayRow,attitudeRow,yearRow,monthRow,mindRow,actionRow,realizationRow,outcomeRow,lifeRule,birthdayRule,attitudeRule,yearRule,monthRule]=await Promise.all([
   row(lifeCategory,String(life)),
   row("birthday",String(d.day)),
   row(attitudeCategory,String(attitude)),
   row("personal_year",String(personalYear)),
   row("personal_month",String(personalMonth)),
   row("mind",String(mind)),
   row("action",String(action)),
   row("realization",String(realizationNumber)),
   row("outcome",String(outcome)),
   rule("life_path"),
   rule("birthday"),
   rule("attitude"),
   rule("personal_year"),
   rule("personal_month")
 ]);
 return {
   d,
   nums:{life,attitude,personalYear,personalMonth,karmic,currentYear},
   life:lifeRow,
   birthday:birthdayRow,
   attitude:attitudeRow,
   personalYear:yearRow,
   personalMonth:monthRow,
   mind:mindRow,
   action:actionRow,
   realization:realizationRow,
   outcome:outcomeRow,
   fourNumbers:{mind,action,realization:realizationNumber,outcome},
   rules:{life:lifeRule,birthday:birthdayRule,attitude:attitudeRule,personalYear:yearRule,personalMonth:monthRule}
 };
}
function profileSynthesis(p:any){
 const n=p.fourNumbers;
 const mind=clean(p.mind?.meaning), action=clean(p.action?.meaning), realization=clean(p.realization?.meaning), outcome=clean(p.outcome?.meaning);
 const strengths=[clean(p.life?.strengths),clean(p.mind?.strengths),clean(p.action?.strengths),clean(p.realization?.strengths)].filter(Boolean);
 const challenges=[clean(p.life?.challenges),clean(p.mind?.challenges),clean(p.action?.challenges),clean(p.realization?.challenges)].filter(Boolean);
 const money=[clean(p.life?.money),clean(p.realization?.money),clean(p.outcome?.money)].filter(Boolean);
 const relationships=[clean(p.life?.relationships),clean(p.mind?.relationships),clean(p.outcome?.relationships)].filter(Boolean);
 const purpose=[clean(p.life?.purpose),clean(p.outcome?.purpose),clean(p.realization?.purpose)].filter(Boolean);
 return {
  architecture:"Ум "+n.mind+" → Действие "+n.action+" → Реализация "+n.realization+" → Итог "+n.outcome,
  talent:clean(p.life?.essence)+" "+clean(p.mind?.essence),
  strengths:strengths.join(" "),
  risks:challenges.join(" "),
  money:money.join(" "),
  relationships:relationships.join(" "),
  purpose:purpose.join(" "),
  synthesis:"Внутренняя логика профиля читается как переход от способа воспринимать мир к способу действовать, затем к форме реализации и долгосрочному результату. Важны не отдельные цифры, а повторяющиеся темы между ними.",
  practice:"Сильные качества стоит переводить в конкретные действия: выбрать одну ключевую цель, определить свою роль, установить измеримый результат и регулярно проверять, что действия соответствуют ценностям."
 };
}
function freeText(p:any){
 const s=profileSynthesis(p);
 return ["🔢 ТВОЙ НУМЕРОЛОГИЧЕСКИЙ ПРОФИЛЬ","", "📅 "+dateLabel(p.d),"",
 "🧩 ТВОЯ СХЕМА\n"+s.architecture,
 "✨ СУТЬ\n"+s.synthesis,
 "🎯 ПЕРВИЧНЫЙ ВЕКТОР\n"+s.talent,
 "","🧠 Ум "+p.fourNumbers.mind+" · ⚙️ Действие "+p.fourNumbers.action+" · 🎯 Реализация "+p.fourNumbers.realization+" · 🌙 Итог "+p.fourNumbers.outcome,
 "","💎 Полный профиль соединяет эти числа с талантами, отношениями, деньгами, предназначением и практическими рекомендациями.","",s.disclaimer].join("\n");
}
function premiumText(p:any){
 const s=profileSynthesis(p);
 return ["💎 ПОЛНЫЙ ПРОФИЛЬ ASTRA AURA","", "📅 "+dateLabel(p.d),"",
 "🧬 ЯДРО ПРОФИЛЯ",""+s.architecture,
 "","✨ СИНТЕЗ",""+s.synthesis,
 "","🌟 ТАЛАНТЫ И СИЛЬНЫЕ СТОРОНЫ",""+s.talent,"",""+s.strengths,
 "","🧠 КАК ТЫ ВОСПРИНИМАЕШЬ МИР · УМ "+p.fourNumbers.mind,""+mindSection(p),
 "","⚙️ КАК ТЫ ДЕЙСТВУЕШЬ · ДЕЙСТВИЕ "+p.fourNumbers.action,""+actionSection(p),
 "","🎯 КАК ТЫ РЕАЛИЗУЕШЬСЯ · РЕАЛИЗАЦИЯ "+p.fourNumbers.realization,""+realizationSection(p),
 "","🌙 КУДА СХОДИТСЯ ПУТЬ · ИТОГ "+p.fourNumbers.outcome,""+outcomeSection(p),
 "","❤️ ОТНОШЕНИЯ",""+s.relationships,
 "","💰 ДЕНЬГИ И РЕСУРСЫ",""+s.money,
 "","🧭 ПРЕДНАЗНАЧЕНИЕ И СМЫСЛ",""+s.purpose,
 "","🧭 ЧИСЛО УСТАНОВКИ · "+p.nums.attitude,""+clean(p.attitude.meaning)+"\n"+clean(p.attitude.essence),
 "","📅 ТЕКУЩИЙ ЦИКЛ","Персональный год "+p.nums.personalYear+": "+clean(p.personalYear.meaning)+"\n\n"+clean(p.personalYear.practical_advice),
 p.personalMonth?.meaning?"🗓 Текущий месяц · число "+p.nums.personalMonth+"\n"+clean(p.personalMonth.meaning)+"\n"+clean(p.personalMonth.practical_advice):"",
 p.nums.karmic?"♾ Кармическая тема: "+p.nums.karmic:"",
 "","🛠 ПРАКТИЧЕСКИЙ ВЕКТОР",""+s.practice,
 "","⚠️ ЗОНЫ ВНИМАНИЯ",""+s.risks,
 "","🌙 ИТОГ","Профиль не определяет твою судьбу. Его задача — дать символическую карту для наблюдения за собой, выбора целей и более осознанных решений.",
 "",""+s.disclaimer,"","ASTRA AURA ✨"].filter(Boolean).join("\n");
}
function mindSection(p:any){return clean(p.mind.meaning)+"\n\nСильные стороны: "+clean(p.mind.strengths)+"\n\nЗона внимания: "+clean(p.mind.challenges)+"\n\nПрактика: "+clean(p.mind.practical_advice);}
function actionSection(p:any){return clean(p.action.meaning)+"\n\nСильные стороны: "+clean(p.action.strengths)+"\n\nЗона внимания: "+clean(p.action.challenges)+"\n\nПрактика: "+clean(p.action.practical_advice);}
function realizationSection(p:any){return clean(p.realization.meaning)+"\n\nСильные стороны: "+clean(p.realization.strengths)+"\n\nЗона внимания: "+clean(p.realization.challenges)+"\n\nДеньги: "+clean(p.realization.money)+"\n\nРеализация: "+clean(p.realization.realization)+"\n\nПрактика: "+clean(p.realization.practical_advice);}
function outcomeSection(p:any){return clean(p.outcome.meaning)+"\n\nСильные стороны: "+clean(p.outcome.strengths)+"\n\nЗона внимания: "+clean(p.outcome.challenges)+"\n\nСмысл: "+clean(p.outcome.purpose)+"\n\nПрактика: "+clean(p.outcome.practical_advice);}
function buyKeyboard(p:any,payload:string){return{inline_keyboard:[[{text:"💎 "+p.title+" · "+p.stars+"⭐",callback_data:"buy:"+p.key+":"+payload}]]};}
async function invoice(chatId:number,p:any,payload:string,description:string){
 const body:any={title:p.title,description,payload,currency:"XTR",prices:[{label:p.title,amount:p.stars}]};
 if(p.key===PRODUCTS.club.key)body.subscription_period=MONTH;
 const link=await tg("createInvoiceLink",body);
 const label=p.key===PRODUCTS.club.key?"💎 Оформить Club · 99⭐":"💳 Оплатить · "+p.stars+"⭐";
 await tg("sendMessage",{chat_id:chatId,text:p.key===PRODUCTS.club.key?"💎 ASTRA AURA Club\\n\\nЕжемесячный доступ к расширенным материалам ASTRA AURA.\\n\\nСтоимость: 99⭐ в месяц. Подписка продлевается автоматически в Telegram. Ее можно отменить в настройках подписок Telegram.":"💎 "+p.title+"\\n\\nСтоимость: "+p.stars+"⭐\\n\\nПосле оплаты полный результат будет отправлен сюда автоматически.",reply_markup:{inline_keyboard:[[{text:label,url:link}]]}});
}

async function rpc(name:string,args:any){
 const r=await fetch(SUPABASE_URL+"/rest/v1/rpc/"+name,{
   method:"POST",
   headers:{apikey:SUPABASE_SERVICE_ROLE_KEY,Authorization:"Bearer "+SUPABASE_SERVICE_ROLE_KEY,"content-type":"application/json"},
   body:JSON.stringify(args)
 });
 if(!r.ok)throw new Error("RPC "+name+" "+r.status+": "+await r.text());
 const raw=await r.text();
 return raw.trim()?JSON.parse(raw):null;
}
async function auraWallet(uid:number){
 const tx=await db("aura_wallet_transactions?telegram_user_id=eq."+uid+"&select=amount,kind,description,created_at&order=created_at.desc&limit=500");
 const rows=tx??[];
 const balance=rows.reduce((s:any,r:any)=>s+Number(r.amount||0),0);
 const earned=rows.filter((r:any)=>Number(r.amount)>0).reduce((s:any,r:any)=>s+Number(r.amount||0),0);
 const spent=Math.abs(rows.filter((r:any)=>Number(r.amount)<0).reduce((s:any,r:any)=>s+Number(r.amount||0),0));
 return {balance,earned,spent,transactions:rows.slice(0,20)};
}
async function referralStats(uid:number){
 const refs=await db("numerology_referrals?referrer_telegram_user_id=eq."+uid+"&select=id,status,created_at,first_purchase_at,rewarded_at&order=created_at.desc&limit=1000");
 const rows=refs??[];
 return {
   invited:rows.length,
   successful:rows.filter((r:any)=>r.status==="rewarded"||r.status==="qualified").length,
   pending:rows.filter((r:any)=>r.status==="joined").length
 };
}
async function paid(chatId:number,user:any,payload:string,payment:any){

 const p=Object.values(PRODUCTS).find((x:any)=>payload===x.key||payload.startsWith(x.key+":")) as any;
 if(!p||payment.currency!=="XTR"||Number(payment.total_amount)!==p.stars)return;
 await db("numerology_purchases",{method:"POST",headers:{Prefer:"resolution=ignore-duplicates"},body:JSON.stringify({telegram_user_id:user.id,username:user.username??null,product_key:p.key,payload,currency:payment.currency,amount:payment.total_amount,telegram_charge_id:payment.telegram_payment_charge_id,is_recurring:Boolean(payment.is_recurring),subscription_expiration_date:payment.subscription_expiration_date?new Date(payment.subscription_expiration_date*1000).toISOString():null})});
 await event(user.id,"payment_success",p.key,{amount:payment.total_amount,recurring:Boolean(payment.is_recurring)});
 const referralReward=await rpc("qualify_referral",{p_referred_telegram_user_id:user.id,p_purchase_at:new Date().toISOString()}).catch(e=>{console.error(e);return null;});
 if(referralReward?.qualified&&!referralReward?.already_rewarded){
   const refs=await db("numerology_referrals?id=eq."+referralReward.referral_id+"&select=referrer_telegram_user_id");
   const referrerId=Number(refs?.[0]?.referrer_telegram_user_id||0);
   await tg("sendMessage",{chat_id:chatId,text:"🎁 Тебе начислено +50 AURA\n\nЭто бонус за первую покупку после приглашения.\nБаланс можно посмотреть в разделе «Мои покупки».",...mainKeyboard()}).catch(e=>console.error(e));
   if(referrerId&&referrerId!==user.id){
     await tg("sendMessage",{chat_id:referrerId,text:"✨ Новый бонус ASTRA AURA\n\nТебе начислено +50 AURA за приглашённого пользователя, который совершил первую покупку.\n\nОткрой «🧾 Мои покупки», чтобы посмотреть баланс.",...mainKeyboard()}).catch(e=>console.error(e));
   }
 }
 if(p.key===PRODUCTS.compatibility.key){const m=payload.match(/^compatibility_v1:(\d{2}\.\d{2}\.\d{4})\|(\d{2}\.\d{2}\.\d{4})$/),a=m?await profile(m[1]):null,b=m?await profile(m[2]):null;if(a&&b){const c=await compatibility(a.nums.life,b.nums.life),l=await compatibilityLayers(a,b);await sendLong(chatId,compatibilityText(a,b,c,l),mainKeyboard());}}
 else if(p.key===PRODUCTS.forecast.key){const m=payload.match(/^annual_forecast_v1:(\d{2}\.\d{2}\.\d{4})$/),x=m?await profile(m[1]):null;if(x){const out=["🔮 ПОЛНЫЙ ПРОГНОЗ ASTRA AURA","",x.nums.currentYear+" · персональный год "+x.nums.personalYear,"",clean(x.personalYear.meaning),"","🗓 12 МЕСЯЦЕВ"];for(let mo=1;mo<=12;mo++){const n=baseNumber(reduceNumber(x.nums.personalYear+mo)),r=await row("personal_month",String(n));out.push("\n"+mo+". "+clean(r.title)+" · число "+n,clean(r.meaning),clean(r.practical_advice));}out.push("","🌙 Итог\nЭто карта тем для саморефлексии и планирования, а не обещание конкретных событий.");await sendLong(chatId,out.join("\n"),mainKeyboard());}}
 else await tg("sendMessage",{chat_id:chatId,text:"🌟 ASTRA AURA Club активирован. Каждый месяц доступны расширенные материалы, новые циклы и будущие функции ✨",...mainKeyboard()});
}

async function saveReading(initData:string,readingType:string,title:string,inputData:any,resultData:any,isPaid=false){const {user}=await getAstraTelegramUser(initData);if(!user)throw new Error("user_create_failed");const created=await db("astra_readings",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({user_id:user.id,reading_type:readingType,title,input_data:inputData,result_data:resultData,is_paid:isPaid})});return created?.[0]??null;}
async function handleWeb(body:any){
 const initData=String(body?.telegram_init_data??"").trim(),action=String(body?.action??"");
 if(action==="cabinet")return {ok:true,mode:"cabinet",...(initData?await cabinetData(initData):{user:null,people:[],readings:[]})};
 if(action==="save_profile"){if(!initData)return {ok:true,mode:"cabinet"};return {ok:true,mode:"cabinet",user:await saveCabinetProfile(initData,String(body?.name??"").trim(),String(body?.birth_date??"").trim())};}
 if(action==="save_person"){if(!initData)throw new Error("telegram_auth_required");const name=String(body?.name??"").trim(),birthDate=String(body?.birth_date??"").trim();if(!name||!parseDate(birthDate))throw new Error("invalid_person");return {ok:true,mode:"cabinet",person:await saveCabinetPerson(initData,name,birthDate)};}
 if(action==="reading"){
  const mode=String(body?.mode??"numerology"),d1=String(body?.date1??"").trim(),d2=String(body?.date2??"").trim(),a=await profile(d1);if(!a)throw new Error("invalid_date");
  if(mode==="compatibility"){const b=await profile(d2);if(!b)throw new Error("invalid_second_date");const c=await compatibility(a.nums.life,b.nums.life),l=await compatibilityLayers(a,b),answer=["❤️ СОВМЕСТИМОСТЬ","",""+dateLabel(a.d)+" · "+labelNumber(a.nums.life),dateLabel(b.d)+" · "+labelNumber(b.nums.life),"","✨ "+clean(c.meaning),"","🧠 Коммуникация: "+l.layers[0].relation,"⚙️ Действия: "+l.layers[1].relation,"🎯 Реализация: "+l.layers[2].relation,"🌙 Итог: "+l.layers[3].relation,"","💎 Полный разбор раскрывает отношения, коммуникацию, деньги и бизнес.","","Это интерпретация для саморефлексии, а не прогноз отношений."].join("\n");const reading=initData?await saveReading(initData,"compatibility","Совместимость",{date1:d1,date2:d2},{answer,life1:a.nums.life,life2:b.nums.life,compatibility:c,layers:l},false):null;return {ok:true,mode,answer,reading,cabinet:initData?await cabinetData(initData):null};}
  if(mode==="forecast"){const months=[];for(let mo=1;mo<=12;mo++){const n=baseNumber(reduceNumber(a.nums.personalYear+mo)),r=await row("personal_month",String(n));months.push({month:mo,number:n,title:clean(r.title),meaning:clean(r.meaning),practical_advice:clean(r.practical_advice)})}const answer=["🔮 ПРОГНОЗ НА "+a.nums.currentYear,"","Персональный год: "+a.nums.personalYear,"",clean(a.personalYear.meaning),"","Полный прогноз раскрывает все 12 месяцев."].join("\n");const reading=initData?await saveReading(initData,"forecast","Прогноз на "+a.nums.currentYear,{date:d1},{year:a.nums.currentYear,personalYear:a.nums.personalYear,meaning:clean(a.personalYear.meaning),months},false):null;return {ok:true,mode,answer,reading,cabinet:initData?await cabinetData(initData):null};}
  const answer=freeText(a),reading=initData?await saveReading(initData,"profile","Нумерологический профиль",{date:d1},{numbers:a.nums,answer},false):null;return {ok:true,mode:"numerology",answer,reading,cabinet:initData?await cabinetData(initData):null};
 }
 const message=String(body?.message??"").trim(),candidate=message||String(body?.profile?.date??"");const p=await profile(candidate);if(p)return {ok:true,mode:"numerology",answer:freeText(p)};return {ok:true,mode:"numerology",answer:"🔢 ASTRA AURA\n\nЧтобы начать, отправь дату рождения в формате ДД.ММ.ГГГГ.\nНапример: 04.05.1993\n\n"};
}
async function handle(update:any){
 if(update.pre_checkout_query){const q=update.pre_checkout_query,payload=String(q.invoice_payload??""),p=Object.values(PRODUCTS).find((x:any)=>payload===x.key||payload.startsWith(x.key+":")) as any,ok=Boolean(p)&&q.currency==="XTR"&&Number(q.total_amount)===p.stars;await tg("answerPreCheckoutQuery",{pre_checkout_query_id:q.id,ok,...(ok?{}:{error_message:"Не удалось проверить заказ. Попробуй ещё раз через минуту."})});return;}
 const m=update.message;if(!m)return;const chatId=m.chat?.id,user=m.from;if(!chatId||!user)return;
 if(m.successful_payment){await paid(chatId,user,m.successful_payment.invoice_payload,m.successful_payment);return;}
 const text=String(m.text??"").trim();await event(user.id,"message",null,{button:text.slice(0,80)});
 if(text==="/paysupport"){await tg("sendMessage",{chat_id:chatId,text:"💬 Поддержка по оплате ASTRA AURA\n\nЕсли оплата прошла, а продукт не пришёл, напиши примерное время покупки.",...mainKeyboard()});return;}
 if(text.startsWith("/start ")){
   const code=text.slice(7).trim();
   if(code.startsWith("ref_")){
     const refId=Number(code.slice(4));
     if(Number.isInteger(refId)&&refId>0&&refId!==user.id){
       try{
         const referrer=await getBotUser(refId);
         if(referrer){
           await db("numerology_referrals",{method:"POST",headers:{Prefer:"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify({referrer_telegram_user_id:refId,referred_telegram_user_id:user.id,start_code:code})});
           await event(user.id,"referral_join",null,{referrer_telegram_user_id:refId});
         }
       }catch(e){console.error(e);}
     }
   }
   await clearSession(user.id);
   await tg("sendMessage",{chat_id:chatId,text:"✨ ASTRA AURA\n\nРазберём числа твоей даты рождения спокойно и без лишнего шума 🙂\n\nВыбирай направление ниже 👇",...mainKeyboard()});return;
 }
 if(text==="/start"||text==="🏠 Главное меню"){await clearSession(user.id);await tg("sendMessage",{chat_id:chatId,text:"✨ ASTRA AURA\n\nРазберём числа твоей даты рождения спокойно и без лишнего шума 🙂\n\nВыбирай направление ниже 👇",...mainKeyboard()});return;}
 if(text==="🔮 РАЗБОР"){await clearSession(user.id);await setSession(user.id,"breakdown",1,{});await event(user.id,"product_view",null);await tg("sendMessage",{chat_id:chatId,text:"🔮 РАЗБОР\n\nОтправь дату рождения ДД.ММ.ГГГГ.\nНапример: 04.05.1993\n\nПолучишь подробный разбор по дате и прогноз на ближайшие 7 дней.",...mainKeyboard()});return;}
 if(text==="🤝 Совместимость"){await setSession(user.id,"compatibility",1,{});await event(user.id,"product_view",PRODUCTS.compatibility.key);await tg("sendMessage",{chat_id:chatId,text:"🤝 СОВМЕСТИМОСТЬ\n\nСравним две даты рождения ❤️\n\nСначала отправь первую дату ДД.ММ.ГГГГ.",...mainKeyboard()});return;}
 if(text==="💎 ASTRA AURA Club"){await event(user.id,"product_view",PRODUCTS.club.key);if(await isOwner(user.id)){await ownerDeliver(chatId,PRODUCTS.club.key,PRODUCTS.club.key);return;}await invoice(chatId,PRODUCTS.club,PRODUCTS.club.key,"Ежемесячный доступ к расширенным материалам и функциям ASTRA AURA.");return;}
 if(text==="📖 Справочник"){await tg("sendMessage",{chat_id:chatId,text:"📖 СПРАВОЧНИК\n\n🔢 Числа 1-9\n🌟 11, 22, 33\n🎂 День рождения 1-31\n🧭 Число установки\n📅 Персональный год\n🗓 Персональный месяц\n♾ Кармические числа\n🤝 Совместимость по жизненному пути",...mainKeyboard()});return;}
 if(text==="🧾 Мои покупки"){
   const rows=await db("numerology_purchases?telegram_user_id=eq."+user.id+"&select=product_key,amount,created_at,is_recurring&order=created_at.desc&limit=20");
   const names:any={};Object.values(PRODUCTS).forEach((x:any)=>names[x.key]=x.title);
   const body=rows?.length?rows.map((r:any)=>"• "+(names[r.product_key]??r.product_key)+" · "+r.amount+"⭐ · "+new Date(r.created_at).toLocaleDateString("ru-RU")+(r.is_recurring?" · подписка":"")).join("\n"):"Пока здесь пусто. Первый продукт можно открыть после бесплатного расчёта 🙂";
   const refs=await referralStats(user.id),wallet=await auraWallet(user.id);
   const refLink="https://t.me/astra_aura_bot?start=ref_"+user.id;
   const shareUrl="https://t.me/share/url?url="+encodeURIComponent(refLink)+"&text="+encodeURIComponent("✨ Попробуй ASTRA AURA — персональная нумерология. Тебе начислят 50 AURA после первой покупки.");
   const referralBlock="✨ РЕФЕРАЛЬНАЯ ПРОГРАММА\n\nПриглашённый друг получает +50 AURA после первой покупки.\nТы получаешь +50 AURA.\n\n👥 Приглашено: "+refs.invited+"\n🎯 Успешных: "+refs.successful+"\n⏳ В ожидании: "+refs.pending+"\n\n💫 Баланс: "+wallet.balance+" AURA\nВсего получено: "+wallet.earned+" AURA";
   await tg("sendMessage",{chat_id:chatId,text:"🧾 МОИ ПОКУПКИ\n\n"+body+"\n\n"+referralBlock+"\n\n🔗 Твоя ссылка:\n"+refLink,reply_markup:{inline_keyboard:[[{text:"📤 Пригласить друга",url:shareUrl}],[{text:"🏠 Главное меню",callback_data:"menu"}]]}});
   return;
 }

 const s=await getSession(user.id),d=parseDate(text);
 if(s?.mode==="breakdown"){if(!d){await tg("sendMessage",{chat_id:chatId,text:"Нужна дата ДД.ММ.ГГГГ 🙂",...mainKeyboard()});return;}const p=await profile(dateLabel(d));await clearSession(user.id);if(p){await rememberBirthDate(user.id,dateLabel(d));await event(user.id,"free_profile",null);await sendLong(chatId,await breakdownText(p),{reply_markup:{inline_keyboard:[[{text:"🤝 Совместимость · 299⭐",callback_data:"compatibility_start:"+dateLabel(d)}],[{text:"🏠 Главное меню",callback_data:"menu"}]]}});return;}}

 if(s?.mode==="compatibility"){
   if(!d){await tg("sendMessage",{chat_id:chatId,text:"Нужна дата ДД.ММ.ГГГГ 🙂",...mainKeyboard()});return;}
   if(s.step===1){await rememberBirthDate(user.id,dateLabel(d));await setSession(user.id,"compatibility",2,{date1:dateLabel(d)});await tg("sendMessage",{chat_id:chatId,text:"Принял 👍\n\nТеперь отправь вторую дату рождения.",...mainKeyboard()});return;}
   const a=await profile(s.data.date1),b=await profile(dateLabel(d));await clearSession(user.id);
   if(a&&b){const c=await compatibility(a.nums.life,b.nums.life);await event(user.id,"compatibility_preview",PRODUCTS.compatibility.key);if(await isOwner(user.id)){await ownerDeliver(chatId,PRODUCTS.compatibility.key,s.data.date1+"|"+dateLabel(d));return;}await tg("sendMessage",{chat_id:chatId,text:"🤝 ПРЕДВАРИТЕЛЬНЫЙ РАЗБОР\n\nТы: "+labelNumber(a.nums.life)+"\nПартнёр: "+labelNumber(b.nums.life)+"\n\n✨ "+clean(c.meaning)+"\n\n💎 Полный разбор раскрывает сильные стороны пары, зоны напряжения и практические рекомендации ❤️",...mainKeyboard()});await invoice(chatId,PRODUCTS.compatibility,PRODUCTS.compatibility.key+":"+s.data.date1+"|"+dateLabel(d),"Полный разбор совместимости ASTRA AURA.");return;}
 }
 if(s?.mode==="forecast"){
   if(!d){await tg("sendMessage",{chat_id:chatId,text:"Нужна дата ДД.ММ.ГГГГ 🙂",...mainKeyboard()});return;}
   const p=await profile(s.data.date1||dateLabel(d));await clearSession(user.id);
   if(p){await event(user.id,"forecast_preview",PRODUCTS.forecast.key);if(await isOwner(user.id)){await ownerDeliver(chatId,PRODUCTS.forecast.key,dateLabel(d));return;}await tg("sendMessage",{chat_id:chatId,text:"🔮 ПРЕДВАРИТЕЛЬНЫЙ ПРОГНОЗ\n\n"+p.nums.currentYear+" · персональный год "+p.nums.personalYear+"\n\n"+clean(p.personalYear.meaning)+"\n\n💎 Полная версия раскрывает все 12 месяцев.",...mainKeyboard()});await invoice(chatId,PRODUCTS.forecast,PRODUCTS.forecast.key+":"+dateLabel(d),"Персональный прогноз ASTRA AURA на 12 месяцев.");return;}
 }
 const p=await profile(text);if(p){await rememberBirthDate(user.id,dateLabel(p.d));await event(user.id,"free_profile",null);await sendLong(chatId,premiumText(p),mainKeyboard());return;}
 await tg("sendMessage",{chat_id:chatId,text:"Похоже, дата записана не совсем так 🙂\\n\\nИспользуй формат ДД.ММ.ГГГГ.\\nНапример: 04.05.1993\\n\\nИли выбери направление в меню.",...mainKeyboard()});
}

Deno.serve(async(req)=>{
 try{
  const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
  if(req.method==="OPTIONS")return new Response("ok",{status:204,headers:cors});
  if(req.method!=="POST")return new Response("ASTRA AURA v58",{status:200,headers:cors});
  if(!BOT_TOKEN||!SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY)return new Response(JSON.stringify({error:"configuration error"}),{status:500,headers:{...cors,"Content-Type":"application/json"}});
  const u=await req.json();
  if(u?.channel==="web"){const out=await handleWeb(u);return new Response(JSON.stringify(out),{status:200,headers:{...cors,"Content-Type":"application/json"}});}
  if(u.callback_query){
   const c=u.callback_query;await tg("answerCallbackQuery",{callback_query_id:c.id});const data=String(c.data??"");
   if(data==="menu"){await tg("sendMessage",{chat_id:c.message.chat.id,text:"✨ ASTRA AURA\n\nВыбирай направление ниже 👇",...mainKeyboard()});return new Response("ok");}
   if(data.startsWith("compatibility_start:")&&c.message?.chat?.id){const firstDate=data.slice("compatibility_start:".length);if(parseDate(firstDate)){await setSession(c.from.id,"compatibility",2,{date1:firstDate});await event(c.from.id,"product_view",PRODUCTS.compatibility.key);await tg("sendMessage",{chat_id:c.message.chat.id,text:"🤝 СОВМЕСТИМОСТЬ\n\nПервая дата сохранена.\n\nТеперь отправь дату рождения второго человека ДД.ММ.ГГГГ.",...mainKeyboard()});}return new Response("ok");}
   if(data.startsWith("buy:")&&c.message?.chat?.id){
    const z=data.split(":"),key=z[1],payload=z.slice(2).join(":"),p=(Object.values(PRODUCTS) as any[]).find((x:any)=>x.key===key);if(!p)return new Response("ok");
    let ok=false;
    if(key===PRODUCTS.forecast.key)ok=/^\d{2}\.\d{2}\.\d{4}$/.test(payload)&&Boolean(parseDate(payload));
    if(key===PRODUCTS.compatibility.key){const m=payload.match(/^(\d{2}\.\d{2}\.\d{4})\|(\d{2}\.\d{2}\.\d{4})$/);ok=Boolean(m&&parseDate(m[1])&&parseDate(m[2]));}
    if(ok){if(await isOwner(c.from.id)){await event(c.from.id,"owner_free_access",p.key,{payload});await ownerDeliver(c.message.chat.id,p.key,payload);return new Response("ok");}await event(c.from.id,"checkout_click",p.key,{payload});await invoice(c.message.chat.id,p,key+":"+payload,"Персональный продукт ASTRA AURA.");}
   }
   return new Response("ok");
  }
  await handle(u);return new Response("ok",{headers:cors});
 }catch(e){console.error(e);return new Response(JSON.stringify({error:"internal_error"}),{status:500,headers:{...cors,"Content-Type":"application/json"}});}
});