const BOT_TOKEN=Deno.env.get("TELEGRAM_BOT_TOKEN")??Deno.env.get("BOT_TOKEN");
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")??"";
const SUPABASE_SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const PRODUCTS={
 profile:{key:"full_numerology_profile_v1",stars:199,title:"Полный профиль ASTRA AURA"},
 compatibility:{key:"compatibility_v1",stars:299,title:"Совместимость ASTRA AURA"},
 forecast:{key:"annual_forecast_v1",stars:249,title:"Личный прогноз на год"},
 club:{key:"aura_club_monthly_v1",stars:99,title:"ASTRA AURA Club"},
 bundle:{key:"aura_max_bundle_v1",stars:599,title:"ASTRA AURA MAX"}
};
const MONTH=2592000;
const menu={keyboard:[
 [{text:"🔢 Нумерология"},{text:"🤝 Совместимость"}],
 [{text:"🔮 Прогноз на год"},{text:"💎 ASTRA AURA Club"}],
 [{text:"📖 Справочник"},{text:"🧾 Мои покупки"}],
 [{text:"ℹ️ О боте"},{text:"❓ Помощь"}]
],resize_keyboard:true,is_persistent:true};

function tg(method:string,body:Record<string,unknown>){return fetch("https://api.telegram.org/bot"+BOT_TOKEN+"/"+method,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}).then(async r=>{const d=await r.json();if(!d.ok)throw new Error(JSON.stringify(d));return d.result;});}
async function db(path:string,options:RequestInit={}){const r=await fetch(SUPABASE_URL+"/rest/v1/"+path,{...options,headers:{apikey:SUPABASE_SERVICE_ROLE_KEY,Authorization:"Bearer "+SUPABASE_SERVICE_ROLE_KEY,"content-type":"application/json",...(options.headers||{})}});if(!r.ok)throw new Error("DB "+r.status+": "+await r.text());return r.status===204?null:r.json();}
function digits(s:string){return s.replace(/\D/g,"").split("").reduce((a,x)=>a+Number(x),0);}
function reduceNumber(v:number){let n=v;while(n>9&&!([11,22,33].includes(n)))n=String(n).split("").reduce((a,x)=>a+Number(x),0);return n;}
function baseNumber(n:number){return [11,22,33].includes(n)?Number(String(n).split("").reduce((a,x)=>a+Number(x),0)):n;}
function parseDate(s:string){const m=s.trim().match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);if(!m)return null;const day=+m[1],month=+m[2],year=+m[3],d=new Date(Date.UTC(year,month-1,day));if(d.getUTCFullYear()!==year||d.getUTCMonth()!==month-1||d.getUTCDate()!==day||year<1900||year>2100)return null;return{day,month,year};}
function dateLabel(d:any){return String(d.day).padStart(2,"0")+"."+String(d.month).padStart(2,"0")+"."+d.year;}
function clean(x:any){return String(x??"").replace(/—/g,"-").replace(/–/g,"-").trim();}
function labelNumber(n:number){return [11,22,33].includes(n)?"мастер-число "+n:"число "+n;}
function mainKeyboard(){return{reply_markup:menu};}
async function sendLong(chatId:number,text:string,extra:any={}){let r=text;while(r.length>3800){let i=r.lastIndexOf("\n",3800);if(i<1000)i=3800;await tg("sendMessage",{chat_id:chatId,text:r.slice(0,i),...extra});r=r.slice(i).trim();}if(r)await tg("sendMessage",{chat_id:chatId,text:r,...extra});}
async function event(uid:number,key:string,product:string|null=null,metadata:any={}){try{await db("numerology_events",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({telegram_user_id:uid,event_key:key,product_key:product,metadata})});}catch(e){console.error(e);}}
async function setSession(uid:number,mode:string,step:number,data:any={}){await db("numerology_sessions?on_conflict=telegram_user_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({telegram_user_id:uid,mode,step,data,updated_at:new Date().toISOString()})});}
async function getSession(uid:number){const r=await db("numerology_sessions?telegram_user_id=eq."+uid+"&select=*");return r?.[0]??null;}
async function clearSession(uid:number){await db("numerology_sessions?telegram_user_id=eq."+uid,{method:"DELETE"});}
async function row(category:string,key:string){const r=await db("numerology_knowledge?category=eq."+encodeURIComponent(category)+"&key=eq."+encodeURIComponent(key)+"&select=*");return r?.[0]??{};}
async function profile(s:string){const d=parseDate(s);if(!d)return null;const yearSum=digits(String(d.year)),life=reduceNumber(reduceNumber(d.month)+reduceNumber(d.day)+yearSum),attitude=reduceNumber(d.month+d.day),personalYear=reduceNumber(d.month+d.day+digits(String(new Date().getUTCFullYear()))),full=digits(String(d.day).padStart(2,"0")+String(d.month).padStart(2,"0")+String(d.year));const karmic=[13,14,16,19].includes(full)?full:([13,14,16,19].includes(d.day)?d.day:null);return{d,nums:{life,attitude,personalYear,karmic},life:await row([11,22,33].includes(life)?"master":"core",String(life)),birthday:await row("birthday",String(d.day)),attitude:await row([11,22,33].includes(attitude)?"master":"core",String(attitude)),personalYear:await row("core",String(personalYear))};}
async function compatibility(a:number,b:number){const x=Math.min(baseNumber(a),baseNumber(b)),y=Math.max(baseNumber(a),baseNumber(b));const r=await db("numerology_compatibility?pair_key=eq."+x+"-"+y+"&select=*");return r?.[0]??{};}
function freeText(p:any){return["🔢 ТВОЙ НУМЕРОЛОГИЧЕСКИЙ ПРОФИЛЬ","","📅 "+dateLabel(p.d),"","✨ Жизненный путь: "+labelNumber(p.nums.life),clean(p.life.meaning),"","🎂 День рождения: "+p.d.day,clean(p.birthday.meaning),"","🧭 Число установки: "+p.nums.attitude,clean(p.attitude.meaning),"","📅 Персональный год "+new Date().getUTCFullYear()+": "+p.nums.personalYear,clean(p.personalYear.meaning),"","💎 Полный профиль: отношения, деньги, реализация, сильные стороны и практические рекомендации.","","👑 ASTRA AURA MAX: профиль, совместимость и прогноз на год за 599⭐"].join("\n");}\nfunction premiumText(p:any){return["💎 ПОЛНЫЙ ПРОФИЛЬ ASTRA AURA","", "📅 "+dateLabel(p.d),"","✨ ЖИЗНЕННЫЙ ПУТЬ: "+labelNumber(p.nums.life),clean(p.life.meaning),clean(p.life.essence),"💪 Сильные стороны\n"+clean(p.life.strengths),"⚠️ Что может мешать\n"+clean(p.life.challenges),"🎯 Реализация\n"+clean(p.life.realization),"💰 Деньги\n"+clean(p.life.money),"❤️ Отношения\n"+clean(p.life.relationships),"🧭 Смысл\n"+clean(p.life.purpose),"💡 Совет\n"+clean(p.life.practical_advice),"","🎂 ДЕНЬ РОЖДЕНИЯ: "+p.d.day,clean(p.birthday.meaning),"💪 "+clean(p.birthday.strengths),"⚠️ "+clean(p.birthday.challenges),"❤️ "+clean(p.birthday.relationships),"","🧭 ЧИСЛО УСТАНОВКИ: "+p.nums.attitude,clean(p.attitude.meaning),clean(p.attitude.essence),"","📅 ПЕРСОНАЛЬНЫЙ ГОД: "+p.nums.personalYear,clean(p.personalYear.meaning),clean(p.personalYear.essence),clean(p.personalYear.practical_advice),p.nums.karmic?"♾ Кармическая тема: "+p.nums.karmic:"","🌙 ИТОГ","Твой профиль складывается из нескольких чисел. Посмотри, какие темы откликаются именно тебе.","","ASTRA AURA ✨"].filter(Boolean).join("\n");}
function buyKeyboard(p:any,payload:string){return{inline_keyboard:[[{text:"💎 "+p.title+" · "+p.stars+"⭐",callback_data:"buy:"+p.key+":"+payload}]]};}
async function invoice(chatId:number,p:any,payload:string,description:string){
 const body:any={title:p.title,description,payload,currency:"XTR",prices:[{label:p.title,amount:p.stars}]};
 if(p.key===PRODUCTS.club.key)body.subscription_period=MONTH;
 const link=await tg("createInvoiceLink",body);
 const label=p.key===PRODUCTS.club.key?"💎 Оформить Club · 99⭐":"💳 Оплатить · "+p.stars+"⭐";
 await tg("sendMessage",{chat_id:chatId,text:p.key===PRODUCTS.club.key?"💎 ASTRA AURA Club\\n\\nЕжемесячный доступ к расширенным материалам ASTRA AURA.\\n\\nСтоимость: 99⭐ в месяц. Подписка продлевается автоматически в Telegram. Ее можно отменить в настройках подписок Telegram.":"💎 "+p.title+"\\n\\nСтоимость: "+p.stars+"⭐\\n\\nПосле оплаты полный результат будет отправлен сюда автоматически.",reply_markup:{inline_keyboard:[[{text:label,url:link}]]}});
}

async function paid(chatId:number,user:any,payload:string,payment:any){

 const p=Object.values(PRODUCTS).find((x:any)=>payload===x.key||payload.startsWith(x.key+":")) as any;
 if(!p||payment.currency!=="XTR"||Number(payment.total_amount)!==p.stars)return;
 await db("numerology_purchases",{method:"POST",headers:{Prefer:"resolution=ignore-duplicates"},body:JSON.stringify({telegram_user_id:user.id,username:user.username??null,product_key:p.key,payload,currency:payment.currency,amount:payment.total_amount,telegram_charge_id:payment.telegram_payment_charge_id,is_recurring:Boolean(payment.is_recurring),subscription_expiration_date:payment.subscription_expiration_date?new Date(payment.subscription_expiration_date*1000).toISOString():null})});
 await event(user.id,"payment_success",p.key,{amount:payment.total_amount,recurring:Boolean(payment.is_recurring)});
 if(p.key===PRODUCTS.profile.key){const m=payload.match(/^full_numerology_profile_v1:(\d{2}\.\d{2}\.\d{4})$/),x=m?await profile(m[1]):null;if(x)await sendLong(chatId,premiumText(x),mainKeyboard());}
 else if(p.key===PRODUCTS.compatibility.key){const m=payload.match(/^compatibility_v1:(\d{2}\.\d{2}\.\d{4})\|(\d{2}\.\d{2}\.\d{4})$/),a=m?await profile(m[1]):null,b=m?await profile(m[2]):null;if(a&&b){const c=await compatibility(a.nums.life,b.nums.life);await sendLong(chatId,["❤️ ПОЛНЫЙ РАЗБОР СОВМЕСТИМОСТИ","",dateLabel(a.d)+" · "+labelNumber(a.nums.life),dateLabel(b.d)+" · "+labelNumber(b.nums.life),"","✨ "+clean(c.meaning),"","💪 Сильная сторона\n"+clean(c.strengths),"","⚠️ Зона внимания\n"+clean(c.challenges),"","🗣 Как договариваться\n"+clean(c.guidance),"","🎂 Дополнительный слой\nДни рождения: "+a.d.day+" и "+b.d.day+".","📅 Текущие циклы\nВаши персональные годы: "+a.nums.personalYear+" и "+b.nums.personalYear+".","🌙 Итог\nЦифры не решают за вас, подходит ли человек. Они помогают точнее увидеть темы для разговора и договорённостей.","","Берегите живого человека за цифрами ❤️"].join("\n"),mainKeyboard());}}
 else if(p.key===PRODUCTS.forecast.key){const m=payload.match(/^annual_forecast_v1:(\d{2}\.\d{2}\.\d{4})$/),x=m?await profile(m[1]):null;if(x){const out=["🔮 ПОЛНЫЙ ПРОГНОЗ ASTRA AURA","",new Date().getUTCFullYear()+" · персональный год "+x.nums.personalYear,"",clean(x.personalYear.meaning),"","🗓 12 МЕСЯЦЕВ"];for(let mo=1;mo<=12;mo++){const n=reduceNumber(x.nums.personalYear+mo),r=await row("personal_month",String(n));out.push("\n"+mo+". "+clean(r.title)+" · число "+n,clean(r.meaning),clean(r.practical_advice));}out.push("","🌙 Итог\nЭто карта тем для саморефлексии и планирования, а не обещание конкретных событий.");await sendLong(chatId,out.join("\n"),mainKeyboard());}}
 else if(p.key===PRODUCTS.bundle.key){
   const m=payload.match(/^aura_max_bundle_v1:(\d{2}\.\d{2}\.\d{4})$/),x=m?await profile(m[1]):null;
   if(x){
     const out=["👑 ASTRA AURA MAX","", "Три направления в одном пакете ✨","", premiumText(x),
       "","🔮 ПРОГНОЗ НА ГОД","\n"+new Date().getUTCFullYear()+" · персональный год "+x.nums.personalYear,"",clean(x.personalYear.meaning),"","🗓 12 МЕСЯЦЕВ"];
     for(let mo=1;mo<=12;mo++){const n=reduceNumber(x.nums.personalYear+mo),r=await row("personal_month",String(n));out.push("\n"+mo+". "+clean(r.title)+" · число "+n,clean(r.meaning),clean(r.practical_advice));}
     out.push("","🤝 Теперь введи вторую дату рождения, чтобы завершить парный разбор ASTRA AURA MAX ❤️");
     await setSession(user.id,"compatibility_bundle",1,{date1:m[1]});
     await sendLong(chatId,out.join("\n"));
   }
 } else await tg("sendMessage",{chat_id:chatId,text:"🌟 ASTRA AURA Club активирован. Каждый месяц доступны расширенные материалы, новые циклы и будущие функции ✨",...mainKeyboard()});
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
       try{await db("numerology_referrals",{method:"POST",headers:{Prefer:"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify({referrer_telegram_user_id:refId,referred_telegram_user_id:user.id,start_code:code})});await event(user.id,"referral_join",null,{referrer_telegram_user_id:refId});}catch(e){console.error(e);}
     }
   }
   await clearSession(user.id);
   await tg("sendMessage",{chat_id:chatId,text:"✨ ASTRA AURA\n\nРазберём числа твоей даты рождения спокойно и без лишнего шума 🙂\n\nВыбирай направление ниже 👇",...mainKeyboard()});return;
 }
 if(text==="/start"||text==="🏠 Главное меню"){await clearSession(user.id);await tg("sendMessage",{chat_id:chatId,text:"✨ ASTRA AURA\n\nРазберём числа твоей даты рождения спокойно и без лишнего шума 🙂\n\nВыбирай направление ниже 👇",...mainKeyboard()});return;}
 if(text==="🔢 Нумерология"){await clearSession(user.id);await event(user.id,"product_view",PRODUCTS.profile.key);await tg("sendMessage",{chat_id:chatId,text:"🔢 НУМЕРОЛОГИЯ\n\nОтправь дату рождения ДД.ММ.ГГГГ.\nНапример: 04.05.1993\n\nГород и время не нужны.",...mainKeyboard()});return;}
 if(text==="🤝 Совместимость"){await setSession(user.id,"compatibility",1,{});await event(user.id,"product_view",PRODUCTS.compatibility.key);await tg("sendMessage",{chat_id:chatId,text:"🤝 СОВМЕСТИМОСТЬ\n\nСравним две даты рождения ❤️\n\nСначала отправь первую дату ДД.ММ.ГГГГ.",...mainKeyboard()});return;}
 if(text==="🔮 Прогноз на год"){await setSession(user.id,"forecast",1,{});await event(user.id,"product_view",PRODUCTS.forecast.key);await tg("sendMessage",{chat_id:chatId,text:"🔮 ПРОГНОЗ НА ГОД\n\nОтправь дату рождения ДД.ММ.ГГГГ.\nПокажу тему года, затем можно открыть прогноз на 12 месяцев.",...mainKeyboard()});return;}
 if(text==="💎 ASTRA AURA Club"){await event(user.id,"product_view",PRODUCTS.club.key);await invoice(chatId,PRODUCTS.club,PRODUCTS.club.key,"Ежемесячный доступ к расширенным материалам и функциям ASTRA AURA.");return;}
 if(text==="📖 Справочник"){await tg("sendMessage",{chat_id:chatId,text:"📖 СПРАВОЧНИК\n\n🔢 Числа 1-9\n🌟 11, 22, 33\n🎂 День рождения 1-31\n🧭 Число установки\n📅 Персональный год\n🗓 Персональный месяц\n♾ Кармические числа\n🤝 Совместимость по жизненному пути",...mainKeyboard()});return;}
 if(text==="🧾 Мои покупки"){const rows=await db("numerology_purchases?telegram_user_id=eq."+user.id+"&select=product_key,amount,created_at,is_recurring&order=created_at.desc&limit=20");const names:any={};Object.values(PRODUCTS).forEach((x:any)=>names[x.key]=x.title);const refs=await db("numerology_referrals?referrer_telegram_user_id=eq."+user.id+"&select=id");const refCount=refs?.length??0;const body=rows?.length?rows.map((r:any)=>"• "+(names[r.product_key]??r.product_key)+" · "+r.amount+"⭐ · "+new Date(r.created_at).toLocaleDateString("ru-RU")+(r.is_recurring?" · подписка":"")).join("\n"):"Пока здесь пусто. Первый продукт можно открыть после бесплатного расчёта 🙂";await tg("sendMessage",{chat_id:chatId,text:"🧾 МОИ ПОКУПКИ\n\n"+body+"\n\n👥 Приглашено: "+refCount+"\n\n🔗 Твоя ссылка: https://t.me/astra_aura_bot?start=ref_"+user.id,...mainKeyboard()});return;}
 if(text==="ℹ️ О боте"){await tg("sendMessage",{chat_id:chatId,text:"ℹ️ О БОТЕ\n\nASTRA AURA - нумерология по дате рождения.\n\nРасчёт, интерпретация и персональные разборы ✨",...mainKeyboard()});return;}
 if(text==="❓ Помощь"){await tg("sendMessage",{chat_id:chatId,text:"❓ ПОМОЩЬ\n\n1. Выбери направление.\n2. Отправь дату или две даты.\n3. Получи бесплатный предварительный результат.\n4. Если захочешь глубже, открой полный продукт 💎",...mainKeyboard()});return;}

 const s=await getSession(user.id),d=parseDate(text);
 if(s?.mode==="compatibility_bundle"){
   if(!d){await tg("sendMessage",{chat_id:chatId,text:"Нужна вторая дата ДД.ММ.ГГГГ 🙂",...mainKeyboard()});return;}
   const a=await profile(s.data.date1),b=await profile(dateLabel(d));await clearSession(user.id);
   if(a&&b){const cc=await compatibility(a.nums.life,b.nums.life);await event(user.id,"bundle_compatibility_completed",PRODUCTS.bundle.key);
     await sendLong(chatId,["❤️ ASTRA AURA MAX · СОВМЕСТИМОСТЬ","",dateLabel(a.d)+" · "+labelNumber(a.nums.life),dateLabel(b.d)+" · "+labelNumber(b.nums.life),"","✨ "+clean(cc.meaning),"","💪 Сильные стороны\n"+clean(cc.strengths),"","⚠️ Зона внимания\n"+clean(cc.challenges),"","🗣 Как договариваться\n"+clean(cc.guidance),"","🌙 Итог\nЦифры не решают за вас, подходит ли человек. Они помогают увидеть темы для разговора и договорённостей.","","👑 Пакет MAX завершён. Спасибо за доверие ❤️"].join("\n"),mainKeyboard());return;}
 }
 if(s?.mode==="compatibility"){
   if(!d){await tg("sendMessage",{chat_id:chatId,text:"Нужна дата ДД.ММ.ГГГГ 🙂",...mainKeyboard()});return;}
   if(s.step===1){await setSession(user.id,"compatibility",2,{date1:dateLabel(d)});await tg("sendMessage",{chat_id:chatId,text:"Принял 👍\n\nТеперь отправь вторую дату рождения.",...mainKeyboard()});return;}
   const a=await profile(s.data.date1),b=await profile(dateLabel(d));await clearSession(user.id);
   if(a&&b){const c=await compatibility(a.nums.life,b.nums.life);await event(user.id,"compatibility_preview",PRODUCTS.compatibility.key);await tg("sendMessage",{chat_id:chatId,text:"🤝 ПРЕДВАРИТЕЛЬНЫЙ РАЗБОР\n\nТы: "+labelNumber(a.nums.life)+"\nПартнёр: "+labelNumber(b.nums.life)+"\n\n✨ "+clean(c.meaning)+"\n\n💎 Полный разбор раскрывает сильные стороны пары, зоны напряжения и практические рекомендации ❤️",...mainKeyboard()});await invoice(chatId,PRODUCTS.compatibility,PRODUCTS.compatibility.key+":"+s.data.date1+"|"+dateLabel(d),"Полный разбор совместимости ASTRA AURA.");return;}
 }
 if(s?.mode==="forecast"){
   if(!d){await tg("sendMessage",{chat_id:chatId,text:"Нужна дата ДД.ММ.ГГГГ 🙂",...mainKeyboard()});return;}
   const p=await profile(dateLabel(d));await clearSession(user.id);
   if(p){await event(user.id,"forecast_preview",PRODUCTS.forecast.key);await tg("sendMessage",{chat_id:chatId,text:"🔮 ПРЕДВАРИТЕЛЬНЫЙ ПРОГНОЗ\n\n"+new Date().getUTCFullYear()+" · персональный год "+p.nums.personalYear+"\n\n"+clean(p.personalYear.meaning)+"\n\n💎 Полная версия раскрывает все 12 месяцев.",...mainKeyboard()});await invoice(chatId,PRODUCTS.forecast,PRODUCTS.forecast.key+":"+dateLabel(d),"Персональный прогноз ASTRA AURA на 12 месяцев.");return;}
 }
 const p=await profile(text);if(p){await event(user.id,"free_profile",PRODUCTS.profile.key);await tg("sendMessage",{chat_id:chatId,text:freeText(p),...mainKeyboard()});await invoice(chatId,PRODUCTS.profile,PRODUCTS.profile.key+":"+dateLabel(p.d),"Полный нумерологический профиль ASTRA AURA.");await invoice(chatId,PRODUCTS.bundle,PRODUCTS.bundle.key+":"+dateLabel(p.d),"ASTRA AURA MAX: профиль, прогноз и совместимость.");return;}
 await tg("sendMessage",{chat_id:chatId,text:"Я здесь 🙂 Отправь дату ДД.ММ.ГГГГ или выбери направление в меню.",...mainKeyboard()});
}

Deno.serve(async(req)=>{
 try{
  if(req.method!=="POST")return new Response("ASTRA AURA v39",{status:200});
  if(!BOT_TOKEN||!SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY)return new Response("configuration error",{status:500});
  const u=await req.json();
  if(u.callback_query){
   const c=u.callback_query;await tg("answerCallbackQuery",{callback_query_id:c.id});const data=String(c.data??"");
   if(data.startsWith("buy:")&&c.message?.chat?.id){
    const z=data.split(":"),key=z[1],payload=z.slice(2).join(":"),p=(Object.values(PRODUCTS) as any[]).find((x:any)=>x.key===key);if(!p)return new Response("ok");
    let ok=false;
    if(key===PRODUCTS.profile.key||key===PRODUCTS.forecast.key)ok=/^\d{2}\.\d{2}\.\d{4}$/.test(payload)&&Boolean(parseDate(payload));
    if(key===PRODUCTS.compatibility.key){const m=payload.match(/^(\d{2}\.\d{2}\.\d{4})\|(\d{2}\.\d{2}\.\d{4})$/);ok=Boolean(m&&parseDate(m[1])&&parseDate(m[2]));}
    if(key===PRODUCTS.bundle.key)ok=/^\d{2}\.\d{2}\.\d{4}$/.test(payload)&&Boolean(parseDate(payload));
    if(ok){await event(c.from.id,"checkout_click",p.key,{payload});await invoice(c.message.chat.id,p,key+":"+payload,"Персональный продукт ASTRA AURA.");}
   }
   return new Response("ok");
  }
  await handle(u);return new Response("ok");
 }catch(e){console.error(e);return new Response("ok");}
});