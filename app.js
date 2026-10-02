const CHAT_URL="https://dfvztoazthliaobqnndv.supabase.co/functions/v1/astra-chat-v2";
const STORAGE_KEY="astra-aura-profile-v2";
const DEVICE_KEY="astra-aura-device-id";
const $=s=>document.querySelector(s),messages=$("#messages");
const getProfile=()=>JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
const getDeviceId=()=>{let id=localStorage.getItem(DEVICE_KEY);if(!id){id=crypto.randomUUID();localStorage.setItem(DEVICE_KEY,id)}return id};
function scrollToId(id){document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"})}
function addMessage(text,type="assistant"){const row=document.createElement("div");row.className="message "+type;row.innerHTML='<div class="message-avatar">'+(type==="user"?"◉":"✦")+'</div><div class="bubble"></div>';row.querySelector(".bubble").textContent=text;messages.appendChild(row);messages.scrollTop=messages.scrollHeight}
async function callAI(value){
  const profile=getProfile();
  const mode=$("#modeSelect").value||profile.mode||"reflection";
  const res=await fetch(CHAT_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({channel:"web",external_id:getDeviceId(),display_name:profile.name||"",message:value,mode,profile})});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||"Ошибка AI");
  if(data.mode)$("#modeSelect").value=data.mode;
  return data;
}
$("#startButton").addEventListener("click",()=>{scrollToId("chatPanel");setTimeout(()=>$("#messageInput").focus(),300)});
$("#profileButton").addEventListener("click",()=>scrollToId("birthPanel"));
document.querySelectorAll(".feature-card").forEach(card=>card.addEventListener("click",()=>{
  const mode=card.dataset.mode;
  $("#modeSelect").value=mode;
  if(mode==="natal")scrollToId("birthPanel");else{scrollToId("chatPanel");setTimeout(()=>$("#messageInput").focus(),300)}
}));
document.querySelectorAll(".nav-item").forEach(item=>item.addEventListener("click",()=>{document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));item.classList.add("active");if(item.dataset.scroll!=="top")scrollToId(item.dataset.scroll);else window.scrollTo({top:0,behavior:"smooth"})}));
$("#chatForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const input=$("#messageInput"),value=input.value.trim();
  if(!value)return;
  addMessage(value,"user");input.value="";
  const button=$("#chatForm button");button.disabled=true;
  addMessage("Секунду…");const pending=messages.lastElementChild;
  try{const data=await callAI(value);pending.remove();addMessage(data.answer||"Нет ответа.");}
  catch(err){pending.remove();addMessage("Сейчас не удалось получить ответ. Попробуй ещё раз.");}
  finally{button.disabled=false}
});
const saved=getProfile();
if(saved){
  $("#birthDate").value=saved.date||"";
  $("#birthTime").value=saved.time||"";
  $("#birthPlace").value=saved.place||"";
  $("#modeSelect").value=saved.mode||"reflection";
}
$("#birthForm").addEventListener("submit",e=>{
  e.preventDefault();
  const profile={...getProfile(),date:$("#birthDate").value,time:$("#birthTime").value,place:$("#birthPlace").value.trim(),mode:$("#modeSelect").value};
  localStorage.setItem(STORAGE_KEY,JSON.stringify(profile));
  addMessage("Профиль сохранён. Эти данные будут использоваться в следующих консультациях.");
  scrollToId("chatPanel");
});
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));