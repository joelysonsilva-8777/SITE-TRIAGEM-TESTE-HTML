(function () {
  "use strict";

  const A = window.App;
  const S = window.Store || (typeof Store !== "undefined" ? Store : null);
  A.pages = A.pages || {};
  const esc = (value) => A.escape(String(value == null ? "" : value));
  const icon = (name, size) => A.icon(name, size || 20);
  const availability = {
    available: { label: "Disponível", className: "available" },
    busy: { label: "Em atendimento", className: "busy" },
    break: { label: "Em pausa", className: "break" },
  };
  const defaultRisks = [
    { id: "red", label: "Emergência", short: "Vermelho", color: "#d55353" },
    {
      id: "orange",
      label: "Muito urgente",
      short: "Laranja",
      color: "#e89348",
    },
    { id: "yellow", label: "Urgente", short: "Amarelo", color: "#d3ad49" },
    { id: "green", label: "Pouco urgente", short: "Verde", color: "#4e9670" },
    { id: "blue", label: "Não urgente", short: "Azul", color: "#6399c4" },
  ];
  const getRisks = () =>
    Array.isArray(A.risks)
      ? A.risks
      : Array.isArray(S.risks)
        ? S.risks
        : defaultRisks;
  const fold = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const plural = (count, singular, many) =>
    `${count} ${count === 1 ? singular : many}`;
  const staffList = () => S.staff();
  const patients = () => S.patients();
  const fmtNumber = (value) => Number(value || 0).toLocaleString("pt-BR");
  const initials = (person) =>
    person.initials ||
    String(person.name || "")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("");
  const safeColor = (color) =>
    /^#[\da-f]{3,8}$/i.test(String(color)) ? color : "#43785f";
  const shiftLabel = (person) => {
    if (!person.shift) return "Horário não informado";
    if (typeof person.shift === "string") return person.shift;
    if (person.shift.start || person.shift.end)
      return `${person.shift.start || "—"} às ${person.shift.end || "—"}`;
    return "Horário não informado";
  };
  const assignedTo = (person) =>
    patients().filter(
      (p) =>
        (p.professional === person.id || p.professional === person.name) &&
        p.status !== "finished",
    );
  const statusPill = (status) => {
    const state = availability[status] || availability.available;
    return `<span class="mg-presence mg-presence-${state.className}"><span aria-hidden="true"></span>${state.label}</span>`;
  };
  const avatar = (person) =>
    typeof A.staffAvatar === "function"
      ? A.staffAvatar(person, "mg-staff-avatar")
      : `<div class="mg-staff-avatar mg-staff-initials" aria-hidden="true">${esc(initials(person))}</div>`;
  const notice = (message) => A.toast(message);
  const localDate = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const dateLabel = (value) =>
    new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  const minutesBetween = (first, second) => {
    if (!first || !second) return null;
    const difference = (new Date(second) - new Date(first)) / 60000;
    return Number.isFinite(difference) && difference >= 0 ? difference : null;
  };
  const average = (list) =>
    list.length
      ? Math.round(list.reduce((sum, value) => sum + value, 0) / list.length)
      : null;
  const duration = (value) =>
    value === null
      ? "—"
      : value >= 60
        ? `${Math.floor(value / 60)}h ${value % 60 ? `${value % 60}min` : ""}`.trim()
        : `${value} <small>min</small>`;
  const dateTime = (value) =>
    value
      ? new Date(value).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  function openProfessional(id) {
    const person = staffList().find((item) => item.id === id);
    if (!person) return;
    const assigned = assignedTo(person);
    A.modal({
      title: "Perfil do profissional",
      body: `<div class="mg-profile">${avatar(person)}<div><h3>${esc(person.name)}</h3><p>${esc(person.role)} · ${esc(person.department)}</p>${statusPill(person.status)}</div></div>
        <div class="mg-profile-facts"><div><span>Setor</span><strong>${esc(person.department)}</strong></div><div><span>Plantão</span><strong>${esc(shiftLabel(person))}</strong></div><div><span>Pacientes vinculados</span><strong>${assigned.length}</strong></div></div>
        <div class="mg-modal-section-title">Pacientes em acompanhamento <span>${assigned.length}</span></div>
        ${assigned.length ? `<div class="mg-assignment-list">${assigned.map((p) => `<button class="mg-assignment" data-patient-id="${esc(p.id)}"><span class="mg-assignment-name"><strong>${esc(p.name)}</strong><span>${esc(p.code)} · ${esc(p.room || "Local não definido")}</span></span>${A.riskBadge(p.risk)}${icon("arrow-right", 18)}</button>`).join("")}</div>` : '<div class="mg-soft-empty">Nenhum paciente ativo vinculado a este profissional.</div>'}`,
      footer:
        '<button type="button" class="btn btn-secondary" data-close-profile>Fechar perfil</button>',
      onOpen(dialog) {
        dialog
          .querySelector("[data-close-profile]")
          .addEventListener("click", () => A.closeModal());
        dialog.querySelectorAll("[data-patient-id]").forEach((button) =>
          button.addEventListener("click", () => {
            A.closeModal();
            A.patientDetail(button.dataset.patientId);
          }),
        );
      },
    });
  }

  function openShifts() {
    const all = staffList();
    A.modal({
      title: "Escala da equipe",
      body: `<p class="muted mg-modal-intro">Horários cadastrados e disponibilidade atual dos profissionais da unidade.</p><div class="table-wrap"><table class="data-table mg-shifts-table"><thead><tr><th>Profissional</th><th>Setor</th><th>Plantão</th><th>Disponibilidade</th></tr></thead><tbody>${all.map((person) => `<tr><td><strong>${esc(person.name)}</strong><span class="mg-table-secondary">${esc(person.role)}</span></td><td>${esc(person.department)}</td><td class="mg-nowrap">${esc(shiftLabel(person))}</td><td>${statusPill(person.status)}</td></tr>`).join("")}</tbody></table></div><p class="mg-data-note">A disponibilidade reflete a atualização manual feita nesta demonstração.</p>`,
      footer:
        '<button type="button" class="btn btn-secondary" data-close-shifts>Fechar escala</button>',
      onOpen(dialog) {
        dialog
          .querySelector("[data-close-shifts]")
          .addEventListener("click", () => A.closeModal());
      },
    });
  }

  A.pages.equipe = function (container) {
    const state = {
      query: new URLSearchParams(location.search).get("q") || "",
      department: "all",
      status: "all",
    };
    function render() {
      const all = staffList();
      const departments = [
        ...new Set(all.map((p) => p.department).filter(Boolean)),
      ].sort((a, b) => a.localeCompare(b, "pt-BR"));
      container.innerHTML = `<div class="management-page team-page">
        ${A.header({ eyebrow: "EQUIPE ASSISTENCIAL", title: "Equipe do plantão", description: "Encontre quem está cuidando de cada setor e organize o próximo atendimento.", actions: `<button class="btn btn-secondary" id="mg-view-shifts">${icon("calendar", 18)} Consultar escala</button>` })}
        <div class="mg-team-stats">
          <div class="mg-team-stat"><strong>${all.length}</strong><div><span>Profissionais</span><small>Equipe cadastrada</small></div></div>
          <div class="mg-team-stat"><strong>${all.filter((p) => p.status === "available").length}</strong><div><span>Disponíveis</span><small>Para receber pacientes</small></div></div>
          <div class="mg-team-stat"><strong>${all.filter((p) => p.status === "busy").length}</strong><div><span>Em atendimento</span><small>Cuidando de pacientes</small></div></div>
          <div class="mg-team-stat"><strong>${all.filter((p) => p.status === "break").length}</strong><div><span>Em pausa</span><small>Indisponíveis no momento</small></div></div>
        </div>
        <section class="mg-team-directory" aria-label="Diretório de profissionais">
          <div class="mg-directory-heading"><div><h2>Profissionais da unidade</h2><p>Consulte o perfil para ver os pacientes sob os cuidados de cada profissional.</p></div><span class="mg-directory-count">${plural(all.length, "profissional", "profissionais")}</span></div>
          <div class="mg-team-filters"><label class="mg-search-field">${icon("search", 18)}<input type="search" id="mg-team-search" placeholder="Nome, função ou setor" aria-label="Buscar profissional por nome, função ou setor" value="${esc(state.query)}"></label><label class="mg-select-field"><span class="mg-sr-only">Filtrar por setor</span><select id="mg-department"><option value="all">Todos os setores</option>${departments.map((department) => `<option value="${esc(department)}" ${state.department === department ? "selected" : ""}>${esc(department)}</option>`).join("")}</select></label><label class="mg-select-field"><span class="mg-sr-only">Filtrar por disponibilidade</span><select id="mg-availability"><option value="all">Todas as disponibilidades</option>${Object.entries(
            availability,
          )
            .map(
              ([key, value]) =>
                `<option value="${key}" ${state.status === key ? "selected" : ""}>${value.label}</option>`,
            )
            .join("")}</select></label></div>
          <p class="mg-results-announcement mg-sr-only" id="mg-team-results" aria-live="polite"></p><div class="mg-staff-grid" id="mg-staff-grid"></div>
        </section>
        <div class="mg-team-footnote">${icon("info", 16)}<span>Ao iniciar uma pausa ou retornar ao plantão, atualize a disponibilidade abaixo do seu nome.</span><span class="mg-demo-label">Equipe fictícia · fotografias ilustrativas</span></div>
      </div>`;
      container
        .querySelector("#mg-view-shifts")
        .addEventListener("click", openShifts);
      container
        .querySelector("#mg-team-search")
        .addEventListener("input", (event) => {
          state.query = event.target.value;
          renderCards();
        });
      container
        .querySelector("#mg-department")
        .addEventListener("change", (event) => {
          state.department = event.target.value;
          renderCards();
        });
      container
        .querySelector("#mg-availability")
        .addEventListener("change", (event) => {
          state.status = event.target.value;
          renderCards();
        });
      renderCards();
    }
    function renderCards() {
      const all = staffList();
      const filtered = all.filter(
        (person) =>
          (state.department === "all" ||
            person.department === state.department) &&
          (state.status === "all" || person.status === state.status) &&
          fold(`${person.name} ${person.role} ${person.department}`).includes(
            fold(state.query),
          ),
      );
      container.querySelector("#mg-team-results").textContent =
        `${plural(filtered.length, "profissional encontrado", "profissionais encontrados")}.`;
      const grid = container.querySelector("#mg-staff-grid");
      grid.innerHTML = filtered.length
        ? filtered
            .map((person) => {
              const assigned = assignedTo(person);
              return `<article class="mg-staff-card"><div class="mg-staff-top">${avatar(person)}</div><div class="mg-staff-identity"><span class="mg-department-tag">${esc(person.department)}</span><h3>${esc(person.name)}</h3><p>${esc(person.role)}</p></div><div class="mg-staff-meta"><span>${icon("clock", 16)}<span>Plantão <strong>${esc(shiftLabel(person))}</strong></span></span><span>${icon("users", 16)}${plural(assigned.length, "paciente vinculado", "pacientes vinculados")}</span></div><button class="mg-profile-trigger" data-profile-id="${esc(person.id)}" aria-label="Ver perfil de ${esc(person.name)}">Ver perfil e pacientes ${icon("arrow-right", 17)}</button><div class="mg-staff-bottom"><label for="availability-${esc(person.id)}">Disponibilidade</label><div class="mg-availability-control mg-control-${availability[person.status] ? person.status : "available"}"><span aria-hidden="true"></span><select id="availability-${esc(person.id)}" data-staff-id="${esc(person.id)}" aria-label="Disponibilidade de ${esc(person.name)}">${Object.entries(
                availability,
              )
                .map(
                  ([value, details]) =>
                    `<option value="${value}" ${person.status === value ? "selected" : ""}>${details.label}</option>`,
                )
                .join("")}</select></div></div></article>`;
            })
            .join("")
        : `<div class="mg-directory-empty">${icon("users", 32)}<h3>Nenhum profissional encontrado</h3><p>Tente outro nome ou ajuste os filtros de disponibilidade.</p><button class="btn btn-secondary btn-sm" id="mg-reset-team">Limpar filtros</button></div>`;
      grid
        .querySelectorAll("[data-profile-id]")
        .forEach((button) =>
          button.addEventListener("click", () =>
            openProfessional(button.dataset.profileId),
          ),
        );
      grid.querySelectorAll("[data-staff-id]").forEach((select) =>
        select.addEventListener("change", () => {
          const id = select.dataset.staffId;
          S.updateStaff(id, { status: select.value });
          notice("Disponibilidade atualizada.");
          render();
          const target = Array.from(
            container.querySelectorAll("[data-staff-id]"),
          ).find((item) => item.dataset.staffId === id);
          if (target) target.focus();
        }),
      );
      const reset = grid.querySelector("#mg-reset-team");
      if (reset)
        reset.addEventListener("click", () => {
          state.query = "";
          state.department = "all";
          state.status = "all";
          render();
          container.querySelector("#mg-team-search").focus();
        });
    }
    render();
  };

  function periodDates(preset) {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    start.setDate(
      start.getDate() - (preset === "30" ? 29 : preset === "7" ? 6 : 0),
    );
    return { from: localDate(start), to: localDate(end) };
  }

  function filteredPatients(state) {
    const from = new Date(`${state.from}T00:00:00`).getTime();
    const to = new Date(`${state.to}T23:59:59.999`).getTime();
    return patients().filter((patient) => {
      const timestamp = new Date(patient.arrivalAt).getTime();
      return Number.isFinite(timestamp) && timestamp >= from && timestamp <= to;
    });
  }

  function chartData(list, state) {
    const first = new Date(`${state.from}T00:00:00`);
    const last = new Date(`${state.to}T23:59:59`);
    const dayCount =
      Math.round(
        (new Date(`${state.to}T12:00:00`) -
          new Date(`${state.from}T12:00:00`)) /
          86400000,
      ) + 1;
    const buckets = [];
    if (dayCount === 1) {
      for (let hour = 0; hour < 24; hour += 3)
        buckets.push({
          key: `${hour}`,
          label: `${String(hour).padStart(2, "0")}h`,
          fullLabel: `${String(hour).padStart(2, "0")}h às ${String(hour + 2).padStart(2, "0")}h59`,
          count: 0,
        });
      list.forEach((p) => {
        const bucket =
          buckets[Math.floor(new Date(p.arrivalAt).getHours() / 3)];
        if (bucket) bucket.count += 1;
      });
      return {
        buckets,
        subtitle: "Entradas por faixa de horário",
        unit: "Faixa de horário",
      };
    }
    if (dayCount > 62) {
      const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
      while (cursor <= last) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
        buckets.push({
          key,
          label: cursor
            .toLocaleDateString("pt-BR", { month: "short" })
            .replace(".", ""),
          fullLabel: cursor.toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          }),
          count: 0,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
      list.forEach((p) => {
        const date = new Date(p.arrivalAt);
        const bucket = buckets.find(
          (b) => b.key === `${date.getFullYear()}-${date.getMonth()}`,
        );
        if (bucket) bucket.count += 1;
      });
      return {
        buckets,
        subtitle: "Entradas por mês no período selecionado",
        unit: "Mês",
      };
    }
    const groupDays = dayCount > 31 ? 7 : 1;
    const cursor = new Date(first);
    while (cursor <= last) {
      const begin = localDate(cursor);
      const end = new Date(cursor);
      end.setDate(end.getDate() + groupDays - 1);
      const fullLabel =
        groupDays > 1
          ? `${dateLabel(begin)} a ${dateLabel(localDate(end > last ? last : end))}`
          : cursor.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            });
      buckets.push({
        key: begin,
        label:
          dayCount <= 7
            ? cursor
                .toLocaleDateString("pt-BR", { weekday: "short" })
                .replace(".", "")
            : cursor.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              }),
        fullLabel,
        count: 0,
        start: new Date(cursor).getTime(),
        end: new Date(
          end.getFullYear(),
          end.getMonth(),
          end.getDate(),
          23,
          59,
          59,
          999,
        ).getTime(),
      });
      cursor.setDate(cursor.getDate() + groupDays);
    }
    list.forEach((p) => {
      const timestamp = new Date(p.arrivalAt).getTime();
      const bucket = buckets.find(
        (b) => timestamp >= b.start && timestamp <= b.end,
      );
      if (bucket) bucket.count += 1;
    });
    return {
      buckets,
      subtitle:
        groupDays > 1
          ? "Entradas agrupadas em intervalos de 7 dias"
          : "Entradas por dia no período selecionado",
      unit: groupDays > 1 ? "Intervalo" : "Dia",
    };
  }

  function volumeChart(chart) {
    const max = Math.max(...chart.buckets.map((bucket) => bucket.count), 1);
    const step = Math.max(1, Math.ceil(max / 4));
    const axisMax = step * 4;
    return `<div class="mg-bar-chart" aria-label="Gráfico de volume de entradas. Consulte os valores na tabela abaixo."><div class="mg-chart-axis" aria-hidden="true">${[4, 3, 2, 1, 0].map((fraction) => `<span>${step * fraction}</span>`).join("")}</div><div class="mg-chart-plot"><div class="mg-chart-grid" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div><div class="mg-chart-bars">${chart.buckets.map((bucket, index) => `<div class="mg-bar-column"><div class="mg-bar-track"><div class="mg-bar ${index === chart.buckets.length - 1 ? "mg-bar-latest" : ""}" style="--bar-height:${(bucket.count / axisMax) * 100}%" tabindex="0" role="img" aria-label="${esc(bucket.fullLabel)}: ${plural(bucket.count, "entrada", "entradas")}"><span class="mg-bar-tooltip">${esc(bucket.fullLabel)}<strong>${plural(bucket.count, "entrada", "entradas")}</strong></span>${chart.buckets.length <= 12 ? `<span class="mg-bar-value">${bucket.count}</span>` : ""}</div></div><span class="mg-bar-label" title="${esc(bucket.fullLabel)}">${chart.buckets.length <= 15 || index % Math.ceil(chart.buckets.length / 10) === 0 ? esc(bucket.label) : "·"}</span></div>`).join("")}</div></div></div>`;
  }

  function riskChart(list) {
    const mapped = getRisks().map((risk) => ({
      ...risk,
      count: list.filter((patient) => patient.risk === risk.id).length,
    }));
    const unclassified = list.filter(
      (patient) => !mapped.some((risk) => risk.id === patient.risk),
    ).length;
    if (unclassified)
      mapped.push({
        id: "unclassified",
        short: "Não classificado",
        label: "Não classificado",
        color: "#77848a",
        count: unclassified,
      });
    const total = list.length;
    const radius = 63;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const rings = mapped
      .filter((risk) => risk.count)
      .map((risk) => {
        const length = (risk.count / total) * circumference;
        const ring = `<circle cx="86" cy="86" r="${radius}" fill="none" stroke="${safeColor(risk.color)}" stroke-width="20" stroke-dasharray="${Math.max(0, length - (mapped.filter((r) => r.count).length > 1 ? 3 : 0))} ${circumference}" stroke-dashoffset="${-offset}" />`;
        offset += length;
        return ring;
      })
      .join("");
    return `<div class="mg-risk-content"><div class="mg-donut"><svg viewBox="0 0 172 172" aria-hidden="true"><circle cx="86" cy="86" r="${radius}" fill="none" stroke="#edf1ee" stroke-width="20"/><g transform="rotate(-90 86 86)">${rings}</g></svg><div class="mg-donut-center"><strong>${fmtNumber(total)}</strong><span>${total === 1 ? "entrada" : "entradas"}</span></div></div><div class="mg-risk-legend">${mapped.map((risk) => `<div class="mg-risk-row"><span class="mg-risk-label"><span style="background:${safeColor(risk.color)}"></span>${esc(risk.short || risk.label)}</span><strong>${risk.count}</strong><span class="mg-risk-percent">${total ? Math.round((risk.count / total) * 100) : 0}%</span></div>`).join("")}</div></div>`;
  }

  A.pages.relatorios = function (container) {
    const state = { preset: "7", ...periodDates("7"), showAll: false };
    function render() {
      const list = filteredPatients(state);
      const finished = list.filter((p) => p.status === "finished");
      const waits = list
        .map((p) => minutesBetween(p.triagedAt, p.startedAt))
        .filter((value) => value !== null);
      const careTimes = finished
        .map((p) => minutesBetween(p.startedAt, p.finishedAt))
        .filter((value) => value !== null);
      const chart = chartData(list, state);
      const displayList = [...list].sort(
        (a, b) => new Date(b.arrivalAt) - new Date(a.arrivalAt),
      );
      const shown = state.showAll ? displayList : displayList.slice(0, 6);
      const periodLabel = `${dateLabel(state.from)} ${new Date(`${state.from}T12:00:00`).getFullYear()} — ${dateLabel(state.to)} ${new Date(`${state.to}T12:00:00`).getFullYear()}`;
      container.innerHTML = `<div class="management-page reports-page">
        ${A.header({ eyebrow: "GESTÃO DA UNIDADE", title: "Relatórios de atendimento", description: "Acompanhe as entradas, os tempos de espera e os atendimentos realizados.", actions: `<button class="btn btn-secondary" id="mg-print-report">${icon("printer", 18)}<span>Imprimir</span></button><button class="btn btn-primary" id="mg-export-report">${icon("download", 18)}<span>Exportar CSV</span></button>` })}
        <div class="mg-report-toolbar"><div class="mg-period-tabs" role="group" aria-label="Período do relatório">${[
          { value: "today", label: "Hoje" },
          { value: "7", label: "7 dias" },
          { value: "30", label: "30 dias" },
          { value: "custom", label: "Personalizado" },
        ]
          .map(
            (p) =>
              `<button type="button" class="mg-period-tab ${state.preset === p.value ? "active" : ""}" data-period="${p.value}" aria-pressed="${state.preset === p.value}">${p.label}</button>`,
          )
          .join(
            "",
          )}</div><span class="mg-period-label">${icon("calendar", 17)}${esc(periodLabel)}</span></div>
        ${state.preset === "custom" ? `<form id="mg-custom-dates" class="mg-custom-dates"><label class="field">Data inicial<input id="mg-from" name="from" type="date" value="${state.from}" required max="${localDate(new Date())}"></label><label class="field">Data final<input id="mg-to" name="to" type="date" value="${state.to}" required max="${localDate(new Date())}"></label><button class="btn btn-primary btn-sm" type="submit">Aplicar período</button><p id="mg-date-error" class="mg-form-error" role="alert"></p></form>` : ""}
        <p class="mg-sr-only" aria-live="polite">${plural(list.length, "registro encontrado", "registros encontrados")} no período.</p>
        <div class="mg-report-stats">
          <article class="mg-report-stat"><div class="mg-report-stat-top"><span>Entradas na unidade</span><span class="mg-kpi-icon">${icon("users", 19)}</span></div><strong>${fmtNumber(list.length)}</strong><p>Pacientes recebidos no período</p></article>
          <article class="mg-report-stat"><div class="mg-report-stat-top"><span>Atendimentos concluídos</span><span class="mg-kpi-icon">${icon("check", 19)}</span></div><strong>${fmtNumber(finished.length)}</strong><p>${list.length ? `${Math.round((finished.length / list.length) * 100)}% das entradas selecionadas` : "Sem entradas no período"}</p></article>
          <article class="mg-report-stat"><div class="mg-report-stat-top"><span>Espera média</span><span class="mg-kpi-icon">${icon("clock", 19)}</span></div><strong>${duration(average(waits))}</strong><p>Triagem → atendimento · ${plural(waits.length, "registro", "registros")}</p></article>
          <article class="mg-report-stat"><div class="mg-report-stat-top"><span>Duração média do atendimento</span><span class="mg-kpi-icon">${icon("activity", 19)}</span></div><strong>${duration(average(careTimes))}</strong><p>Início → conclusão · ${plural(careTimes.length, "registro", "registros")}</p></article>
        </div>
        <div class="mg-report-chart-grid"><section class="card mg-volume-card"><div class="mg-card-heading"><div><h2>Entradas na unidade</h2><p>${chart.subtitle}</p></div><span class="mg-chart-key"><span></span>Entradas</span></div>${volumeChart(chart)}<details class="mg-chart-data"><summary>Consultar valores do gráfico ${icon("chevron-down", 15)}</summary><div class="table-wrap"><table class="data-table"><caption class="mg-sr-only">Entradas por intervalo no período selecionado</caption><thead><tr><th scope="col">${chart.unit}</th><th scope="col">Entradas</th></tr></thead><tbody>${chart.buckets.map((bucket) => `<tr><th scope="row">${esc(bucket.fullLabel)}</th><td>${bucket.count}</td></tr>`).join("")}</tbody></table></div></details></section>
        <section class="card mg-risk-card"><div class="mg-card-heading"><div><h2>Perfil de prioridade</h2><p>Distribuição das entradas por classificação</p></div></div>${riskChart(list)}<p class="mg-risk-footnote">Classificações registradas pela equipe na triagem.</p></section></div>
        <section class="card mg-register-card"><div class="mg-card-heading"><div><h2>Registros do período</h2><p>Abra a ficha de um paciente para consultar o histórico completo.</p></div><span class="mg-directory-count">${plural(list.length, "registro", "registros")}</span></div><div class="table-wrap"><table class="data-table mg-report-table"><thead><tr><th>Paciente</th><th>Entrada</th><th>Classificação</th><th>Situação</th><th>Espera</th><th><span class="mg-sr-only">Abrir ficha</span></th></tr></thead><tbody>${shown.length ? shown.map((p) => `<tr><td><button class="mg-patient-link" data-report-patient="${esc(p.id)}">${A.patientAvatar(p)}<span><strong>${esc(p.name)}</strong><span>${esc(p.code)}</span></span></button></td><td class="mg-nowrap">${dateTime(p.arrivalAt)}</td><td>${A.riskBadge(p.risk)}</td><td>${A.statusBadge(p.status)}</td><td class="mg-nowrap">${minutesBetween(p.triagedAt, p.startedAt) === null ? "—" : `${Math.round(minutesBetween(p.triagedAt, p.startedAt))} min`}</td><td><button class="icon-btn" data-report-patient="${esc(p.id)}" aria-label="Abrir ficha de ${esc(p.name)}">${icon("arrow-up-right", 17)}</button></td></tr>`).join("") : '<tr><td colspan="6"><div class="mg-report-empty"><strong>Sem registros neste período</strong><p>Selecione outra data para consultar os atendimentos.</p></div></td></tr>'}</tbody></table></div><div class="mg-table-footer"><span>Mostrando ${shown.length} de ${list.length} registros</span>${list.length > 6 ? `<button class="btn btn-ghost btn-sm" id="mg-toggle-records">${state.showAll ? "Mostrar menos" : "Ver todos os registros"} ${icon(state.showAll ? "chevron-up" : "arrow-right", 16)}</button>` : ""}</div></section>
        <div class="mg-report-note">${icon("info", 17)}<p><strong>Sobre estes indicadores</strong><span>O período considera a data de entrada. As médias incluem apenas registros com os dois horários preenchidos. Dados fictícios para demonstração; os indicadores não representam metas clínicas.</span></p></div>
        <div class="mg-print-footer">Clara · Relatório demonstrativo · ${esc(periodLabel)} · Gerado em ${new Date().toLocaleString("pt-BR")}</div>
      </div>`;
      bind(list);
    }
    function bind(list) {
      container.querySelectorAll("[data-period]").forEach((button) =>
        button.addEventListener("click", () => {
          state.preset = button.dataset.period;
          if (state.preset !== "custom")
            Object.assign(state, periodDates(state.preset));
          state.showAll = false;
          render();
          if (state.preset === "custom")
            container.querySelector("#mg-from").focus();
          else
            container.querySelector(`[data-period="${state.preset}"]`).focus();
        }),
      );
      const form = container.querySelector("#mg-custom-dates");
      if (form)
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          const from = form.elements.from.value;
          const to = form.elements.to.value;
          const error = container.querySelector("#mg-date-error");
          if (!from || !to) {
            error.textContent = "Preencha as duas datas.";
            return;
          }
          if (from > to) {
            error.textContent =
              "A data final deve ser igual ou posterior à inicial.";
            return;
          }
          if (
            new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`) >
            3650 * 86400000
          ) {
            error.textContent = "Selecione um período de até 10 anos.";
            return;
          }
          state.from = from;
          state.to = to;
          state.showAll = false;
          render();
          notice("Período do relatório atualizado.");
        });
      container
        .querySelector("#mg-export-report")
        .addEventListener("click", () => {
          const csv = S.exportCSV(list);
          const blob = new Blob(
            [csv.startsWith("\uFEFF") ? csv : "\uFEFF" + csv],
            { type: "text/csv;charset=utf-8;" },
          );
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `clara-atendimentos-${state.from}-a-${state.to}.csv`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          notice(
            `${plural(list.length, "registro exportado", "registros exportados")} em CSV.`,
          );
        });
      container
        .querySelector("#mg-print-report")
        .addEventListener("click", () => {
          const wasExpanded = state.showAll;
          state.showAll = true;
          render();
          document.body.classList.add("mg-printing-report");
          let cleaned = false;
          const afterPrint = () => {
            if (cleaned) return;
            cleaned = true;
            document.body.classList.remove("mg-printing-report");
            window.removeEventListener("afterprint", afterPrint);
            if (container.querySelector(".reports-page")) {
              state.showAll = wasExpanded;
              render();
            }
          };
          window.addEventListener("afterprint", afterPrint);
          window.print();
          afterPrint();
        });
      container
        .querySelectorAll("[data-report-patient]")
        .forEach((button) =>
          button.addEventListener("click", () =>
            A.patientDetail(button.dataset.reportPatient),
          ),
        );
      const toggle = container.querySelector("#mg-toggle-records");
      if (toggle)
        toggle.addEventListener("click", () => {
          state.showAll = !state.showAll;
          render();
          container.querySelector("#mg-toggle-records").focus();
        });
    }
    render();
  };
})();
