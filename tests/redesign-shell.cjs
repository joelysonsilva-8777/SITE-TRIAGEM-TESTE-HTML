const fs=require('node:fs');
const file='assets/js/core.js';let src=fs.readFileSync(file,'utf8');
const from=src.indexOf('    document.getElementById("app").innerHTML =');
const to=src.indexOf('    const menu = document.getElementById("mobile-menu"),',from);
if(from<0||to<0)throw new Error('Shell não encontrado');
const shell=String.raw`    const localDate=new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
    document.getElementById("app").innerHTML = \`<a class="skip-link" href="#main-content">Pular para o conteúdo</a>
      <div class="utility-bar"><div class="site-width utility-inner"><span>HOSPITAL SANTA CLARA <span class="utility-slash">/</span> PORTAL DA EQUIPE</span><span class="utility-demo">Demonstração · dados fictícios</span></div></div>
      <header class="hospital-masthead site-width">
        <a class="brand" href="index.html" aria-label="Clara — página inicial"><span class="brand-mark"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M14 3h12v11h11v12H26v11H14V26H3V14h11z" fill="currentColor"/><path d="M30 3h7v7h-7z" fill="#e3a038"/></svg></span><span class="brand-name">clara<span class="brand-caption">ACOLHIMENTO E ATENDIMENTO</span></span></a>
        <div class="masthead-details"><button class="hospital-button" id="hospital-button"><span class="masthead-icon">\${icon('hospital',24)}</span><span><small>Sua unidade</small><strong>Hospital Santa Clara</strong><span>Pronto atendimento</span></span></button><span class="masthead-divider"></span><button class="profile-button" id="profile-button"><span class="profile-symbol">\${icon('user',25)}</span><span><small>Bom trabalho,</small><strong>Camila Martins</strong><span>Enfermeira · Triagem</span></span>\${icon('chevron-down',15)}</button></div>
        <button class="icon-btn mobile-menu" id="mobile-menu" aria-label="Abrir menu" aria-expanded="false" aria-controls="sidebar">\${icon('menu',24)}</button>
      </header>
      <div class="navigation-band"><div class="site-width navigation-inner"><div class="mobile-page-label">\${current[2]}</div><nav class="primary-navigation" id="sidebar" aria-label="Navegação principal">\${nav.map(n=>\`<a class="nav-item \${page===n[0]?'active':''}" href="\${n[1]}" \${page===n[0]?'aria-current="page"':''}><span>\${n[2]}</span>\${n[0]==='fila'?'<span class="nav-count" id="nav-queue-count"></span>':''}</a>\`).join('')}</nav><div class="navigation-tools"><button class="global-search-trigger" id="global-search-trigger" aria-label="Buscar paciente">\${icon('search',19)}<span>Buscar paciente</span><kbd>Ctrl K</kbd></button><button class="icon-btn notification-button" id="notifications-button" aria-label="Ver atividade recente">\${icon('bell',19)}<span class="notification-dot"></span></button></div></div></div>
      <div class="mobile-backdrop" id="mobile-backdrop"></div>
      <div class="workspace"><div class="page-context site-width"><div><a href="index.html">Início</a><span>/</span><strong>\${current[2]}</strong></div><time>\${localDate}</time></div><main id="main-content" tabindex="-1"></main></div>
      <footer class="hospital-footer"><div class="site-width footer-main"><div class="footer-brand"><span class="footer-cross" aria-hidden="true">+</span><div><strong>clara</strong><span>Hospital Santa Clara</span></div></div><p>Um registro bem feito ajuda<br>quem cuida depois de você.</p><div class="footer-help"><span>Precisa encontrar alguma coisa?</span><button id="help-button">Central de ajuda \${icon('arrow-right',17)}</button></div></div><div class="site-width footer-bottom"><span>Ambiente de demonstração. Utilize apenas dados fictícios.</span><span>Fotografias ilustrativas · Clara 2.0</span></div></footer><div id="toasts" class="toast-container" aria-live="polite"></div>\`;
`;
src=src.slice(0,from)+shell.replace(/\\`/g,'`').replace(/\\\$/g,'$')+src.slice(to);
src=src.replace('matchMedia("(max-width:760px)")','matchMedia("(max-width:980px)")');
src=src.replace('title: "Um cuidado mais organizado"','title: "Como usar o Clara"');
src=src.replace('title: "Sua unidade de cuidado"','title: "Sobre a unidade"');
fs.writeFileSync(file,src);
for(const name of ['index','pacientes','triagem','fila','atendimentos','equipe','relatorios']){
 const path=name+'.html';let html=fs.readFileSync(path,'utf8');html=html.replace('#176348','#00646d').replace('manrope-latin.woff2','source-sans-3.woff2');fs.writeFileSync(path,html);
}
