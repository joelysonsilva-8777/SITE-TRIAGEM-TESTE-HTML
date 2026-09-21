(function () {
  "use strict";
  const A = window.App,
    e = A.escape,
    i = A.icon;
  const count = (n) => String(n).padStart(2, "0");
  const today = (d) => new Date(d).toDateString() === new Date().toDateString();
  const waitLabel = (p) => {
    const m = A.wait(p);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`;
  };
  const patientCell = (p) =>
    `<div class="patient-cell">${A.patientAvatar(p)}<div><button class="patient-name" data-patient="${e(p.id)}">${e(p.name)}</button><span class="patient-meta">${e(p.code)} <span>·</span> ${A.age(p.birthDate)} anos</span></div></div>`;
  A.pages.pacientes = function (container) {
    let status = "active",
      query = new URLSearchParams(location.search).get("q") || "",
      risk = "",
      page = 1;
    const pageSize = 8;
    container.innerHTML =
      A.header({
        eyebrow: "RECEP??O E CADASTRO",
        title: "Pacientes",
        description:
          "Encontre o cadastro, confira os dados e acompanhe cada etapa do atendimento.",
        actions: `<button class="btn btn-secondary" id="export-patients">${i("download", 15)} Exportar</button><button class="btn btn-primary" data-add-patient>${i("plus", 17)} Novo paciente</button>`,
      }) +
      `<div class="page-toolbar"><div class="tabs" role="group" aria-label="Filtrar situação"><button class="tab active" data-status="active">Em cuidado <span class="tab-count">${Store.patients().filter((p) => p.status !== "finished").length}</span></button><button class="tab" data-status="all">Todos os pacientes</button><button class="tab" data-status="finished">Finalizados</button></div></div><div class="page-toolbar"><div class="toolbar-group"><label class="search-field">${i("search", 16)}<input id="patient-search" placeholder="Buscar por nome ou prontuário..." aria-label="Buscar paciente por nome ou prontuário" value="${e(query)}"></label><select id="risk-filter" class="filter-select" aria-label="Filtrar classificação"><option value="">Todas as classificações</option><option value="none">Não classificado</option>${Store.risks.map((r) => `<option value="${r.id}">${e(r.label)}</option>`).join("")}</select></div><span class="muted" id="patient-result-count" role="status" style="font-size:13px;white-space:nowrap"></span></div><section class="card"><div class="table-wrap" id="patients-table"></div><div class="table-footer" id="patient-pagination"></div></section><div class="status-strip">${i("shield", 14)} Dados fictícios, organizados para uma experiência de cuidado completa.</div>`;
    const getFiltered = () =>
      Store.patients()
        .filter(
          (p) =>
            (status === "all" ||
              (status === "active"
                ? p.status !== "finished"
                : p.status === status)) &&
            (!risk || (risk === "none" ? !p.risk : p.risk === risk)) &&
            A.normalize(p.name + " " + p.code).includes(A.normalize(query)),
        )
        .sort((a, b) => new Date(b.arrivalAt) - new Date(a.arrivalAt));
    function render() {
      const all = getFiltered(),
        pages = Math.max(1, Math.ceil(all.length / pageSize));
      page = Math.min(page, pages);
      const list = all.slice((page - 1) * pageSize, page * pageSize);
      container.querySelector("#patient-result-count").textContent =
        `${all.length} paciente${all.length === 1 ? "" : "s"} encontrado${all.length === 1 ? "" : "s"}`;
      container.querySelector("#patients-table").innerHTML = list.length
        ? `<table class="data-table patients-table"><caption class="sr-only">Pacientes encontrados</caption><thead><tr><th>Paciente</th><th>Classificação</th><th>Situação</th><th>Chegada</th><th>Ações</th></tr></thead><tbody>${list.map((p) => `<tr><td>${patientCell(p)}</td><td>${A.riskBadge(p.risk)}</td><td>${A.statusBadge(p.status)}</td><td>${A.time(p.arrivalAt)}<small class="patient-meta">${A.date(p.arrivalAt)}</small></td><td><div class="table-actions"><button class="icon-btn" data-patient="${e(p.id)}" aria-label="Ver ficha de ${e(p.name)}">${i("eye", 16)}</button><button class="icon-btn" data-edit-patient="${e(p.id)}" aria-label="Editar cadastro de ${e(p.name)}">${i("edit", 15)}</button>${p.status === "triage" ? `<a class="btn btn-sm btn-secondary" href="triagem.html?patient=${encodeURIComponent(p.id)}">Triar ${i("arrow-right", 12)}</a>` : ""}</div></td></tr>`).join("")}</tbody></table>`
        : A.empty(
            "Nenhum paciente por aqui",
            "Ajuste os filtros ou cadastre um novo paciente.",
          );
      container.querySelector("#patient-pagination").innerHTML =
        `<span>${all.length ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, all.length)}` : "0"} de ${all.length} pacientes</span><nav class="pagination" aria-label="Paginação dos pacientes"><button ${page === 1 ? "disabled" : ""} data-page="${page - 1}" aria-label="Página anterior">${i("chevron-left", 14)}</button>${Array.from(
          { length: pages },
          (_, n) => n + 1,
        )
          .filter((n) => n === 1 || n === pages || Math.abs(n - page) < 2)
          .map(
            (n) =>
              `<button class="${n === page ? "active" : ""}" data-page="${n}" ${n === page ? 'aria-current="page"' : ""} aria-label="Página ${n}">${n}</button>`,
          )
          .join(
            "",
          )}<button ${page === pages ? "disabled" : ""} data-page="${page + 1}" aria-label="Próxima página">${i("chevron-right", 14)}</button></nav>`;
      container.querySelectorAll("[data-page]").forEach(
        (b) =>
          (b.onclick = () => {
            page = Number(b.dataset.page);
            render();
          }),
      );
    }
    container.querySelector("#patient-search").oninput = (ev) => {
      query = ev.target.value;
      page = 1;
      render();
    };
    container.querySelector("#risk-filter").onchange = (ev) => {
      risk = ev.target.value;
      page = 1;
      render();
    };
    container.querySelectorAll("[data-status]").forEach(
      (b) =>
        (b.onclick = () => {
          status = b.dataset.status;
          page = 1;
          container
            .querySelectorAll("[data-status]")
            .forEach((t) => t.classList.toggle("active", t === b));
          render();
        }),
    );
    container.querySelector("#export-patients").onclick = () => {
      A.download("clara-pacientes.csv", Store.exportCSV(getFiltered()));
      A.toast("Lista filtrada exportada em CSV.");
    };
    render();
  };
  A.pages.fila = function (container) {
    let risk = new URLSearchParams(location.search).get("risk") || "",
      query = "",
      order = "priority";
    if (!Store.risks.some((r) => r.id === risk)) risk = "";
    const waiting = A.queue();
    container.classList.add("queue-page");
    container.innerHTML =
      A.header({
        title: "O próximo cuidado começa aqui.",
        description:
          "Acompanhe a fila, identifique prioridades e conecte cada paciente à equipe.",
        actions: `<button class="btn btn-secondary" id="refresh-queue">${i("refresh-cw", 15)} Atualizar</button><button class="btn btn-primary" id="call-next" ${waiting.length ? "" : "disabled"}>${i("stethoscope", 16)} Chamar próximo</button>`,
      }) +
      `<div class="queue-summary">${Store.risks.map((r) => `<button class="risk-summary-card" data-risk="${r.id}" aria-pressed="${risk === r.id}" style="--risk-color:${r.color}"><strong>${count(waiting.filter((p) => p.risk === r.id).length)}</strong><div><span>${e(r.label)}</span><small>Prioridade ${r.rank}</small></div></button>`).join("")}</div><div class="notice notice-info">${i("shield", 18)}<div><strong>Sobre a ordem de chamada.</strong> A fila considera a classificação registrada pelo profissional. Dentro da mesma prioridade, a chegada organiza a ordem.</div></div><div class="page-toolbar"><div class="toolbar-group"><label class="search-field">${i("search", 16)}<input id="queue-search" placeholder="Encontrar paciente na fila..." aria-label="Buscar paciente na fila"></label><select id="queue-risk" class="filter-select" aria-label="Filtrar prioridade"><option value="">Todas as prioridades</option>${Store.risks.map((r) => `<option value="${r.id}"${risk === r.id ? " selected" : ""}>${e(r.label)}</option>`).join("")}</select><select id="queue-order" class="filter-select" aria-label="Ordenar fila"><option value="priority">Ordenar por prioridade</option><option value="arrival">Ordenar por chegada</option></select></div></div><p class="queue-filter-info" id="queue-info" role="status"></p><section class="card"><div class="table-wrap" id="queue-list"></div><div class="queue-footer">${i("clock", 12)} A espera é contada desde a chegada. A ordem exibida não substitui a reavaliação clínica.</div></section>`;
    function render() {
      let list = A.queue().filter(
        (p) =>
          (!risk || p.risk === risk) &&
          A.normalize(p.name + " " + p.code).includes(A.normalize(query)),
      );
      if (order === "arrival")
        list.sort((a, b) => new Date(a.arrivalAt) - new Date(b.arrivalAt));
      container.querySelector("#queue-info").textContent =
        `${list.length} paciente${list.length === 1 ? "" : "s"} ${risk || query ? "neste filtro" : "aguardando atendimento"} · ${order === "priority" ? "Prioridade clínica, seguida de chegada" : "Ordem de chegada"}${risk ? " · " + Store.risks.find((r) => r.id === risk).label : ""}`;
      container.querySelector("#queue-list").innerHTML = list.length
        ? `<table class="data-table"><caption class="sr-only">Fila de atendimento</caption><thead><tr><th>Ordem</th><th>Paciente</th><th>Classificação</th><th>Motivo da procura</th><th>Espera</th><th>Ação</th></tr></thead><tbody>${list.map((p, n) => `<tr><td><span class="queue-position">${count(n + 1)}</span></td><td>${patientCell(p)}</td><td>${A.riskBadge(p.risk)}</td><td><span class="queue-complaint" title="${e(p.complaint)}">${e(p.complaint.length > 35 ? p.complaint.slice(0, 32) + "…" : p.complaint)}</span></td><td><span class="wait-time">${i("clock", 12)} ${waitLabel(p)}</span><span class="queue-arrival">Chegada às ${A.time(p.arrivalAt)}</span></td><td><button class="btn btn-sm btn-secondary" data-call="${e(p.id)}">Chamar ${i("arrow-right", 13)}</button></td></tr>`).join("")}</tbody></table>`
        : A.empty(
            "Nenhum paciente nesta fila",
            "Ajuste a busca ou conclua uma triagem para incluir pacientes.",
          );
      container.querySelectorAll("[data-risk]").forEach((b) => {
        b.setAttribute("aria-pressed", String(b.dataset.risk === risk));
        b.classList.toggle("selected", b.dataset.risk === risk);
      });
    }
    container.querySelector("#queue-search").oninput = (ev) => {
      query = ev.target.value;
      render();
    };
    container.querySelector("#queue-risk").onchange = (ev) => {
      risk = ev.target.value;
      render();
    };
    container.querySelector("#queue-order").onchange = (ev) => {
      order = ev.target.value;
      render();
    };
    container.querySelectorAll("[data-risk]").forEach(
      (b) =>
        (b.onclick = () => {
          risk = risk === b.dataset.risk ? "" : b.dataset.risk;
          container.querySelector("#queue-risk").value = risk;
          render();
        }),
    );
    container.querySelector("#call-next").onclick = () => {
      const p = A.queue()[0];
      if (p) A.callPatient(p.id);
    };
    container.querySelector("#refresh-queue").onclick = () => {
      A.refresh();
      A.toast("Fila atualizada com os registros do navegador.");
    };
    render();
  };
})();
