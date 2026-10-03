const CHAT_URL="https://dfvztoazthliaobqnndv.supabase.co/functions/v1/astra-chat-v2";
const STORAGE_KEY="astra-aura-profile-v7",DEVICE_KEY="astra-aura-device-v1",PEOPLE_KEY="astra-aura-people-v2";
const tgApp=window.Telegram?.WebApp||null,telegramInitData=tgApp?.initData||"";
if(tgApp){tgApp.ready();tgApp.expand();tgApp.enableClosingConfirmation?.(false)}
const $=s=>document.querySelector(s);
const getProfile=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}catch{return{}}};
const setProfile=p=>localStorage.setItem(STORAGE_KEY,JSON.stringify(p));
const getPeople=()=>{try{return JSON.parse(localStorage.getItem(PEOPLE_KEY)||"[]")}catch{return[]}};
const dateLabel=s=>s?s.split("-").reverse().join("."):"";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",""":"&quot;","'":"&#039;"}[c]));
function toast(t){const x=$("#toast");x.textContent=t;x.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>x.classList.remove("show"),2400)}
function scrollToId(id){document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});if(tgApp?.BackButton&&id!=="home")tgApp.BackButton.show();else tgApp?.BackButton?.hide()}
function addMessage(text,type="assistant"){const x=document.createElement("div");x.className="message "+type;x.textContent=text;$("#messages").appendChild(x);return x}
async function api(body){
 const r=await fetch(CHAT_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...body,channel:"web",external_id:localStorage.getItem(DEVICE_KEY)||crypto.randomUUID(),telegram_init_data:telegramInitData})});
 let d={};try{d=await r.json()}catch{}
 if(!r.ok||d.ok===false)throw Error(d.error||"server_error");return d;
}
function calc(date){
 if(!date)return null;const[y,m,day]=date.split("-").map(Number);
 const sum=n=>String(n).split("").reduce((a,d)=>a+Number(d),0);
 const red=n=>{let x=n;while(x>9&&!([11,22,33].includes(x)))x=sum(x);return x};
 const base=n=>[11,22,33].includes(n)?sum(n):n;
 if(!y||!m||!day)return null;
 const year=new Date().getFullYear(),life=red(red(m)+red(day)+sum(y)),att=red(m+day),py=base(red(m+day+sum(year))),pm=base(red(py+new Date().getMonth()+1));
 return{life,att,py,pm,year};
}
function renderCabinet(data={}){
 const p=getProfile(),n=calc(p.date);$("#cabinetName").textContent=p.name||"Мой профиль";$("#cabinetDate").textContent=n?dateLabel(p.date):"Дата рождения не задана";$("#userName").value=p.name||"";
 if(!n){$("#cabinetEmpty").hidden=false;$("#cabinetData").hidden=true;return}
 $("#cabinetEmpty").hidden=true;$("#cabinetData").hidden=false;
 $("#lifeNumber").textContent=n.life;$("#attitudeNumber").textContent=n.att;$("#yearNumber").textContent=n.py;$("#monthNumber").textContent=n.pm;$("#cycleYear").textContent=n.year;$("#cycleMonth").textContent=new Date().toLocaleString("ru-RU",{month:"long"});
 const people=data.people||getPeople();$("#peopleCount").textContent=people.length;
 $("#peopleList").innerHTML=people.length?people.map(x=>'<div class="list-row"><div><b>'+esc(x.name)+'</b><small>'+esc(dateLabel(x.date))+'</small></div><span>♡</span></div>').join(""):'<div class="empty-mini">Пока никого не сохранено.</div>';
 const readings=data.readings||[];$("#readingCount").textContent=readings.length;
 $("#readingList").innerHTML=readings.length?readings.slice(0,8).map(x=>'<div class="list-row"><div><b>'+esc(x.title||x.reading_type)+'</b><small>'+esc(new Date(x.created_at).toLocaleDateString("ru-RU"))+'</small></div><span>'+((x.is_paid)?"◆":"·")+'</span></div>').join(""):'<div class="empty-mini">История появится после первого разбора.</div>';
}
async function sync(){
 if(!telegramInitData){renderCabinet();return}
 try{
  const d=await api({action:"cabinet"}),u=d.user||{},p=getProfile();
  if(u.birth_date||u.display_name)setProfile({...p,name:u.display_name||p.name,date:u.birth_date||p.date});
  localStorage.setItem(PEOPLE_KEY,JSON.stringify((d.people||[]).map(x=>({id:x.id,name:x.name,date:x.birth_date,relationship:x.relationship||""}))));
  renderCabinet(d);$("#syncState").textContent="синхронизировано";$("#syncStatus").textContent="✓ Профиль, связи и история синхронизированы.";
 }catch(e){$("#syncState").textContent="ошибка";$("#syncStatus").textContent="Локальные данные сохранены."}
}
async function saveProfile(e){
 e.preventDefault();const name=$("#userName").value.trim(),date=$("#birthDate").value;if(!date)return toast("Укажи дату рождения");
 setProfile({...getProfile(),name,date});renderCabinet();
 try{if(telegramInitData)await api({action:"save_profile",name,birth_date:date});toast("Профиль сохранён")}catch(e){toast("Сохранено локально")}
}
async function savePerson(e){
 e.preventDefault();const name=$("#personName").value.trim(),date=$("#personDate").value;if(!name||!date)return toast("Укажи имя и дату");
 const a=getPeople();a.unshift({name,date});localStorage.setItem(PEOPLE_KEY,JSON.stringify(a.slice(0,20)));$("#personName").value="";$("#personDate").value="";renderCabinet();
 try{if(telegramInitData){await api({action:"save_person",name,birth_date:date});await sync()}toast("Связь сохранена")}catch(e){toast("Сохранено локально")}
}
async function reading(e){
 e.preventDefault();const d1=$("#date1").value;if(!d1)return toast("Укажи дату рождения");
 setProfile({...getProfile(),date:d1});addMessage(dateLabel(d1),"user");const pending=addMessage("Расчёт…","loading");$("#readingButton").disabled=true;
 try{
  const d=await api({action:"reading",mode:"numerology",date1:d1});pending.remove();addMessage(d.answer||"Готово.");$("#offersPanel").hidden=false;scrollToId("offersPanel");if(d.cabinet)renderCabinet(d.cabinet);toast("Разбор готов");
 }catch(e){pending.remove();addMessage("Не удалось получить результат. Проверь дату и попробуй снова.");toast("Ошибка расчёта")}
 finally{$("#readingButton").disabled=false}
}
async function buyProduct(product){
 const date1=$("#date1").value||getProfile().date||$("#birthDate").value;
 if(!date1)return toast("Сначала укажи дату рождения");
 let date2="";
 if(product==="compatibility"){date2=$("#date2").value;if(!date2)return toast("Укажи дату второго человека");if(date1===date2)return toast("Нужны две разные даты")}
 if(!tgApp||!telegramInitData)return toast("Оплата доступна внутри Telegram");
 try{
  const d=await api({action:"checkout",product_key:product==="profile"?"full_numerology_profile_v1":product==="forecast"?"annual_forecast_v1":"compatibility_v1",date1,date2});
  if(!d.url)throw Error("invoice_missing");
  tgApp.openInvoice(d.url,status=>{if(status==="paid"){toast("Оплата прошла");sync()}else if(status==="cancelled")toast("Оплата отменена");else if(status==="failed")toast("Оплата не прошла")});
 }catch(e){toast("Не удалось открыть оплату")}
}
$("#homeButton").onclick=()=>{window.scrollTo({top:0,behavior:"smooth"});tgApp?.BackButton?.hide()};
$("#startButton").onclick=()=>scrollToId("breakdownPanel");
$("#createProfileButton").onclick=()=>scrollToId("profilePanel");
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));b.classList.add("active");scrollToId(b.dataset.scroll)});
document.querySelectorAll(".buy-button").forEach(b=>b.onclick=()=>buyProduct(b.dataset.product));
$("#readingForm").onsubmit=reading;$("#birthForm").onsubmit=saveProfile;$("#savePersonForm").onsubmit=savePerson;
$("#birthDate").addEventListener("input",e=>{if(e.target.value)setProfile({...getProfile(),date:e.target.value})});
$("#date1").addEventListener("input",e=>{if(e.target.value)setProfile({...getProfile(),date:e.target.value})});
tgApp?.BackButton?.onClick(()=>{window.scrollTo({top:0,behavior:"smooth"});tgApp.BackButton.hide()});
const p=getProfile();if(p.date){$("#date1").value=p.date;$("#birthDate").value=p.date}
renderCabinet();sync();
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).then(()=>navigator.serviceWorker.register("./sw.js?v=14")).catch(()=>{}));