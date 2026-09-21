(function () {
  "use strict";
  const A = window.App,
    e = A.escape,
    i = A.icon;
  const count = (n) => String(n).padStart(2, "0");
  const today = (d) => new Date(d).toDateString() === new Date().toDateString();
  const patientCell = (p) =>
    `<div class="patient-cell">${A.patientAvatar(p)}<div><button class="patient-name" data-patient="${e(p.id)}">${e(p.name)}</button><span class="patient-meta">${e(p.code)} · ${A.age(p.birthDate)} anos</span></div></div>`;
  const waitLabel = (p) => {
    const m = A.wait(p);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`;
  };
  function metric(label, value, unit, icon, foot) {
    return `<article class="stat-card"><div class="stat-top"><span class="stat-label">${label}</span><span class="stat-icon">${i(icon, 19)}</span></div><div class="stat-value">${value}${unit ? `<span>${unit}</span>` : ""}</div><div class="stat-foot">${foot}</div></article>`;
  }
  function flowChart(mode) {
    const now = new Date(),
      patients = Store.patients();
    const series = Array.from(
      { length: mode === "day" ? 8 : 7 },
      (_, index) => {
        let from, to, label;
        if (mode === "day") {
          from = new Date(now);
          from.setHours(now.getHours() - 7 + index, 0, 0, 0);
          to = new Date(from.getTime() + 3600000);
          label = from.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          });
        } else {
          from = new Date(now);
          from.setDate(now.getDate() - 6 + index);
          from.setHours(0, 0, 0, 0);
          to = new Date(from);
          to.setDate(to.getDate() + 1);
          label = from.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          });
        }
        return {
          label,
          arrivals: patients.filter(
            (p) => new Date(p.arrivalAt) >= from && new Date(p.arrivalAt) < to,
          ).length,
          finished: patients.filter(
            (p) =>
              p.finishedAt &&
              new Date(p.finishedAt) >= from &&
              new Date(p.finishedAt) < to,
          ).length,
        };
      },
    );
    const max = Math.max(
        4,
        ...series.map((s) => Math.max(s.arrivals, s.finished)),
      ),
      ceil = Math.ceil(max / 4) * 4,
      w = 640,
      h = 180,
      left = 33,
      right = 17,
      top = 17,
      bottom = 30,
      graphH = h - top - bottom;
    const x = (index) =>
        left + (index * (w - left - right)) / (series.length - 1),
      y = (v) => top + graphH - (v / ceil) * graphH;
    const line = (key) =>
      series
        .map(
          (s, index) =>
            `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(s[key]).toFixed(1)}`,
        )
        .join(" ");
    return `<div class="flow-chart"><svg role="img" aria-label="Entradas e conclusões ${mode === "day" ? "nas últimas oito horas" : "nos últimos sete dias"}. Dados disponíveis em tabela abaixo." viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${[0, 1, 2, 3, 4].map((t) => `<line x1="${left}" y1="${y((t * ceil) / 4)}" x2="${w - right}" y2="${y((t * ceil) / 4)}" stroke="#dce3e5" stroke-dasharray="2 4"/><text x="${left - 12}" y="${y((t * ceil) / 4) + 3}" fill="#54666d" font-size="10" text-anchor="end">${(t * ceil) / 4}</text>`).join("")}<path d="${line("finished")}" stroke="#aa7017" stroke-width="2" fill="none" stroke-dasharray="5 4"/><path d="${line("arrivals")}" stroke="#00646d" stroke-width="2.3" fill="none"/>${series.map((s, index) => `<rect x="${x(index) - 2.5}" y="${y(s.arrivals) - 2.5}" width="5" height="5" fill="#00646d"><title>${s.label}: ${s.arrivals} entradas e ${s.finished} conclusões</title></rect><text x="${x(index)}" y="${h - 8}" text-anchor="middle" fill="#53676e" font-size="10">${s.label}</text>`).join("")}</svg></div><div class="chart-summary"><span>${mode === "day" ? "Últimas 8 horas" : "Últimos 7 dias"}</span><strong>${series.reduce((n, s) => n + s.arrivals, 0)} entradas no período</strong></div><details class="chart-data-details"><summary>Consultar dados do gráfico</summary><table><caption class="sr-only">Entradas e conclusões por período</caption><thead><tr><th>Período</th><th>Entradas</th><th>Conclusões</th></tr></thead><tbody>${series.map((s) => `<tr><td>${s.label}</td><td>${s.arrivals}</td><td>${s.finished}</td></tr>`).join("")}</tbody></table></details>`;
  }
  A.pages.dashboard = function (container) {
    const patients = Store.patients(),
      waiting = A.queue(),
      active = patients.filter((p) => p.status !== "finished"),
      classified = active.filter((p) => p.risk),
      attending = active.filter((p) => p.status === "attending"),
      newToday = patients.filter((p) => today(p.arrivalAt)),
      pending = active.filter((p) => p.status === "triage");
    const avg = waiting.length
      ? Math.round(waiting.reduce((n, p) => n + A.wait(p), 0) / waiting.length)
      : 0;
    const risks = Store.risks.map((r) => ({
      ...r,
      count: classified.filter((p) => p.risk === r.id).length,
    }));
    const maxRisk = Math.max(1, ...risks.map((r) => r.count));
    const staff = Store.staff(),
      available = staff.filter((s) => s.status === "available").length;
    const hour = new Date().getHours(),
      greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
    container.innerHTML = `<section class="home-hero" aria-labelledby="welcome-title"><div class="hero-copy"><div class="hero-kicker">${greeting}, Camila. Bem-vinda ao plantão.</div><h1 id="welcome-title">O primeiro<br>cuidado é <em>ouvir.</em></h1><p>Acolha quem chegou, acompanhe a espera e mantenha a equipe por perto. Um paciente de cada vez.</p><div class="hero-actions"><button class="btn btn-amber" data-add-patient>${i("plus", 17)} Receber paciente</button><a class="hero-secondary" href="triagem.html">Iniciar triagem ${i("arrow-right", 16)}</a></div></div><figure class="hero-photo"><img src="assets/images/care-conversation.jpg" width="1600" height="1067" alt="Profissional de saúde conversando com um paciente durante uma consulta." fetchpriority="high"><figcaption><strong>Escuta, respeito e atenção.</strong><span>Desde a primeira conversa.</span></figcaption></figure></section>
    <div class="home-tools"><a class="home-tool" href="triagem.html"><span class="home-tool-icon">${i("clipboard", 27)}</span><div><strong>Acolhimento e triagem</strong><p>${pending.length ? `${pending.length} pessoas aguardam a avaliação inicial.` : "Nenhuma pessoa aguardando triagem no momento."}</p></div><span class="home-tool-count">Ver pacientes</span>${i("arrow-right", 19)}</a><a class="home-tool" href="equipe.html"><span class="home-tool-icon">${i("users", 27)}</span><div><strong>Conte com a sua equipe</strong><p>${staff.length} profissionais no plantão · ${available} disponíveis agora.</p></div><span class="home-tool-count">Consultar equipe</span>${i("arrow-right", 19)}</a></div>
    <div class="home-section-heading"><div><div class="section-label">PRONTO ATENDIMENTO</div><h2>Como está a unidade</h2><p>O movimento de hoje e os pacientes em cuidado.</p></div><span class="live-status"><span class="live-dot"></span> Visão do momento</span></div>
    <div class="stat-grid unit-summary">${metric("Pacientes recebidos hoje", count(newToday.length), "", "users", "Entradas desde 00h")}${metric("Aguardando atendimento", count(waiting.length), "", "clock", "Pacientes já classificados")}${metric("Em atendimento", count(attending.length), "", "stethoscope", "Com a equipe neste momento")}${metric("Espera média na fila", avg, "min", "activity", `Desde a chegada · ${waiting.length} pacientes`)}</div>
    <div class="dashboard-bottom-grid"><section class="card queue-card" aria-labelledby="queue-heading"><header class="card-header"><div><h2 class="card-title" id="queue-heading">Próximos atendimentos <span class="count-pill">${waiting.length} na fila</span></h2><p class="card-subtitle">Prioridade registrada, seguida da ordem de chegada.</p></div><a href="fila.html" class="card-link">Abrir fila ${i("arrow-right", 15)}</a></header><div class="table-wrap"><table class="data-table"><thead><tr><th>Paciente</th><th>Classificação</th><th>Espera</th><th><span class="sr-only">Ação</span></th></tr></thead><tbody>${
      waiting
        .slice(0, 4)
        .map(
          (p) =>
            `<tr><td>${patientCell(p)}</td><td>${A.riskBadge(p.risk)}</td><td><span class="wait-time">${i("clock", 13)} ${waitLabel(p)}</span></td><td><button class="icon-btn" data-call="${e(p.id)}" aria-label="Chamar ${e(p.name)}">${i("arrow-right", 17)}</button></td></tr>`,
        )
        .join("") ||
      '<tr><td colspan="4">Nenhum paciente aguardando atendimento.</td></tr>'
    }</tbody></table></div><div class="queue-footer">${i("info", 14)} O tempo de espera é contado a partir da chegada.</div></section>
    <section class="card shift-card" aria-labelledby="team-heading"><header class="card-header"><div><h2 class="card-title" id="team-heading">Gente que cuida</h2><p class="card-subtitle">Profissionais do seu plantão</p></div><a class="card-link" href="equipe.html">Ver equipe ${i("arrow-right", 15)}</a></header><div class="shift-list">${staff
      .slice(0, 4)
      .map(
        (s) =>
          `<a href="equipe.html?q=${encodeURIComponent(s.name)}" class="shift-row">${A.staffAvatar(s)}<div><strong>${e(s.name)}</strong><small>${e(s.role)} · ${e(s.department)}</small></div><span class="staff-state"><span class="staff-dot ${s.status}"></span><span class="sr-only">${s.status === "available" ? "Disponível" : s.status === "busy" ? "Em atendimento" : "Em pausa"}</span></span></a>`,
      )
      .join(
        "",
      )}</div><div class="team-footer"><span>${available} profissionais disponíveis</span><span class="photo-caption">Fotos ilustrativas</span></div></section></div>
    <div class="dashboard-main-grid"><section class="card flow-card" aria-labelledby="flow-heading"><header class="card-header"><div><h2 class="card-title" id="flow-heading">Entradas e atendimentos</h2><p class="card-subtitle">Acompanhe a movimentação da unidade.</p></div><div class="segmented" aria-label="Período do gráfico"><button class="active" data-flow="day" aria-pressed="true">Hoje</button><button data-flow="week" aria-pressed="false">7 dias</button></div></header><div class="chart-legend"><span><span class="legend-dot"></span>Entradas</span><span><span class="legend-dot light"></span>Atendimentos concluídos</span></div><div id="flow-chart-content">${flowChart("day")}</div></section><section class="card" aria-labelledby="risk-heading"><header class="card-header"><div><h2 class="card-title" id="risk-heading">Classificação de risco</h2><p class="card-subtitle">${classified.length} pacientes classificados em cuidado</p></div></header><div class="risk-distribution">${risks.map((r) => `<div class="risk-breakdown-row"><span>${e(r.label)}</span><div class="risk-track" aria-hidden="true"><span style="width:${(r.count / maxRisk) * 100}%;--risk-color:${r.color};${r.count ? "" : "min-width:0"}"></span></div><strong>${count(r.count)}</strong></div>`).join("")}</div><div class="risk-card-footer">${i("shield", 14)} Classificação definida pelo profissional.</div></section></div>
    <div class="home-closing">${i("file-text", 23)}<p><strong>Na troca de plantão, o registro faz diferença.</strong> Mantenha as observações do atendimento atualizadas para a próxima equipe.</p><a href="atendimentos.html">Consultar atendimentos</a></div>`;
    container.querySelectorAll("[data-flow]").forEach(
      (btn) =>
        (btn.onclick = () => {
          container.querySelectorAll("[data-flow]").forEach((b) => {
            b.classList.toggle("active", b === btn);
            b.setAttribute("aria-pressed", String(b === btn));
          });
          container.querySelector("#flow-chart-content").innerHTML = flowChart(
            btn.dataset.flow,
          );
        }),
    );
  };
})();
