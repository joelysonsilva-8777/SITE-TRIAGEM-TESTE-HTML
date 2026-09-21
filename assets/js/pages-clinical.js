(function () {
  "use strict";

  const esc = (value) => App.escape(value == null ? "" : String(value));
  const icon = (name, size = 18) => App.icon(name, size);
  const allRisks = () =>
    Store.risks || [
      { id: "red", label: "Emergência", rank: 1 },
      { id: "orange", label: "Muito urgente", rank: 2 },
      { id: "yellow", label: "Urgente", rank: 3 },
      { id: "green", label: "Pouco urgente", rank: 4 },
      { id: "blue", label: "Não urgente", rank: 5 },
    ];
  const people = () => Store.staff();
  const triagePeople = () =>
    people().filter((person) => /enfermeir[oa]/i.test(person.role));
  const staffName = (value) => {
    const found = people().find(
      (person) => person.id === value || person.name === value,
    );
    return found ? found.name : value || "Não atribuído";
  };
  const staffOptions = (value, options = people()) =>
    '<option value="">Selecione um profissional</option>' +
    options
      .map(
        (person) =>
          `<option value="${esc(person.id)}" ${value === person.id || value === person.name ? "selected" : ""}>${esc(person.name)} · ${esc(person.role)}</option>`,
      )
      .join("");
  const waitText = (value) => {
    const minutes = Math.max(0, Math.floor(value || 0));
    return minutes >= 60
      ? `${Math.floor(minutes / 60)}h ${minutes % 60}min`
      : `${minutes} min`;
  };
  const ageText = (patient) =>
    patient.birthDate
      ? `${App.age(patient.birthDate)} anos`
      : "Idade não informada";
  const sameDay = (value) =>
    value && new Date(value).toDateString() === new Date().toDateString();
  const field = (name, label, value, options = {}) =>
    `<div class="field ${options.wide ? "clinical-field-wide" : ""}"><label for="clinical-${name}">${label}${options.required ? ' <span class="required-mark">*</span>' : ""}</label><input id="clinical-${name}" name="${name}" type="${options.type || "text"}" value="${esc(value)}" ${options.min != null ? `min="${options.min}"` : ""} ${options.max != null ? `max="${options.max}"` : ""} ${options.step ? `step="${options.step}"` : ""} ${options.placeholder ? `placeholder="${esc(options.placeholder)}"` : ""} ${options.autocomplete ? `autocomplete="${options.autocomplete}"` : ""} ${options.required ? 'aria-required="true"' : ""}>${options.help ? `<small class="clinical-field-help">${options.help}</small>` : ""}</div>`;
  const vitalsConfig = [
    {
      key: "systolic",
      label: "Pressão sistólica",
      unit: "mmHg",
      min: 0,
      max: 350,
      placeholder: "120",
    },
    {
      key: "diastolic",
      label: "Pressão diastólica",
      unit: "mmHg",
      min: 0,
      max: 250,
      placeholder: "80",
    },
    {
      key: "heartRate",
      label: "Frequência cardíaca",
      unit: "bpm",
      min: 0,
      max: 300,
      placeholder: "72",
    },
    {
      key: "temperature",
      label: "Temperatura",
      unit: "°C",
      min: 20,
      max: 50,
      step: "0.1",
      placeholder: "36,5",
    },
    {
      key: "spo2",
      label: "Saturação de O₂",
      unit: "%",
      min: 0,
      max: 100,
      placeholder: "98",
    },
    {
      key: "respiratoryRate",
      label: "Frequência respiratória",
      unit: "irpm",
      min: 0,
      max: 120,
      placeholder: "16",
    },
    {
      key: "pain",
      label: "Dor informada",
      unit: "de 0 a 10",
      min: 0,
      max: 10,
      placeholder: "0",
    },
  ];

  App.pages.triagem = function (container) {
    const requested = new URLSearchParams(location.search).get("patient");
    let selectedId = requested || null;
    let draft = null;
    let step = 0;
    let saving = false;
    let savedPatient = null;
    let draftNotice = "";
    const queue = () =>
      Store.patients()
        .filter((patient) => patient.status === "triage")
        .sort((a, b) => new Date(a.arrivalAt) - new Date(b.arrivalAt));
    const storageKey = (id) => `clara-triage-draft-${id}`;

    function persist() {
      if (!selectedId || !draft) return;
      try {
        sessionStorage.setItem(
          storageKey(selectedId),
          JSON.stringify({ draft, step, updatedAt: new Date().toISOString() }),
        );
      } catch (_) {
        draftNotice =
          "O navegador não permitiu salvar o rascunho desta sessão.";
      }
      const status = container.querySelector("[data-draft-status]");
      if (status)
        status.textContent = draftNotice || "Rascunho salvo nesta sessão";
    }

    function selectPatient(id) {
      const patient = Store.patient(id);
      if (!patient || patient.status !== "triage") {
        selectedId = null;
        draft = null;
        App.toast("Este paciente já saiu da fila de triagem.", "info");
        render();
        return;
      }
      selectedId = id;
      step = 0;
      draftNotice = "";
      draft = {
        name: patient.name || "",
        birthDate: patient.birthDate || "",
        sex: patient.sex || "",
        phone: patient.phone || "",
        complaint: patient.complaint || "",
        allergies: patient.allergies || "",
        professional: "",
        risk: "",
        rationale: "",
        destination: "waiting",
        confirmed: false,
        vitals: { ...(patient.vitals || {}) },
      };
      try {
        const stored = JSON.parse(
          sessionStorage.getItem(storageKey(id)) || "null",
        );
        if (stored && stored.draft) {
          draft = {
            ...draft,
            ...stored.draft,
            vitals: { ...draft.vitals, ...(stored.draft.vitals || {}) },
            confirmed: false,
          };
          step = Math.max(0, Math.min(2, Number(stored.step) || 0));
          draftNotice = "Rascunho recuperado desta sessão";
        }
      } catch (_) {
        /* A damaged or unavailable draft never prevents a new assessment. */
      }
      render();
    }

    function collect() {
      if (!draft) return;
      container
        .querySelectorAll("[data-triage-form] [name]")
        .forEach((input) => {
          if (input.type === "radio" && !input.checked) return;
          if (input.name.startsWith("vital."))
            draft.vitals[input.name.slice(6)] = input.value;
          else
            draft[input.name] =
              input.type === "checkbox" ? input.checked : input.value;
        });
      if (draft.risk !== "red") draft.destination = "waiting";
      persist();
    }

    function validate(which) {
      collect();
      const errors = [];
      if (which === 0 || which === "all") {
        if (!draft.name.trim() || draft.name.trim().length < 3)
          errors.push(["name", "Informe o nome completo do paciente."]);
        if (
          draft.birthDate &&
          (draft.birthDate < "1850-01-01" ||
            draft.birthDate > new Date().toLocaleDateString("en-CA") ||
            !Number.isFinite(new Date(draft.birthDate).getTime()))
        )
          errors.push([
            "birthDate",
            "Confira a data de nascimento. Informe uma data válida, a partir de 1850 e até hoje.",
          ]);
        if (!draft.complaint.trim())
          errors.push([
            "complaint",
            "Descreva a queixa principal para continuar.",
          ]);
      }
      if (which === 1 || which === "all") {
        vitalsConfig.forEach((vital) => {
          const value = draft.vitals[vital.key];
          if (
            value !== "" &&
            value != null &&
            (!Number.isFinite(Number(value)) ||
              Number(value) < vital.min ||
              Number(value) > vital.max)
          )
            errors.push([
              `vital.${vital.key}`,
              `${vital.label}: informe um valor entre ${vital.min} e ${vital.max} ${vital.unit}.`,
            ]);
        });
        if (!allRisks().some((risk) => risk.id === draft.risk))
          errors.push([
            "risk",
            "Selecione a classificação definida pelo profissional.",
          ]);
        if (
          !draft.professional ||
          !triagePeople().some(
            (person) =>
              person.id === draft.professional ||
              person.name === draft.professional,
          )
        )
          errors.push([
            "professional",
            "Selecione o enfermeiro ou a enfermeira responsável pela triagem.",
          ]);
        if (draft.rationale.trim().length < 10)
          errors.push([
            "rationale",
            "Descreva os achados e a justificativa da classificação (ao menos 10 caracteres).",
          ]);
      }
      if ((which === 2 || which === "all") && !draft.confirmed)
        errors.push([
          "confirmed",
          "Confirme a revisão dos dados antes de registrar a triagem.",
        ]);
      showErrors(errors);
      return errors.length === 0;
    }

    function showErrors(errors) {
      container
        .querySelectorAll("[aria-invalid]")
        .forEach((el) => el.removeAttribute("aria-invalid"));
      const box = container.querySelector("[data-triage-errors]");
      if (!box) return;
      box.hidden = !errors.length;
      box.innerHTML = errors.length
        ? `<strong>Confira antes de continuar</strong><ul>${errors.map(([, text]) => `<li>${esc(text)}</li>`).join("")}</ul>`
        : "";
      errors.forEach(([name]) =>
        container
          .querySelectorAll(`[name="${name}"]`)
          .forEach((el) => el.setAttribute("aria-invalid", "true")),
      );
      if (errors.length) {
        box.focus();
        box.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }

    function identityForm(patient) {
      return `<div class="clinical-section-heading"><span class="clinical-step-number">01</span><div><h2>Vamos conhecer o paciente</h2><p>Confirme a identificação e registre o motivo da chegada.</p></div></div>
        <div class="form-grid clinical-form-grid">
          ${field("name", "Nome completo", draft.name, { required: true, wide: true, autocomplete: "name" })}
          ${field("birthDate", "Data de nascimento", draft.birthDate, { type: "date", min: "1850-01-01", max: new Date().toLocaleDateString("en-CA") })}
          <div class="field"><label for="clinical-sex">Sexo registrado</label><select id="clinical-sex" name="sex"><option value="">Não informado</option>${["Feminino", "Masculino", "Intersexo", "Outro"].map((value) => `<option ${String(draft.sex).toLowerCase() === value.toLowerCase() ? "selected" : ""}>${value}</option>`).join("")}${draft.sex && !["feminino", "masculino", "intersexo", "outro"].includes(draft.sex.toLowerCase()) ? `<option selected>${esc(draft.sex)}</option>` : ""}</select></div>
          ${field("phone", "Telefone de contato", draft.phone, { type: "tel", placeholder: "(00) 00000-0000", autocomplete: "tel" })}
          <div class="field"><label>Identificador do atendimento</label><div class="clinical-readonly">${esc(patient.code)}<span>Gerado na recepção</span></div></div>
          <div class="field clinical-field-wide"><label for="clinical-complaint">Queixa principal <span class="required-mark">*</span></label><textarea id="clinical-complaint" name="complaint" rows="3" aria-required="true" placeholder="Motivo da procura, início e evolução dos sintomas…">${esc(draft.complaint)}</textarea><small class="clinical-field-help">Use as palavras do paciente quando possível. Inclua quando os sintomas começaram.</small></div>
          <div class="field clinical-field-wide"><label for="clinical-allergies">Alergias relatadas</label><textarea id="clinical-allergies" name="allergies" rows="2" placeholder="Registre as alergias informadas ou indique se a informação é desconhecida.">${esc(draft.allergies)}</textarea></div>
        </div>`;
    }

    function assessmentForm() {
      return `<div class="clinical-section-heading"><span class="clinical-step-number">02</span><div><h2>Avaliação e classificação</h2><p>Registre as medidas coletadas e a decisão do profissional.</p></div></div>
        <div class="clinical-form-section"><div class="clinical-subheading"><h3>${icon("activity")} Sinais vitais</h3><span>Preenchimento conforme avaliação</span></div><div class="clinical-vitals-grid">${vitalsConfig.map((vital) => `<div class="field clinical-vital-field"><label for="clinical-vital-${vital.key}">${vital.label}</label><div class="clinical-input-unit"><input id="clinical-vital-${vital.key}" name="vital.${vital.key}" type="number" inputmode="decimal" min="${vital.min}" max="${vital.max}" step="${vital.step || "1"}" value="${esc(draft.vitals[vital.key])}" placeholder="${vital.placeholder}"><span>${vital.unit}</span></div></div>`).join("")}</div><p class="clinical-field-help">Deixe em branco o que não foi aferido. Os valores não geram uma classificação automática.</p></div>
        <div class="clinical-form-section"><div class="clinical-subheading"><h3>Classificação de risco <span class="required-mark">*</span></h3><span>Seleção manual</span></div><fieldset class="clinical-risk-options"><legend class="clinical-sr-only">Classificação de risco definida pelo profissional</legend>${allRisks()
          .map(
            (risk, index) =>
              `<label class="clinical-risk-option clinical-risk-${esc(risk.id)}"><input type="radio" name="risk" value="${esc(risk.id)}" ${draft.risk === risk.id ? "checked" : ""}><span class="clinical-risk-dot"></span><span class="clinical-risk-option-text"><strong>${esc(risk.label)}</strong><small>Prioridade ${index + 1}</small></span><span class="clinical-risk-check">${icon("check", 14)}</span></label>`,
          )
          .join(
            "",
          )}</fieldset><p class="clinical-field-help">A classificação deve seguir a avaliação e o protocolo institucional vigente.</p></div>
        <div class="form-grid clinical-form-grid"><div class="field clinical-field-wide"><label for="clinical-professional">Enfermeiro(a) responsável <span class="required-mark">*</span></label><select id="clinical-professional" name="professional" aria-required="true">${staffOptions(draft.professional, triagePeople())}</select></div><div class="field clinical-field-wide"><label for="clinical-rationale">Achados e justificativa <span class="required-mark">*</span></label><textarea id="clinical-rationale" name="rationale" rows="4" maxlength="4000" aria-required="true" placeholder="Registre a avaliação que fundamenta a classificação, incluindo observações relevantes…">${esc(draft.rationale)}</textarea></div></div>`;
    }

    function reviewForm(patient) {
      const vitals = vitalsConfig.filter(
        (vital) =>
          draft.vitals[vital.key] !== "" && draft.vitals[vital.key] != null,
      );
      return `<div class="clinical-section-heading"><span class="clinical-step-number">03</span><div><h2>Revise antes de registrar</h2><p>Confira o relato, as medidas e a classificação antes de salvar.</p></div></div>
        <div class="clinical-review-person">${App.patientAvatar({ ...patient, name: draft.name })}<div><strong>${esc(draft.name)}</strong><span>${esc(patient.code)} · ${ageText({ birthDate: draft.birthDate })}</span></div>${App.riskBadge(draft.risk)}</div>
        <dl class="clinical-review-grid"><div><dt>Queixa principal</dt><dd>${esc(draft.complaint)}</dd></div><div><dt>Alergias relatadas</dt><dd>${esc(draft.allergies || "Não informado")}</dd></div><div><dt>Profissional responsável</dt><dd>${esc(staffName(draft.professional))}</dd></div><div><dt>Achados e justificativa</dt><dd>${esc(draft.rationale)}</dd></div></dl>
        <div class="clinical-review-vitals"><h3>Sinais vitais registrados</h3>${vitals.length ? `<div class="clinical-review-vitals-grid">${vitals.map((vital) => `<div><span>${vital.label}</span><strong>${esc(draft.vitals[vital.key])}<small> ${vital.unit}</small></strong></div>`).join("")}</div>` : '<p class="muted">Nenhuma medida registrada nesta triagem.</p>'}</div>
        ${draft.risk === "red" ? `<fieldset class="clinical-destination"><legend>Destino após o registro</legend><label><input type="radio" name="destination" value="waiting" ${draft.destination === "waiting" ? "checked" : ""}><span><strong>Fila de atendimento</strong><small>Manter a classificação registrada na fila.</small></span></label><label><input type="radio" name="destination" value="attending" ${draft.destination === "attending" ? "checked" : ""}><span><strong>Atendimento imediato iniciado</strong><small>Registrar o início somente se o paciente já está sob atendimento da equipe.</small></span></label></fieldset>` : `<div class="clinical-destination-summary">${icon("arrow-right")} Após o registro, o paciente entrará na fila de atendimento.</div>`}
        <label class="clinical-confirm"><input type="checkbox" name="confirmed" ${draft.confirmed ? "checked" : ""}><span>Revisei os dados e confirmo a classificação registrada pelo profissional responsável.</span></label>`;
    }

    function render() {
      const pending = queue();
      const patient = selectedId ? Store.patient(selectedId) : null;
      const steps = ["Identificação", "Avaliação", "Revisão"];
      container.innerHTML =
        App.header({
          eyebrow: "ACOLHIMENTO · ENFERMAGEM",
          title: "Triagem",
          description:
            "Confira a identificação, escute o relato e registre a avaliação do paciente.",
          actions: `<a class="btn btn-secondary" href="fila.html">${icon("list")} Ver fila</a>`,
        }) +
        `<div class="clinical-demo-note">${icon("shield", 15)}<span>Demonstração · Classificação registrada pelo profissional, conforme protocolo institucional.</span></div>` +
        (savedPatient
          ? `<div class="card clinical-success"><span class="clinical-success-icon">${icon("check", 30)}</span><span class="section-label">TRIAGEM REGISTRADA</span><h2>Triagem concluída e registrada.</h2><p>A classificação de <strong>${esc(savedPatient.name)}</strong> foi salva e o atendimento foi atualizado.</p><div class="clinical-success-badge">${App.riskBadge(savedPatient.risk)}${App.statusBadge(savedPatient.status)}</div><div class="clinical-success-actions"><button class="btn btn-primary" data-action="next-patient">${icon("plus")} Próxima triagem</button><a class="btn btn-secondary" href="${savedPatient.status === "attending" ? "atendimentos.html" : "fila.html"}">Acompanhar atendimento ${icon("arrow-right")}</a></div><button class="btn btn-ghost" data-action="patient-detail" data-id="${esc(savedPatient.id)}">Ver registro do paciente</button></div>`
          : `<div class="clinical-triage-layout"><aside class="card clinical-queue"><div class="clinical-queue-heading"><div><span class="section-label">ACOLHIMENTO</span><h2>Aguardando triagem <span>${pending.length}</span></h2></div><span class="clinical-live-dot" title="Dados desta sessão"></span></div><div class="clinical-queue-search">${icon("search", 17)}<input type="search" placeholder="Buscar paciente…" aria-label="Buscar na fila de triagem" data-queue-search></div><div class="clinical-queue-list">${pending.length ? pending.map((item) => `<button class="clinical-queue-person ${item.id === selectedId ? "is-selected" : ""}" data-action="select-patient" data-id="${esc(item.id)}" data-search="${esc(`${item.name} ${item.code}`.toLowerCase())}" aria-pressed="${item.id === selectedId}">${App.patientAvatar(item)}<span class="clinical-queue-person-info"><strong>${esc(item.name)}</strong><small>${esc(item.code)} · ${ageText(item)}</small><span>${icon("clock", 12)} ${waitText(App.wait(item))} de espera</span></span>${icon("chevron-right", 15)}</button>`).join("") : `<div class="clinical-queue-empty">${icon("check", 24)}<strong>Nenhum paciente aguardando</strong><p>Nenhum paciente aguarda triagem.</p></div>`}<p class="clinical-search-empty" hidden>Nenhum paciente encontrado.</p></div><div class="clinical-queue-footer">${icon("clock", 14)} Ordem de chegada à unidade</div></aside>
        <section class="card clinical-wizard">${patient && draft ? `<div class="clinical-wizard-top"><div class="clinical-wizard-patient"><span class="section-label">ATENDIMENTO ${esc(patient.code)}</span><strong>${esc(patient.name)}</strong></div><span class="clinical-draft-state">${icon("check", 13)}<span data-draft-status>${draftNotice || "Rascunho nesta sessão"}</span></span></div><nav class="clinical-steps" aria-label="Etapas da triagem">${steps.map((label, index) => `<button type="button" data-action="step" data-step="${index}" class="clinical-step ${index === step ? "is-current" : ""} ${index < step ? "is-complete" : ""}" ${index === step ? 'aria-current="step"' : ""}><span>${index < step ? icon("check", 15) : index + 1}</span><strong>${label}</strong></button>`).join("")}</nav><form data-triage-form novalidate><div class="clinical-wizard-body"><div class="clinical-form-errors" role="alert" tabindex="-1" data-triage-errors hidden></div>${step === 0 ? identityForm(patient) : step === 1 ? assessmentForm() : reviewForm(patient)}</div><div class="clinical-wizard-footer"><button class="btn btn-ghost" type="button" data-action="${step ? "back" : "reset"}">${icon(step ? "arrow-left" : "rotate-ccw", 17)} ${step ? "Voltar" : "Descartar rascunho"}</button><span class="clinical-step-progress">Etapa ${step + 1} de 3</span><button class="btn btn-primary" type="submit">${step === 2 ? "Registrar triagem" : "Continuar"} ${icon(step === 2 ? "check" : "arrow-right", 17)}</button></div></form>` : `<div class="clinical-pick-patient"><div class="clinical-pick-heading"><span class="section-label">SALA DE TRIAGEM</span><h2>${pending.length ? "O atendimento começa pela escuta." : "Nenhum paciente aguardando."}</h2><p>${pending.length ? "Selecione uma pessoa na lista de espera para abrir seu registro. As informações do acolhimento já estarão disponíveis." : "Os pacientes cadastrados na recepção aparecerão nesta lista. Você pode consultar os registros enquanto aguarda."}</p></div><div class="clinical-pick-body"><ol class="clinical-pick-steps" aria-label="Como registrar a triagem"><li><span aria-hidden="true">01</span><div><strong>Confirme com o paciente</strong><p>Confira os dados de identificação e registre o motivo da procura.</p></div></li><li><span aria-hidden="true">02</span><div><strong>Registre a avaliação</strong><p>Anote as medidas coletadas, as alergias relatadas e a classificação definida.</p></div></li><li><span aria-hidden="true">03</span><div><strong>Revise e encaminhe</strong><p>Confira o registro e informe o próximo passo do atendimento.</p></div></li></ol><div class="clinical-pick-action">${pending.length ? `<button class="btn btn-primary" data-action="select-patient" data-id="${esc(pending[0].id)}">Iniciar próxima triagem ${icon("arrow-right")}</button><span>Próximo registro: <strong>${esc(pending[0].name)}</strong><br>Ordem de chegada à unidade</span>` : '<a class="btn btn-primary" href="pacientes.html">Consultar pacientes</a>'}</div></div></div>`}</section></div>`);
    }

    function commit() {
      if (saving || !validate("all")) return;
      const patient = Store.patient(selectedId);
      if (!patient || patient.status !== "triage") {
        App.toast(
          "O status deste paciente mudou. Atualize a seleção.",
          "error",
        );
        savedPatient = null;
        draft = null;
        selectedId = null;
        render();
        return;
      }
      saving = true;
      const button = container.querySelector('[type="submit"]');
      if (button) {
        button.disabled = true;
        button.textContent = "Registrando…";
      }
      try {
        const now = new Date().toISOString();
        const status =
          draft.risk === "red" && draft.destination === "attending"
            ? "attending"
            : "waiting";
        const vitals = {};
        vitalsConfig.forEach((vital) => {
          const value = draft.vitals[vital.key];
          vitals[vital.key] =
            value === "" || value == null ? null : Number(value);
        });
        const patch = {
          name: draft.name.trim(),
          birthDate: draft.birthDate,
          sex: draft.sex,
          phone: draft.phone.trim(),
          complaint: draft.complaint.trim(),
          allergies: draft.allergies.trim(),
          risk: draft.risk,
          professional: draft.professional,
          vitals,
          triagedAt: now,
          status,
          notes: [patient.notes, `Triagem: ${draft.rationale.trim()}`]
            .filter(Boolean)
            .join("\n\n"),
        };
        if (status === "attending") patch.startedAt = now;
        Store.updatePatient(selectedId, patch);
        Store.addEvent(
          selectedId,
          `Triagem registrada por ${staffName(draft.professional)}. ${draft.rationale.trim()}${status === "attending" ? " Atendimento imediato confirmado pela equipe." : ""}`,
        );
        savedPatient = Store.patient(selectedId);
        try {
          sessionStorage.removeItem(storageKey(selectedId));
        } catch (_) {
          /* The saved record is already persisted in the application store. */
        }
        App.toast("Triagem registrada com sucesso.");
        render();
      } catch (_) {
        App.toast(
          "Não foi possível registrar. Seu rascunho foi preservado; tente novamente.",
          "error",
        );
        if (button) {
          button.disabled = false;
          button.innerHTML = `Registrar triagem ${icon("check", 17)}`;
        }
      } finally {
        saving = false;
      }
    }

    container.onclick = (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const action = button.dataset.action;
      if (action === "select-patient") {
        collect();
        selectPatient(button.dataset.id);
      }
      if (action === "patient-detail") App.patientDetail(button.dataset.id);
      if (action === "next-patient") {
        savedPatient = null;
        selectedId = null;
        draft = null;
        const next = queue()[0];
        next ? selectPatient(next.id) : render();
      }
      if (action === "back") {
        collect();
        step = Math.max(0, step - 1);
        persist();
        render();
      }
      if (action === "step") {
        const target = Number(button.dataset.step);
        if (target <= step || validate(step)) {
          collect();
          step = target > step ? step + 1 : target;
          persist();
          render();
        }
      }
      if (action === "reset")
        App.modal({
          title: "Descartar este rascunho?",
          body: "<p>As alterações não registradas desta triagem serão removidas. O cadastro do paciente será preservado.</p>",
          footer:
            '<button class="btn btn-secondary" data-cancel-reset>Continuar editando</button><button class="btn btn-primary" data-confirm-reset>Descartar rascunho</button>',
          onOpen(dialog) {
            dialog.querySelector("[data-confirm-reset]").onclick = () => {
              try {
                sessionStorage.removeItem(storageKey(selectedId));
              } catch (_) {}
              App.closeModal();
              selectPatient(selectedId);
              App.toast("Rascunho descartado.", "info");
            };
            dialog.querySelector("[data-cancel-reset]").onclick = () =>
              App.closeModal();
          },
        });
    };
    container.oninput = (event) => {
      if (event.target.matches("[data-queue-search]")) {
        const search = event.target.value.trim().toLocaleLowerCase("pt-BR");
        let visible = 0;
        container.querySelectorAll("[data-search]").forEach((row) => {
          row.hidden = !row.dataset.search.includes(search);
          if (!row.hidden) visible++;
        });
        const empty = container.querySelector(".clinical-search-empty");
        if (empty) empty.hidden = visible > 0 || !search;
      } else if (event.target.closest("[data-triage-form]")) collect();
    };
    container.onchange = (event) => {
      if (event.target.closest("[data-triage-form]")) collect();
    };
    container.onsubmit = (event) => {
      if (!event.target.matches("[data-triage-form]")) return;
      event.preventDefault();
      if (step === 2) commit();
      else if (validate(step)) {
        step++;
        persist();
        render();
        container
          .querySelector(".clinical-section-heading")
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    };
    if (selectedId) selectPatient(selectedId);
    else render();
  };

  App.pages.atendimentos = function (container) {
    const state = {
      search: "",
      status: "attending",
      risk: "",
      professional: "",
      view: "cards",
    };
    const requested = Store.patient(
      new URLSearchParams(location.search).get("patient"),
    );
    if (
      requested &&
      ["attending", "waiting", "finished"].includes(requested.status)
    ) {
      state.search = requested.code;
      state.status = requested.status;
    }
    const active = () =>
      Store.patients().filter(
        (patient) =>
          ["waiting", "attending"].includes(patient.status) ||
          (patient.status === "finished" && sameDay(patient.finishedAt)),
      );

    function filtered() {
      const search = state.search.trim().toLocaleLowerCase("pt-BR");
      return active()
        .filter(
          (patient) =>
            (!state.status || patient.status === state.status) &&
            (!state.risk || patient.risk === state.risk) &&
            (!state.professional ||
              patient.professional === state.professional ||
              staffName(patient.professional) ===
                staffName(state.professional)) &&
            (!search ||
              `${patient.name} ${patient.code} ${patient.complaint} ${patient.room || ""}`
                .toLocaleLowerCase("pt-BR")
                .includes(search)),
        )
        .sort((a, b) => {
          if (state.status === "finished")
            return new Date(b.finishedAt) - new Date(a.finishedAt);
          const rank = (id) =>
            allRisks().find((risk) => risk.id === id)?.rank || 9;
          return (
            rank(a.risk) - rank(b.risk) ||
            new Date(a.arrivalAt) - new Date(b.arrivalAt)
          );
        });
    }

    function actions(patient, compact = false) {
      return (
        `<button class="btn ${compact ? "btn-ghost" : "btn-secondary"} btn-sm" data-action="detail" data-id="${esc(patient.id)}" aria-label="Ver registro de ${esc(patient.name)}">${icon("file-text", 15)} ${compact ? "Registro" : "Ver registro"}</button>` +
        (patient.status === "waiting"
          ? `<button class="btn btn-primary btn-sm" data-action="start" data-id="${esc(patient.id)}" aria-label="Iniciar atendimento de ${esc(patient.name)}">${icon("play", 14)} Iniciar</button>`
          : patient.status === "attending"
            ? `<button class="btn btn-secondary btn-sm" data-action="evolution" data-id="${esc(patient.id)}" aria-label="Registrar evolução de ${esc(patient.name)}">${icon("plus", 15)} Evolução</button><button class="${compact ? "icon-btn" : "btn btn-ghost btn-sm"} clinical-finish-btn" data-action="finish" data-id="${esc(patient.id)}" aria-label="Concluir atendimento de ${esc(patient.name)}">${icon("check", 16)}${compact ? "" : " Concluir"}</button>`
            : "")
      );
    }

    function patientCard(patient) {
      const duration = patient.startedAt
        ? Math.round(
            (Date.now() - new Date(patient.startedAt).getTime()) / 60000,
          )
        : App.wait(patient);
      return `<article class="card clinical-care-card clinical-card-risk-${esc(patient.risk || "none")}"><div class="clinical-care-card-top">${App.riskBadge(patient.risk)}<span class="clinical-care-code">${esc(patient.code)}</span></div><div class="clinical-care-person">${App.patientAvatar(patient)}<div><button class="clinical-person-name" data-action="detail" data-id="${esc(patient.id)}">${esc(patient.name)}</button><span>${ageText(patient)} · ${esc(patient.sex || "Sexo não informado")}</span></div></div><p class="clinical-care-complaint"><span class="clinical-complaint-label">Motivo da procura</span>${esc(patient.complaint || "Queixa não informada")}</p><div class="clinical-care-meta"><div>${icon("user", 15)}<span>${esc(staffName(patient.professional))}</span>${patient.status !== "finished" ? `<button class="icon-btn clinical-small-edit" data-action="assignment" data-id="${esc(patient.id)}" aria-label="Alterar profissional e local de ${esc(patient.name)}">${icon("pencil", 13)}</button>` : ""}</div><div>${icon("map-pin", 15)}<span>${esc(patient.room || "Local ainda não definido")}</span></div><div>${icon("clock", 15)}<span>${patient.status === "finished" ? `Concluído às ${App.time(patient.finishedAt)}` : `${waitText(duration)} ${patient.status === "attending" ? "em atendimento" : "desde a chegada"}`}</span></div></div>${patient.status === "finished" ? `<div class="clinical-care-outcome">${icon("check", 14)} ${esc(patient.outcome || "Atendimento concluído")}</div>` : ""}<div class="clinical-care-actions">${actions(patient)}</div></article>`;
    }

    function renderResults() {
      const patients = filtered();
      const target = container.querySelector("[data-care-results]");
      if (!target) return;
      const count = container.querySelector("[data-care-count]");
      count.textContent = `${patients.length} ${patients.length === 1 ? "atendimento" : "atendimentos"}`;
      if (!patients.length) {
        target.innerHTML = `<div class="card clinical-care-empty">${icon("clipboard", 32)}<h3>Nenhum atendimento nesta seleção.</h3><p>${state.search || state.risk || state.professional ? "Tente outro nome ou ajuste os filtros para encontrar o paciente." : state.status === "attending" ? "Pacientes aparecerão aqui quando um atendimento for iniciado." : state.status === "finished" ? "Os atendimentos concluídos hoje aparecerão nesta área." : "Não há pacientes nesta etapa no momento."}</p>${state.search || state.risk || state.professional ? '<button class="btn btn-secondary" data-action="clear-filters">Limpar filtros</button>' : state.status === "attending" ? '<button class="btn btn-secondary" data-action="status" data-status="waiting">Ver pacientes aguardando</button>' : '<a class="btn btn-secondary" href="triagem.html">Ir para triagem</a>'}</div>`;
      } else if (state.view === "cards")
        target.innerHTML = `<div class="clinical-care-grid">${patients.map(patientCard).join("")}</div>`;
      else
        target.innerHTML = `<div class="card table-wrap"><table class="data-table clinical-care-table"><thead><tr><th>Paciente</th><th>Classificação</th><th>Responsável / local</th><th>Status</th><th>Atendimento</th></tr></thead><tbody>${patients.map((patient) => `<tr><td><div class="patient-cell">${App.patientAvatar(patient)}<div><button class="clinical-person-name" data-action="detail" data-id="${esc(patient.id)}">${esc(patient.name)}</button><small>${esc(patient.code)} · ${ageText(patient)}</small></div></div></td><td>${App.riskBadge(patient.risk)}</td><td><div class="clinical-table-assignment"><span>${esc(staffName(patient.professional))}</span><small>${esc(patient.room || "Local não definido")}</small>${patient.status !== "finished" ? `<button class="btn btn-ghost btn-sm" data-action="assignment" data-id="${esc(patient.id)}">Alterar</button>` : ""}</div></td><td>${App.statusBadge(patient.status)}</td><td><div class="clinical-table-actions">${actions(patient, true)}</div></td></tr>`).join("")}</tbody></table></div>`;
    }

    function render() {
      const patients = Store.patients();
      const attending = patients.filter(
        (patient) => patient.status === "attending",
      );
      const waiting = patients.filter(
        (patient) => patient.status === "waiting",
      );
      const finished = patients.filter(
        (patient) =>
          patient.status === "finished" && sameDay(patient.finishedAt),
      );
      const occupied = new Set(
        attending.map((patient) => patient.room).filter(Boolean),
      ).size;
      container.innerHTML =
        App.header({
          eyebrow: "ASSISTÊNCIA · UNIDADE DE ATENDIMENTO",
          title: "Atendimentos",
          description:
            "Acompanhe os pacientes, registre a evolução e organize os próximos atendimentos.",
          actions: `<a class="btn btn-secondary" href="fila.html">${icon("list")} Ver fila de espera</a>`,
        }) +
        `<div class="stat-grid clinical-care-stats"><div class="stat-card"><div class="stat-label">Em atendimento <span class="clinical-stat-icon">${icon("activity", 18)}</span></div><div class="stat-value">${attending.length.toString().padStart(2, "0")}</div><div class="stat-foot"><span class="clinical-mini-dot"></span> Com a equipe neste momento</div></div><div class="stat-card"><div class="stat-label">Aguardando início <span class="clinical-stat-icon">${icon("clock", 18)}</span></div><div class="stat-value">${waiting.length.toString().padStart(2, "0")}</div><div class="stat-foot">Classificação de risco registrada</div></div><div class="stat-card"><div class="stat-label">Concluídos hoje <span class="clinical-stat-icon">${icon("check", 18)}</span></div><div class="stat-value">${finished.length.toString().padStart(2, "0")}</div><div class="stat-foot">Registros encerrados pela equipe</div></div><div class="stat-card"><div class="stat-label">Locais em uso <span class="clinical-stat-icon">${icon("map-pin", 18)}</span></div><div class="stat-value">${occupied.toString().padStart(2, "0")}</div><div class="stat-foot">Com atendimento em andamento</div></div></div>
        <div class="clinical-care-workspace"><div class="clinical-care-tabs-row"><div class="tabs clinical-care-tabs" role="group" aria-label="Etapa do atendimento">${[
          ["attending", "Em atendimento", attending.length],
          ["waiting", "Aguardando", waiting.length],
          ["finished", "Concluídos hoje", finished.length],
        ]
          .map(
            ([key, label, count]) =>
              `<button class="tab ${state.status === key ? "active" : ""}" data-action="status" data-status="${key}" aria-pressed="${state.status === key}">${label}<span>${count}</span></button>`,
          )
          .join(
            "",
          )}</div><div class="clinical-view-toggle" role="group" aria-label="Formato de visualização"><button class="icon-btn ${state.view === "cards" ? "is-active" : ""}" data-action="view" data-view="cards" aria-label="Visualizar cartões" aria-pressed="${state.view === "cards"}">${icon("layout-grid", 18)}</button><button class="icon-btn ${state.view === "table" ? "is-active" : ""}" data-action="view" data-view="table" aria-label="Visualizar tabela" aria-pressed="${state.view === "table"}">${icon("list", 19)}</button></div></div>
        <div class="clinical-care-toolbar"><div class="clinical-care-search">${icon("search", 18)}<input type="search" data-care-filter="search" value="${esc(state.search)}" placeholder="Buscar por nome, registro ou queixa…" aria-label="Buscar atendimentos"></div><select data-care-filter="risk" aria-label="Filtrar classificação"><option value="">Todas as classificações</option>${allRisks()
          .map(
            (risk) =>
              `<option value="${esc(risk.id)}" ${risk.id === state.risk ? "selected" : ""}>${esc(risk.label)}</option>`,
          )
          .join(
            "",
          )}</select><select data-care-filter="professional" aria-label="Filtrar profissional"><option value="">Todos os profissionais</option>${people()
          .map(
            (person) =>
              `<option value="${esc(person.id)}" ${state.professional === person.id ? "selected" : ""}>${esc(person.name)}</option>`,
          )
          .join(
            "",
          )}</select></div><div class="clinical-care-results-caption"><span data-care-count></span><span>${icon(state.status === "finished" ? "check" : "arrow-up-right", 13)} ${state.status === "finished" ? "Mais recentes primeiro" : "Organizados por prioridade registrada"}</span></div><div data-care-results aria-live="polite"></div></div><p class="clinical-care-footnote">${icon("shield", 14)} Ambiente demonstrativo. Os registros permanecem neste navegador.</p>`;
      renderResults();
    }

    function modalForm({ title, patient, body, submitLabel, onSubmit }) {
      App.modal({
        title,
        body: `<div class="clinical-modal-patient">${App.patientAvatar(patient)}<div><strong>${esc(patient.name)}</strong><span>${esc(patient.code)} · ${ageText(patient)}</span></div>${App.riskBadge(patient.risk)}</div><form id="clinical-care-form" novalidate><div class="clinical-form-errors" role="alert" data-modal-error hidden></div>${body}</form>`,
        footer: `<button type="button" class="btn btn-secondary" data-modal-cancel>Cancelar</button><button type="submit" form="clinical-care-form" class="btn btn-primary">${submitLabel}</button>`,
        onOpen(dialog) {
          dialog.querySelector("[data-modal-cancel]").onclick = () =>
            App.closeModal();
          const form = dialog.querySelector("form");
          const error = dialog.querySelector("[data-modal-error]");
          form.onsubmit = (event) => {
            event.preventDefault();
            const values = Object.fromEntries(new FormData(form).entries());
            const fail = (message) => {
              error.textContent = message;
              error.hidden = false;
            };
            const current = Store.patient(patient.id);
            if (!current) {
              fail("Este paciente não está mais disponível.");
              return;
            }
            try {
              onSubmit(values, current, fail);
            } catch (_) {
              fail("Não foi possível salvar o registro. Tente novamente.");
            }
          };
          setTimeout(
            () => form.querySelector("select, textarea, input")?.focus(),
            80,
          );
        },
      });
    }

    function assignment(patient, start) {
      modalForm({
        title: start ? "Iniciar atendimento" : "Profissional e local",
        patient,
        submitLabel: start ? "Confirmar início" : "Salvar alterações",
        body: `<p class="clinical-modal-intro">${start ? "Confirme o profissional e o local em que o paciente está sendo atendido." : "Selecione o profissional e o local deste atendimento."}</p><div class="field"><label for="care-professional">Profissional responsável <span class="required-mark">*</span></label><select id="care-professional" name="professional" aria-required="true">${staffOptions(patient.professional)}</select></div><div class="field"><label for="care-room">Local de atendimento <span class="required-mark">*</span></label><input id="care-room" name="room" value="${esc(patient.room || "")}" placeholder="Ex.: Consultório 03" maxlength="60" aria-required="true"></div>`,
        onSubmit(values, current, fail) {
          if (
            (start && current.status !== "waiting") ||
            (!start && current.status === "finished")
          )
            return fail(
              "O status deste atendimento mudou. Feche esta janela e confira o registro.",
            );
          if (
            !values.professional ||
            !people().some((person) => person.id === values.professional)
          )
            return fail("Selecione o profissional responsável.");
          if (!values.room.trim())
            return fail("Informe o local do atendimento.");
          const patch = {
            professional: values.professional,
            room: values.room.trim(),
          };
          if (start) {
            patch.status = "attending";
            patch.startedAt = new Date().toISOString();
          }
          Store.updatePatient(patient.id, patch);
          Store.addEvent(
            patient.id,
            `${start ? "Atendimento iniciado" : "Responsável e local atualizados"}: ${staffName(values.professional)} · ${values.room.trim()}.`,
          );
          App.closeModal();
          App.toast(
            start
              ? "Atendimento iniciado."
              : "Responsável e local atualizados.",
          );
          if (start) state.status = "attending";
          render();
        },
      });
    }

    function evolution(patient) {
      modalForm({
        title: "Registrar evolução",
        patient,
        submitLabel: "Salvar evolução",
        body: `<p class="clinical-modal-intro">Acrescente uma observação ao histórico deste atendimento.</p><div class="field"><label for="care-author">Profissional do registro <span class="required-mark">*</span></label><select id="care-author" name="professional" aria-required="true">${staffOptions(patient.professional)}</select></div><div class="field"><label for="care-note">Evolução do atendimento <span class="required-mark">*</span></label><textarea id="care-note" name="note" rows="6" placeholder="Registre a avaliação, a evolução e as condutas realizadas…" maxlength="5000" aria-required="true"></textarea><small class="clinical-field-help">O registro será adicionado ao histórico com data e horário.</small></div>`,
        onSubmit(values, current, fail) {
          if (current.status !== "attending")
            return fail("Este atendimento não está mais em andamento.");
          if (
            !values.professional ||
            !people().some((person) => person.id === values.professional)
          )
            return fail("Selecione o profissional responsável pelo registro.");
          if (values.note.trim().length < 10)
            return fail("Descreva a evolução com pelo menos 10 caracteres.");
          const note = `Evolução · ${staffName(values.professional)}: ${values.note.trim()}`;
          Store.updatePatient(patient.id, {
            notes: [current.notes, note].filter(Boolean).join("\n\n"),
          });
          Store.addEvent(patient.id, note);
          App.closeModal();
          App.toast("Evolução adicionada ao histórico.");
          render();
        },
      });
    }

    function finish(patient) {
      modalForm({
        title: "Concluir atendimento",
        patient,
        submitLabel: "Concluir e salvar registro",
        body: `<p class="clinical-modal-intro">Registre o desfecho definido pela equipe. O atendimento será movido para os concluídos de hoje.</p><div class="field"><label for="care-outcome">Desfecho registrado <span class="required-mark">*</span></label><select id="care-outcome" name="outcome" aria-required="true"><option value="">Selecione o desfecho</option><option>Alta registrada</option><option>Internação</option><option>Transferência</option><option>Encaminhamento</option><option>Saída antes da conclusão</option><option>Outro desfecho</option></select></div><div class="field"><label for="care-finish-author">Profissional responsável <span class="required-mark">*</span></label><select id="care-finish-author" name="professional" aria-required="true">${staffOptions(patient.professional)}</select></div><div class="field"><label for="care-finish-note">Observações de encerramento <span class="required-mark">*</span></label><textarea id="care-finish-note" name="note" rows="4" placeholder="Descreva o desfecho e as orientações ou encaminhamentos já realizados…" maxlength="5000" aria-required="true"></textarea></div><label class="clinical-confirm"><input type="checkbox" name="confirmed" value="yes"><span>Confirmo que o desfecho foi definido pelo profissional responsável.</span></label>`,
        onSubmit(values, current, fail) {
          if (current.status !== "attending")
            return fail("Este atendimento não está mais em andamento.");
          if (!values.outcome) return fail("Selecione o desfecho registrado.");
          if (
            !values.professional ||
            !people().some((person) => person.id === values.professional)
          )
            return fail("Selecione o profissional responsável.");
          if (values.note.trim().length < 10)
            return fail(
              "Registre as observações de encerramento com pelo menos 10 caracteres.",
            );
          if (values.confirmed !== "yes")
            return fail(
              "Confirme o desfecho definido pelo profissional responsável.",
            );
          const note = `Conclusão · ${values.outcome} · ${staffName(values.professional)}: ${values.note.trim()}`;
          Store.updatePatient(patient.id, {
            status: "finished",
            finishedAt: new Date().toISOString(),
            outcome: values.outcome,
            notes: [current.notes, note].filter(Boolean).join("\n\n"),
          });
          Store.addEvent(patient.id, note);
          App.closeModal();
          App.toast("Atendimento concluído. O registro está no histórico.");
          render();
        },
      });
    }

    container.onclick = (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const action = button.dataset.action;
      if (action === "view") {
        state.view = button.dataset.view;
        render();
      }
      if (action === "status") {
        state.status = button.dataset.status;
        render();
      }
      if (action === "clear-filters") {
        state.search = "";
        state.risk = "";
        state.professional = "";
        render();
      }
      if (button.dataset.id) {
        const patient = Store.patient(button.dataset.id);
        if (!patient) return App.toast("Paciente não encontrado.", "error");
        if (action === "detail") App.patientDetail(patient.id);
        if (action === "assignment") assignment(patient, false);
        if (action === "start") assignment(patient, true);
        if (action === "evolution") evolution(patient);
        if (action === "finish") finish(patient);
      }
    };
    container.oninput = (event) => {
      if (event.target.dataset.careFilter === "search") {
        state.search = event.target.value;
        renderResults();
      }
    };
    container.onchange = (event) => {
      const key = event.target.dataset.careFilter;
      if (key && key !== "search") {
        state[key] = event.target.value;
        renderResults();
      }
    };
    container.onsubmit = null;
    render();
  };
})();
