(function () {
  "use strict";
  const icons = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    users:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2"/>',
    clipboard:
      '<rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6m-6 4h4"/>',
    queue:
      '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3" cy="6" r=".5"/><circle cx="3" cy="12" r=".5"/><circle cx="3" cy="18" r=".5"/>',
    stethoscope:
      '<path d="M6 3v2H3v5a5 5 0 0 0 10 0V5h-3V3m-2 12v2a4 4 0 0 0 8 0v-3"/><circle cx="17" cy="11" r="3"/>',
    chart: '<path d="M3 3v18h18M7 15l4-5 4 3 6-8"/>',
    search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-12 4h2m3 0h2"/>',
    "arrow-right": '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    "arrow-left": '<path d="M20 12H4m6-6-6 6 6 6"/>',
    "arrow-up-right": '<path d="M6 18 18 6M6 6h12v12"/>',
    "chevron-right": '<path d="m9 5 7 7-7 7"/>',
    "chevron-left": '<path d="m15 5-7 7 7 7"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    "more-horizontal":
      '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    "check-circle": '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    x: '<path d="m6 6 12 12M6 18 18 6"/>',
    activity: '<path d="M2 12h5l3-9 4 18 3-9h5"/>',
    heart:
      '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    shield:
      '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    "file-text":
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M8 13h8m-8 4h6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4m.1 3h.01"/>',
    settings:
      '<path d="m9 3-1 3-3 1v4l-2 1 2 2v4l3 1 1 2h6l1-2 3-1v-4l2-2-2-1V7l-3-1-1-3H9Z"/><circle cx="12" cy="12" r="3"/>',
    hospital:
      '<path d="M4 21V7h16v14M8 7V3h8v4M2 21h20M9 21v-5h6v5m-3-11v4m-2-2h4"/>',
    leaf: '<path d="M20 3C8 2 3 6 4 13c1 7 13 9 16-10ZM3 21 15 9"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    filter: '<path d="M4 6h16M7 12h10m-7 6h4"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    "refresh-cw":
      '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    "alert-triangle": '<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3h.01"/>',
    printer: '<path d="M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6v-7Z"/>',
    edit: '<path d="m16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5"/>',
    logout: '<path d="M9 4H4v16h5m0-8h12m-5-5 5 5-5 5"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  };
  Object.assign(icons, {
    list: icons.queue,
    "layout-grid": icons.grid,
    pencil: icons.edit,
    "rotate-ccw": icons["refresh-cw"],
    play: '<path d="m8 4 12 8-12 8V4Z"/>',
    "map-pin":
      '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    coffee:
      '<path d="M3 8h14v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Zm14 1h2a3 3 0 0 1 0 6h-2M6 3v2m4-2v2m4-2v2"/>',
    "chevron-up": '<path d="m6 15 6-6 6 6"/>',
  });
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (s) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[s],
    );
  const icon = (name, size = 20) =>
    `<svg width="${Number(size) || 20}" height="${Number(size) || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons["activity"]}</svg>`;
  const nav = [
    ["dashboard", "index.html", "Visão geral", "grid"],
    ["pacientes", "pacientes.html", "Pacientes", "users"],
    ["triagem", "triagem.html", "Triagem", "clipboard"],
    ["fila", "fila.html", "Fila de atendimento", "queue"],
    ["atendimentos", "atendimentos.html", "Atendimentos", "stethoscope"],
    ["equipe", "equipe.html", "Equipe", "users"],
    ["relatorios", "relatorios.html", "Relatórios", "chart"],
  ];
  const App = (window.App = {
    pages: {},
    escape,
    icon,
    age(birthDate) {
      if (!birthDate) return "—";
      const d = new Date(birthDate + "T12:00:00"),
        n = new Date();
      let a = n.getFullYear() - d.getFullYear();
      if (
        n.getMonth() < d.getMonth() ||
        (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())
      )
        a--;
      return Number.isFinite(a) ? a : "—";
    },
    time(value) {
      return value
        ? new Date(value).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";
    },
    date(value) {
      return value ? new Date(value).toLocaleDateString("pt-BR") : "—";
    },
    wait(p) {
      return Math.max(
        0,
        Math.floor((Date.now() - new Date(p.arrivalAt)) / 60000),
      );
    },
    initials(name) {
      const n = String(name || "?")
        .trim()
        .split(/\s+/);
      return (n[0][0] + (n.length > 1 ? n[n.length - 1][0] : "")).toUpperCase();
    },
    riskBadge(id) {
      const r = Store.risks.find((r) => r.id === id);
      return r
        ? `<span class="badge risk-${escape(id)}"><span class="badge-dot"></span>${escape(r.label)}</span>`
        : '<span class="badge risk-none">Não classificado</span>';
    },
    statusBadge(status) {
      return `<span class="status-label status-${escape(status)}"><span class="badge-dot"></span>${escape(Store.statuses[status] || status)}</span>`;
    },
    patientAvatar(p) {
      const color = ["sage", "lavender", "sand", "blue"][
        String(p.id)
          .split("")
          .reduce((a, c) => a + c.charCodeAt(0), 0) % 4
      ];
      return `<span class="avatar avatar-${color}">${escape(App.initials(p.name))}</span>`;
    },
    staffAvatar(person, className = "") {
      const photos = {
        staff_01: "camila",
        staff_02: "rafael",
        staff_03: "mariana",
        staff_04: "pedro",
        staff_05: "juliana",
        staff_06: "lucas",
        staff_07: "beatriz",
        staff_08: "andre",
      };
      const photo = photos[person.id];
      const focal =
        { mariana: "40% 25%", juliana: "75% 20%", beatriz: "50% 35%" }[photo] ||
        "50% 25%";
      return `<span class="staff-avatar ${escape(className)}">${photo ? `<img src="assets/images/staff-${photo}.jpg" alt="" loading="lazy" width="300" height="360" style="object-position:${focal}">` : escape(App.initials(person.name))}</span>`;
    },
    header({ eyebrow, title, description, actions = "" }) {
      return `<div class="page-heading"><div>${eyebrow ? `<div class="eyebrow">${escape(eyebrow)}</div>` : ""}<h1>${escape(title)}</h1><p>${escape(description || "")}</p></div><div class="heading-actions">${actions}</div></div>`;
    },
    toast(message, type = "success") {
      const el = document.createElement("div");
      el.className = "toast toast-" + type;
      el.setAttribute("role", type === "error" ? "alert" : "status");
      el.innerHTML = `${icon(type === "error" ? "alert-triangle" : "check-circle")}<span>${escape(message)}</span><button class="icon-btn" aria-label="Fechar aviso">${icon("x", 16)}</button>`;
      document.getElementById("toasts").append(el);
      el.querySelector("button").onclick = () => el.remove();
      setTimeout(() => el.remove(), 6500);
    },
    modal({ title, body, footer = "", onOpen }) {
      App.closeModal();
      const dialog = document.createElement("dialog");
      dialog.className = "modal";
      dialog.setAttribute("aria-labelledby", "modal-title");
      dialog.innerHTML = `<header class="modal-header"><h2 id="modal-title">${escape(title)}</h2><button class="icon-btn" data-close-modal aria-label="Fechar janela">${icon("x")}</button></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ""}`;
      document.body.append(dialog);
      dialog.querySelector("[data-close-modal]").onclick = () => dialog.close();
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) {
          const r = dialog.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            dialog.close();
        }
      });
      dialog.addEventListener("close", () => dialog.remove());
      dialog.showModal();
      if (onOpen) onOpen(dialog);
      return dialog;
    },
    closeModal() {
      document.querySelectorAll("dialog.modal").forEach((d) => {
        d.close();
        d.remove();
      });
    },
    download(name, content, type = "text/csv;charset=utf-8;") {
      const url = URL.createObjectURL(
        new Blob(
          [
            type.includes("csv") && !content.startsWith("\uFEFF")
              ? "\uFEFF"
              : "",
            content,
          ],
          { type },
        ),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    empty(title, description) {
      return `<div class="empty-state">${icon("search", 32)}<h3>${escape(title)}</h3><p>${escape(description)}</p></div>`;
    },
    refresh() {
      const page = document.body.dataset.page;
      if (App.pages[page])
        App.pages[page](document.getElementById("main-content"));
      App.updateCounts();
    },
    updateCounts() {
      const el = document.getElementById("nav-queue-count");
      if (el)
        el.textContent = Store.patients().filter(
          (p) => p.status === "waiting",
        ).length;
    },
    patientDetail(id) {
      const p = Store.patient(id);
      if (!p) return App.toast("Paciente não encontrado.", "error");
      const vitalNames = {
        systolic: "Pressão sistólica · mmHg",
        diastolic: "Pressão diastólica · mmHg",
        heartRate: "Frequência cardíaca · bpm",
        temperature: "Temperatura · °C",
        spo2: "SpO₂ · %",
        respiratoryRate: "Frequência respiratória · irpm",
        pain: "Dor · 0–10",
      };
      App.modal({
        title: "Ficha do paciente",
        body: `<div class="detail-profile">${App.patientAvatar(p)}<div><h3>${escape(p.name)}</h3><p>${escape(p.code)} <span>·</span> ${App.age(p.birthDate)} anos <span>·</span> Nascimento: ${escape(App.date(p.birthDate + "T12:00:00"))}</p></div></div><div class="detail-badges">${App.riskBadge(p.risk)}${App.statusBadge(p.status)}</div><div class="detail-grid"><div><span>Queixa principal</span><p>${escape(p.complaint || "Ainda não registrada")}</p></div><div><span>Alergias informadas</span><p>${escape(p.allergies || "Não informado")}</p></div><div><span>Chegada</span><p>${App.date(p.arrivalAt)} às ${App.time(p.arrivalAt)}</p></div><div><span>Profissional / sala</span><p>${escape(Store.staff().find((s) => s.id === p.professional)?.name || p.professional || "Não atribuído")}${p.room ? " · " + escape(p.room) : ""}</p></div></div>${
          p.vitals && Object.values(p.vitals).some((v) => v !== "" && v != null)
            ? `<h3 class="detail-subtitle">Sinais vitais registrados</h3><div class="vital-grid">${Object.entries(
                p.vitals,
              )
                .filter(([k, v]) => v !== "" && v != null)
                .map(
                  ([k, v]) =>
                    `<div><span>${escape(vitalNames[k] || k)}</span><strong>${escape(v)}</strong></div>`,
                )
                .join("")}</div>`
            : ""
        }${p.notes ? `<h3 class="detail-subtitle">Observações</h3><p class="pre-wrap">${escape(p.notes)}</p>` : ""}<h3 class="detail-subtitle">Histórico do cuidado</h3><ol class="timeline">${
          (p.history || [])
            .slice()
            .reverse()
            .map(
              (h) =>
                `<li><span class="timeline-dot"></span><div><p>${escape(h.text)}</p><time>${App.date(h.at)} · ${App.time(h.at)}</time></div></li>`,
            )
            .join("") || "<li>Sem registros adicionais.</li>"
        }</ol>`,
        footer: `<button class="btn btn-secondary" data-close-detail>Fechar</button>${p.status === "triage" ? `<a class="btn btn-primary" href="triagem.html?patient=${encodeURIComponent(p.id)}">Iniciar triagem ${icon("arrow-right", 16)}</a>` : p.status === "waiting" ? `<button class="btn btn-primary" data-call-detail>Chamar paciente ${icon("arrow-right", 16)}</button>` : p.status === "attending" ? `<a class="btn btn-primary" href="atendimentos.html?patient=${encodeURIComponent(p.id)}">Ver atendimento ${icon("arrow-right", 16)}</a>` : ""}`,
        onOpen(d) {
          d.querySelector("[data-close-detail]").onclick = () => d.close();
          const b = d.querySelector("[data-call-detail]");
          if (b) b.onclick = () => App.callPatient(id);
        },
      });
    },
    callPatient(id) {
      const p = Store.patient(id);
      if (!p || p.status !== "waiting")
        return App.toast(
          "Este paciente já saiu da fila. Atualize a página.",
          "error",
        );
      const staff = Store.staff().filter(
        (s) => s.status !== "break" && /médic|clínic|pediatr/i.test(s.role),
      );
      App.modal({
        title: "Chamar para atendimento",
        body: `<div class="detail-profile">${App.patientAvatar(p)}<div><h3>${escape(p.name)}</h3><p>${escape(p.code)} · ${App.age(p.birthDate)} anos</p></div></div><div class="detail-badges">${App.riskBadge(p.risk)}</div><form id="call-form"><div class="form-grid"><div class="field"><label for="call-professional">Profissional responsável *</label><select id="call-professional" name="professional" required><option value="">Selecione um profissional</option>${staff.map((s) => `<option value="${escape(s.id)}">${escape(s.name)}</option>`).join("")}</select></div><div class="field"><label for="call-room">Local de atendimento *</label><select id="call-room" name="room" required><option value="">Selecione uma sala</option><option>Consultório 01</option><option>Consultório 02</option><option>Consultório 03</option><option>Sala de emergência</option><option>Observação</option></select></div></div><p class="field-hint">A chamada será registrada e o paciente aparecerá em Atendimentos.</p><div class="form-actions"><button type="button" class="btn btn-secondary" data-cancel>Cancelar</button><button type="submit" class="btn btn-primary">Confirmar chamada ${icon("arrow-right", 16)}</button></div></form>`,
        onOpen(d) {
          d.querySelector("[data-cancel]").onclick = () => d.close();
          d.querySelector("form").onsubmit = (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
              Store.updatePatient(id, {
                status: "attending",
                startedAt: new Date().toISOString(),
                professional: fd.get("professional"),
                room: fd.get("room"),
              });
              Store.addEvent(
                id,
                "Paciente chamado para " + fd.get("room") + ".",
              );
              d.close();
              App.toast("Paciente chamado. Atendimento iniciado.");
              App.refresh();
            } catch (err) {
              App.toast(err.message, "error");
            }
          };
        },
      });
    },
    patientForm(id) {
      const p = id ? Store.patient(id) : {};
      if (!p) return;
      const today = new Date().toLocaleDateString("en-CA");
      App.modal({
        title: id ? "Editar cadastro" : "Acolher novo paciente",
        body: `<p class="form-intro">${id ? "Atualize os dados de identificação." : "O cuidado começa com uma boa acolhida. Cadastre um paciente fictício para iniciar o fluxo."}</p><form id="patient-form"><div class="form-grid"><div class="field field-full"><label for="patient-name">Nome completo *</label><input id="patient-name" name="name" required minlength="3" maxlength="100" autocomplete="off" placeholder="Ex.: Mariana Oliveira" value="${escape(p.name)}"></div><div class="field"><label for="patient-birth">Data de nascimento *</label><input id="patient-birth" name="birthDate" type="date" min="1900-01-01" max="${today}" value="${escape(p.birthDate)}" required></div><div class="field"><label for="patient-sex">Sexo cadastrado</label><select name="sex" id="patient-sex"><option value="">Não informado</option>${["Feminino", "Masculino", "Intersexo"].map((x) => `<option${p.sex === x ? " selected" : ""}>${x}</option>`).join("")}</select></div><div class="field"><label for="patient-phone">Telefone de contato</label><input id="patient-phone" name="phone" type="tel" maxlength="20" placeholder="(00) 00000-0000" value="${escape(p.phone)}"></div><div class="field"><label for="patient-allergies">Alergias informadas</label><input id="patient-allergies" name="allergies" maxlength="200" placeholder="Não informado" value="${escape(p.allergies)}"></div><div class="field field-full"><label for="patient-complaint">Motivo da procura *</label><textarea id="patient-complaint" name="complaint" required maxlength="1000" rows="3" placeholder="Descreva o motivo relatado pelo paciente">${escape(p.complaint)}</textarea></div></div><p class="field-hint">* Campos obrigatórios. Utilize apenas dados fictícios nesta demonstração.</p><div class="form-actions"><button type="button" class="btn btn-secondary" data-cancel>Cancelar</button><button class="btn btn-primary" type="submit">${id ? "Salvar alterações" : "Cadastrar paciente"} ${icon("check", 17)}</button></div></form>`,
        onOpen(d) {
          d.querySelector("[data-cancel]").onclick = () => d.close();
          d.querySelector("form").onsubmit = (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            if (data.name.trim().length < 3) {
              App.toast(
                "Informe um nome com pelo menos 3 caracteres.",
                "error",
              );
              return;
            }
            if (data.birthDate > today || data.birthDate < "1900-01-01") {
              App.toast("Verifique a data de nascimento.", "error");
              return;
            }
            try {
              const patient = id
                ? Store.updatePatient(id, data)
                : Store.addPatient(data);
              d.close();
              App.toast(
                id
                  ? "Cadastro atualizado."
                  : "Paciente cadastrado e adicionado à triagem.",
              );
              App.refresh();
              if (!id && document.body.dataset.page === "triagem")
                location.href =
                  "triagem.html?patient=" + encodeURIComponent(patient.id);
            } catch (err) {
              App.toast(err.message, "error");
            }
          };
        },
      });
    },
  });
  function shell() {
    const page = document.body.dataset.page || "dashboard",
      current = nav.find((n) => n[0] === page) || nav[0];
    const localDate = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    document.getElementById("app").innerHTML =
      `<a class="skip-link" href="#main-content">Pular para o conteúdo</a>
      <div class="utility-bar"><div class="site-width utility-inner"><span>HOSPITAL SANTA CLARA <span class="utility-slash">/</span> PORTAL DA EQUIPE</span><span class="utility-demo">Demonstração · dados fictícios</span></div></div>
      <header class="hospital-masthead site-width">
        <a class="brand" href="index.html" aria-label="Clara — página inicial"><span class="brand-mark"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M14 3h12v11h11v12H26v11H14V26H3V14h11z" fill="currentColor"/><path d="M30 3h7v7h-7z" fill="#e3a038"/></svg></span><span class="brand-name">clara<span class="brand-caption">ACOLHIMENTO E ATENDIMENTO</span></span></a>
        <div class="masthead-details"><button class="hospital-button" id="hospital-button"><span class="masthead-icon">${icon("hospital", 24)}</span><span><small>Sua unidade</small><strong>Hospital Santa Clara</strong><span>Pronto atendimento</span></span></button><span class="masthead-divider"></span><button class="profile-button" id="profile-button" aria-label="Perfil de Camila Martins"><span class="profile-symbol">${icon("user", 25)}</span><span><small>Bom trabalho,</small><strong>Camila Martins</strong><span>Enfermeira · Triagem</span></span>${icon("chevron-down", 15)}</button></div>
        <button class="icon-btn mobile-menu" id="mobile-menu" aria-label="Abrir menu" aria-expanded="false" aria-controls="sidebar">${icon("menu", 24)}</button>
      </header>
      <div class="navigation-band"><div class="site-width navigation-inner"><div class="mobile-page-label">${current[2]}</div><nav class="primary-navigation" id="sidebar" aria-label="Navegação principal">${nav.map((n) => `<a class="nav-item ${page === n[0] ? "active" : ""}" href="${n[1]}" ${page === n[0] ? 'aria-current="page"' : ""}><span>${n[2]}</span>${n[0] === "fila" ? '<span class="nav-count" id="nav-queue-count"></span>' : ""}</a>`).join("")}</nav><div class="navigation-tools"><button class="global-search-trigger" id="global-search-trigger" aria-label="Buscar paciente">${icon("search", 19)}<span>Buscar paciente</span><kbd>Ctrl K</kbd></button><button class="icon-btn notification-button" id="notifications-button" aria-label="Ver atividade recente">${icon("bell", 19)}<span class="notification-dot"></span></button></div></div></div>
      <div class="mobile-backdrop" id="mobile-backdrop"></div>
      <div class="workspace"><div class="page-context site-width"><div><a href="index.html">Início</a><span>/</span><strong>${current[2]}</strong></div><time>${localDate}</time></div><main id="main-content" tabindex="-1"></main></div>
      <footer class="hospital-footer"><div class="site-width footer-main"><div class="footer-brand"><span class="footer-cross" aria-hidden="true">+</span><div><strong>clara</strong><span>Hospital Santa Clara</span></div></div><p>Um registro bem feito ajuda<br>quem cuida depois de você.</p><div class="footer-help"><span>Precisa encontrar alguma coisa?</span><button id="help-button">Central de ajuda ${icon("arrow-right", 17)}</button></div></div><div class="site-width footer-bottom"><span>Ambiente de demonstração. Utilize apenas dados fictícios.</span><span>Fotografias ilustrativas · Clara 2.0</span></div></footer><div id="toasts" class="toast-container" aria-live="polite"></div>`;
    const menu = document.getElementById("mobile-menu"),
      sidebar = document.getElementById("sidebar"),
      mobile = matchMedia("(max-width:980px)");
    function syncMenu() {
      sidebar.inert =
        mobile.matches && !document.body.classList.contains("menu-open");
    }
    function closeMenu() {
      const wasOpen = document.body.classList.contains("menu-open");
      document.body.classList.remove("menu-open");
      menu.setAttribute("aria-expanded", "false");
      syncMenu();
      if (wasOpen) menu.focus();
    }
    menu.onclick = () => {
      const open = document.body.classList.toggle("menu-open");
      menu.setAttribute("aria-expanded", String(open));
      syncMenu();
      if (open) sidebar.querySelector("[aria-current=page]").focus();
    };
    mobile.addEventListener("change", () => {
      closeMenu();
      syncMenu();
    });
    syncMenu();
    document.getElementById("mobile-backdrop").onclick = closeMenu;
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
    document.getElementById("help-button").onclick = () =>
      App.modal({
        title: "Como usar o Clara",
        body: `<div class="help-intro"><span class="help-logo">${icon("heart", 30)}</span><p>Bem-vindo à Clara. Explore o caminho do acolhimento até a conclusão do atendimento.</p></div><ol class="help-steps"><li><strong>Cadastre em Pacientes</strong><span>Registre a identificação e o motivo da procura.</span></li><li><strong>Realize a Triagem</strong><span>Selecione o paciente, registre a avaliação e revise a classificação escolhida pelo profissional.</span></li><li><strong>Organize a Fila</strong><span>Visualize a prioridade registrada e chame para uma sala.</span></li><li><strong>Acompanhe o Atendimento</strong><span>Registre a evolução, o responsável e a conclusão.</span></li></ol><div class="notice notice-info">Este é um protótipo funcional com dados fictícios salvos neste navegador. Não é um sistema clínico validado. Não insira dados reais de pacientes.</div><h3 class="detail-subtitle">Pesquisa que orientou a experiência</h3><div class="reference-links"><a href="https://www.cofen.gov.br/resolucao-cofen-no-661-2021/" target="_blank" rel="noopener">Cofen · Classificação por profissional capacitado ${icon("arrow-up-right", 15)}</a><a href="https://sisaps.saude.gov.br/sistemas/esusaps/docs/manual/PEC/PEC_06_atendimentos/" target="_blank" rel="noopener">Ministério da Saúde · Organização do atendimento ${icon("arrow-up-right", 15)}</a><a href="https://www.w3.org/TR/WCAG22/" target="_blank" rel="noopener">W3C · Diretrizes de acessibilidade ${icon("arrow-up-right", 15)}</a></div><p class="field-hint">Atalho: Ctrl + K para buscar um paciente. Esc fecha as janelas.</p>`,
      });
    document.getElementById("hospital-button").onclick = () =>
      App.modal({
        title: "Sobre a unidade",
        body: `<div class="unit-card">${icon("hospital", 38)}<h3>Hospital Santa Clara</h3><p>Pronto atendimento · Unidade demonstrativa</p><span class="badge risk-green">Demonstração local</span></div><div class="detail-grid"><div><span>Ambiente</span><p>Navegador atual</p></div><div><span>Persistência</span><p>Dados salvos neste dispositivo</p></div></div><p class="muted">Pacientes, equipe e registros são fictícios. Alterações são compartilhadas entre as sete páginas.</p>`,
      });
    document.getElementById("profile-button").onclick = () =>
      App.modal({
        title: "Seu espaço",
        body: `<div class="detail-profile"><span class="avatar avatar-sage">CM</span><div><h3>Camila Martins</h3><p>Perfil demonstrativo · Enfermeira de triagem</p></div></div><p class="muted">Explore o sistema com liberdade. Você pode restaurar a demonstração ao estado inicial.</p><button class="btn btn-secondary" id="reset-demo">${icon("refresh-cw", 17)} Restaurar dados de demonstração</button>`,
        onOpen(d) {
          d.querySelector("#reset-demo").onclick = () =>
            App.modal({
              title: "Restaurar demonstração?",
              body: "<p>Os cadastros, triagens e alterações feitos neste navegador serão substituídos pelos exemplos iniciais.</p>",
              footer:
                '<button class="btn btn-secondary" id="cancel-reset">Manter meus dados</button><button class="btn btn-primary" id="confirm-reset">Restaurar exemplos</button>',
              onOpen(confirm) {
                confirm.querySelector("#cancel-reset").onclick = () =>
                  confirm.close();
                confirm.querySelector("#confirm-reset").onclick = () => {
                  Store.reset();
                  try {
                    Object.keys(sessionStorage)
                      .filter((k) => k.startsWith("clara"))
                      .forEach((k) => sessionStorage.removeItem(k));
                  } catch {}
                  confirm.close();
                  App.refresh();
                  App.toast("Demonstração restaurada.");
                };
              },
            });
        },
      });
    document.getElementById("notifications-button").onclick = () => {
      const events = Store.get()
        .events.slice()
        .sort((a, b) => new Date(b.at) - new Date(a.at))
        .slice(0, 12);
      App.modal({
        title: "Atividade recente",
        body: `<p class="form-intro">Últimos registros da sua unidade, neste navegador.</p><ol class="timeline">${
          events
            .map((ev) => {
              const p = Store.patient(ev.patientId);
              return `<li><span class="timeline-dot"></span><div><p>${escape(ev.text)}</p>${p ? `<button class="text-button" data-patient="${escape(p.id)}">${escape(p.name)}</button>` : ""}<time>${App.date(ev.at)} · ${App.time(ev.at)}</time></div></li>`;
            })
            .join("") || "<li>Ainda não há atividades.</li>"
        }</ol>`,
      });
    };
    function search() {
      App.modal({
        title: "Buscar paciente",
        body: `<label class="search-field search-large">${icon("search")}<input id="global-search" aria-label="Nome ou número de prontuário" placeholder="Nome ou número de prontuário" autocomplete="off"></label><div id="global-search-results"></div>`,
        onOpen(d) {
          const input = d.querySelector("input"),
            results = d.querySelector("#global-search-results");
          function update() {
            const q = App.normalize(input.value);
            const list = Store.patients()
              .filter((p) => App.normalize(p.name + " " + p.code).includes(q))
              .slice(0, 7);
            results.innerHTML =
              list
                .map(
                  (p) =>
                    `<button class="search-result" data-patient="${escape(p.id)}">${App.patientAvatar(p)}<span><strong>${escape(p.name)}</strong><small>${escape(p.code)} · ${App.age(p.birthDate)} anos</small></span>${App.riskBadge(p.risk)}${icon("chevron-right", 16)}</button>`,
                )
                .join("") ||
              App.empty(
                "Nenhum paciente encontrado",
                "Tente outro nome ou número de prontuário.",
              );
          }
          input.oninput = update;
          update();
          input.focus();
        },
      });
    }
    document.getElementById("global-search-trigger").onclick = search;
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        search();
      }
    });
    document.addEventListener("click", (e) => {
      const patient = e.target.closest("[data-patient]");
      if (patient) {
        App.patientDetail(patient.dataset.patient);
        return;
      }
      const call = e.target.closest("[data-call]");
      if (call) {
        App.callPatient(call.dataset.call);
        return;
      }
      const add = e.target.closest("[data-add-patient]");
      if (add) {
        App.patientForm();
        return;
      }
      const edit = e.target.closest("[data-edit-patient]");
      if (edit) App.patientForm(edit.dataset.editPatient);
    });
    App.refresh();
    if (!Store.storageAvailable)
      App.toast(
        "O armazenamento está indisponível. Alterações serão perdidas ao fechar esta página.",
        "error",
      );
    window.addEventListener("clara:change", App.updateCounts);
    window.addEventListener("clara:storage-error", () =>
      App.toast(
        "Não foi possível salvar no navegador. Mantenha esta página aberta.",
        "error",
      ),
    );
  }
  App.normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  App.queue = () =>
    Store.patients()
      .filter((p) => p.status === "waiting")
      .sort(
        (a, b) =>
          (Store.risks.find((r) => r.id === a.risk)?.rank ?? 9) -
            (Store.risks.find((r) => r.id === b.risk)?.rank ?? 9) ||
          new Date(a.arrivalAt) - new Date(b.arrivalAt),
      );
  document.addEventListener("DOMContentLoaded", shell);
})();
