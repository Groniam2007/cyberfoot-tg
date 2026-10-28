// Собирает index.html (Telegram Mini App) из cyberfoot.html. Запуск: node build.js
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'cyberfoot.html'), 'utf8');
let out = src;

function sub(from, to) {
  if (!out.includes(from)) throw new Error('Не найден фрагмент: ' + from);
  out = out.replace(from, to);
}

// 1. Telegram SDK в <head> до остальных скриптов
sub('<head><meta charset="utf-8">', '<head><meta charset="utf-8"><script src="https://telegram.org/js/telegram-web-app.js"></script>');

// 2. Safe area Telegram (работает только при классе .tg на <html>)
sub('</style></head>', `
html.tg{--tgt:calc(var(--tg-safe-area-inset-top,0px) + var(--tg-content-safe-area-inset-top,0px));--tgb:calc(var(--tg-safe-area-inset-bottom,0px) + var(--tg-content-safe-area-inset-bottom,0px))}
html.tg:root{padding-top:max(env(safe-area-inset-top,0px),var(--tgt));padding-bottom:0}
html.tg{scroll-padding-top:var(--tgt)}
html.tg body::before{height:max(env(safe-area-inset-top,0px),var(--tgt))}
html.tg #app{padding-bottom:calc(96px + max(env(safe-area-inset-bottom,0px),var(--tgb)))}
html.tg .tabs{padding-bottom:calc(6px + max(env(safe-area-inset-bottom,0px),var(--tgb)))}
html.tg .md{padding-top:max(16px,var(--tgt));padding-bottom:max(16px,var(--tgb))}
html.tg .ts{top:calc(12px + max(env(safe-area-inset-top,0px),var(--tgt)))}
</style></head>`);

// 3. Вибрация при голе в живом матче (оба варианта трансляции)
sub('if(s.length>(window.pg||0))window.gt=m;', 'if(s.length>(window.pg||0)){window.gt=m;window.tgGoal&&tgGoal()}');
sub('if(s.length>pg)gt=m;', 'if(s.length>pg){gt=m;window.tgGoal&&tgGoal()}');

// 4. Интеграция с Telegram WebApp отдельным скриптом после игры
const tg = `<script>
(function(){
var W=window.Telegram&&window.Telegram.WebApp;if(!W||!W.platform||W.platform=='unknown')return; // вне Telegram SDK тоже создаёт WebApp, но с platform 'unknown'
document.documentElement.classList.add('tg');
function c(f){try{f()}catch(e){}}
c(function(){W.ready()});c(function(){W.expand()});c(function(){W.disableVerticalSwipes()});
c(function(){W.setHeaderColor('#0a1220')});c(function(){W.setBackgroundColor('#0a1220')});
var H=W.HapticFeedback;
window.tgGoal=function(){c(function(){H.notificationOccurred('success')})};
var b0=boom;boom=function(){window.tgGoal();return b0.apply(this,arguments)};
var d0=drPick;drPick=function(){c(function(){H.impactOccurred('light')});return d0.apply(this,arguments)};
var BB=W.BackButton,vis=false;
function sync(){var on=!!document.querySelector('.md')||G!==null;if(on!==vis){vis=on;c(function(){on?BB.show():BB.hide()})}}
c(function(){BB.onClick(function(){
  var m=document.querySelectorAll('.md'),top=m[m.length-1];
  if(top){if(top.id!='mmb')top.remove();sync();return}
  if(document.getElementById('mmb'))return;
  if(G!==null){clearInterval(TM);G=null;start();window.scrollTo(0,0)}
  sync();
})});
new MutationObserver(sync).observe(document.body,{childList:true,subtree:true});
setInterval(sync,400);sync();
})();
</script></body></html>`;
sub('</script></body></html>', '</script>\n' + tg);

fs.writeFileSync(path.join(__dirname, 'index.html'), out);

// Проверка синтаксиса всех inline-скриптов
const { execFileSync } = require('child_process');
const os = require('os');
let i = 0;
for (const m of out.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
  const f = path.join(os.tmpdir(), 'cf_check_' + (i++) + '.js');
  fs.writeFileSync(f, m[1]);
  execFileSync(process.execPath, ['--check', f], { stdio: 'inherit' });
  fs.unlinkSync(f);
}
console.log('index.html собран, синтаксис OK (' + i + ' скрипта)');
