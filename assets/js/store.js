(function (global) {
  "use strict";

  const VERSION = 1;
  const KEY = "clara:store:v1";
  const statuses = Object.freeze({
    triage: "Aguardando triagem",
    waiting: "Aguardando atendimento",
    attending: "Em atendimento",
    finished: "Finalizado",
  });
  const risks = Object.freeze(
    [
      {
        id: "red",
        label: "Emergência",
        short: "Emergência",
        rank: 1,
        color: "#df4b55",
      },
      {
        id: "orange",
        label: "Muito urgente",
        short: "Muito urgente",
        rank: 2,
        color: "#ef8b39",
      },
      {
        id: "yellow",
        label: "Urgente",
        short: "Urgente",
        rank: 3,
        color: "#cda125",
      },
      {
        id: "green",
        label: "Pouco urgente",
        short: "Pouco urgente",
        rank: 4,
        color: "#329d78",
      },
      {
        id: "blue",
        label: "Não urgente",
        short: "Não urgente",
        rank: 5,
        color: "#528bd7",
      },
    ].map(Object.freeze),
  );
  const editable = [
    "name",
    "birthDate",
    "sex",
    "phone",
    "complaint",
    "allergies",
    "risk",
    "status",
    "professional",
    "room",
    "notes",
    "vitals",
    "outcome",
  ];
  const vitalKeys = [
    "systolic",
    "diastolic",
    "heartRate",
    "temperature",
    "spo2",
    "respiratoryRate",
    "pain",
  ];
  const limits = {
    name: 150,
    phone: 40,
    complaint: 2000,
    allergies: 1000,
    professional: 150,
    room: 100,
    notes: 6000,
  };
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const iso = (value) => new Date(value).toISOString();
  const now = () => new Date().toISOString();
  const clean = (value, max) =>
    String(value == null ? "" : value)
      .trim()
      .slice(0, max || 1000);
  const isObject = (value) =>
    value && typeof value === "object" && !Array.isArray(value);
  let storageAvailable = true;
  let storageError = "";
  let counter = 0;

  function uid(prefix) {
    counter += 1;
    const random =
      global.crypto && typeof global.crypto.randomUUID === "function"
        ? global.crypto.randomUUID().replace(/-/g, "")
        : Math.random().toString(36).slice(2) + counter.toString(36);
    return prefix + "_" + Date.now().toString(36) + "_" + random;
  }

  function signal(name, detail) {
    if (
      typeof global.dispatchEvent === "function" &&
      typeof global.CustomEvent === "function"
    ) {
      global.dispatchEvent(new global.CustomEvent(name, { detail: detail }));
    }
  }

  function storageFailure() {
    storageAvailable = false;
    storageError =
      "Não foi possível salvar neste navegador. As alterações desta sessão continuam disponíveis enquanto a página estiver aberta.";
    signal("clara:storage-error", { message: storageError });
  }

  function persist() {
    try {
      global.localStorage.setItem(
        KEY,
        JSON.stringify({ version: VERSION, savedAt: now(), data: state }),
      );
      storageAvailable = true;
      storageError = "";
    } catch (_) {
      storageFailure();
    }
    signal("clara:change", { saved: storageAvailable });
  }

  function validDate(value) {
    return typeof value === "string" && !Number.isNaN(Date.parse(value));
  }

  function normalizeVitals(input, prior) {
    const result = Object.assign({}, prior || {});
    vitalKeys.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(result, key))
        result[key] = null;
      if (!input || !Object.prototype.hasOwnProperty.call(input, key)) return;
      const value = input[key];
      if (value === "" || value == null) {
        result[key] = null;
        return;
      }
      const number = Number(String(value).replace(",", "."));
      if (!Number.isFinite(number) || number < 0)
        throw new Error(
          "Informe valores numéricos válidos para os sinais vitais.",
        );
      if ((key === "spo2" && number > 100) || (key === "pain" && number > 10)) {
        throw new Error(
          key === "pain"
            ? "A escala de dor deve estar entre 0 e 10."
            : "A saturação deve estar entre 0 e 100%.",
        );
      }
      result[key] = number;
    });
    return result;
  }

  function validatePatient(patient) {
    if (!patient.name || !patient.name.trim())
      throw new Error("Informe o nome do paciente.");
    if (!Object.prototype.hasOwnProperty.call(statuses, patient.status))
      throw new Error("Situação do atendimento inválida.");
    if (
      patient.risk !== null &&
      !risks.some((risk) => risk.id === patient.risk)
    )
      throw new Error("Selecione uma classificação válida.");
    if (patient.status !== "triage" && !patient.risk)
      throw new Error(
        "Defina a classificação de risco antes de encaminhar o paciente.",
      );
    if (patient.birthDate) {
      const value = patient.birthDate;
      const birth = new Date(value + "T12:00:00");
      const today = new Date();
      const localDay = [
        birth.getFullYear(),
        String(birth.getMonth() + 1).padStart(2, "0"),
        String(birth.getDate()).padStart(2, "0"),
      ].join("-");
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(birth.getTime()) ||
        localDay !== value ||
        birth.getFullYear() < 1850 ||
        birth >
          new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            23,
            59,
            59,
          )
      ) {
        throw new Error(
          "Informe uma data de nascimento válida, até a data de hoje.",
        );
      }
    }
    if (
      patient.sex &&
      ![
        "Feminino",
        "Masculino",
        "Intersexo",
        "Outro",
        "Não informado",
        "F",
        "M",
        "O",
        "N",
        "female",
        "male",
        "other",
        "not-informed",
      ].includes(patient.sex)
    ) {
      throw new Error("Selecione uma opção válida para sexo.");
    }
    return patient;
  }

  function applyFields(patient, fields) {
    if (!isObject(fields))
      throw new Error("Os dados do paciente são inválidos.");
    editable.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(fields, key)) return;
      if (key === "vitals")
        patient.vitals = normalizeVitals(fields.vitals, patient.vitals);
      else if (key === "risk")
        patient.risk = fields.risk ? clean(fields.risk, 20) : null;
      else patient[key] = clean(fields[key], limits[key] || 100);
    });
    return validatePatient(patient);
  }

  function patientTemplate(id, code, arrivalAt) {
    return {
      id: id,
      code: code,
      name: "",
      birthDate: "",
      sex: "Não informado",
      phone: "",
      complaint: "",
      allergies: "",
      risk: null,
      status: "triage",
      arrivalAt: arrivalAt,
      triagedAt: null,
      startedAt: null,
      finishedAt: null,
      professional: "",
      room: "",
      notes: "",
      vitals: normalizeVitals(null),
      history: [],
    };
  }

  function seed() {
    const instant = Date.now();
    const minutesAgo = (minutes) => iso(instant - minutes * 60000);
    const staff = [
      {
        id: "staff_01",
        name: "Camila Martins",
        role: "Enfermeira",
        department: "Triagem",
        status: "available",
        initials: "CM",
        color: "#dcebea",
        shift: "07h – 19h",
      },
      {
        id: "staff_02",
        name: "Rafael Costa",
        role: "Médico",
        department: "Clínica médica",
        status: "busy",
        initials: "RC",
        color: "#e5dff3",
        shift: "07h – 19h",
      },
      {
        id: "staff_03",
        name: "Mariana Lopes",
        role: "Médica",
        department: "Clínica médica",
        status: "busy",
        initials: "ML",
        color: "#f4e4d8",
        shift: "07h – 19h",
      },
      {
        id: "staff_04",
        name: "Pedro Almeida",
        role: "Enfermeiro",
        department: "Observação",
        status: "available",
        initials: "PA",
        color: "#dce9f1",
        shift: "07h – 19h",
      },
      {
        id: "staff_05",
        name: "Juliana Ribeiro",
        role: "Médica",
        department: "Emergência",
        status: "busy",
        initials: "JR",
        color: "#e8eacb",
        shift: "07h – 19h",
      },
      {
        id: "staff_06",
        name: "Lucas Ferreira",
        role: "Técnico de enfermagem",
        department: "Medicação",
        status: "available",
        initials: "LF",
        color: "#e0e4f4",
        shift: "07h – 19h",
      },
      {
        id: "staff_07",
        name: "Beatriz Santos",
        role: "Enfermeira",
        department: "Triagem",
        status: "break",
        initials: "BS",
        color: "#f1dde3",
        shift: "07h – 19h",
      },
      {
        id: "staff_08",
        name: "André Nascimento",
        role: "Médico",
        department: "Ortopedia",
        status: "available",
        initials: "AN",
        color: "#d8e9de",
        shift: "07h – 19h",
      },
    ];
    const firstNames = [
      "Helena",
      "Antônio",
      "Ana",
      "João",
      "Lúcia",
      "Carlos",
      "Sofia",
      "José",
      "Isabela",
      "Paulo",
      "Valentina",
      "Miguel",
      "Teresa",
      "Gabriel",
      "Clara",
      "Francisco",
      "Laura",
      "Eduardo",
      "Alice",
      "Roberto",
      "Cecília",
      "Daniel",
      "Manuela",
      "Fernando",
      "Rosa",
      "Henrique",
      "Luiza",
      "Ricardo",
    ];
    const surnames = ["Oliveira", "Silva", "Pereira"];
    const complaints = [
      "Dor abdominal desde a manhã",
      "Dor de cabeça e mal-estar",
      "Dor no tornozelo após queda",
      "Náusea e desconforto abdominal",
      "Tosse e dor de garganta",
      "Dor lombar há dois dias",
      "Febre referida e cansaço",
      "Dor no punho após esforço",
      "Tontura relatada",
      "Lesão superficial em antebraço",
      "Dor ao urinar",
      "Retorno para avaliação de curativo",
    ];
    const patients = [];
    const events = [];
    function record(patient, at, text, type) {
      patient.history.push({ at: at, text: text });
      events.push({
        id: "event_seed_" + String(events.length + 1).padStart(4, "0"),
        patientId: patient.id,
        at: at,
        text: text,
        type: type,
      });
    }
    for (let index = 0; index < 84; index += 1) {
      const active = index < 24;
      const historicalIndex = index - 24;
      const dayOffset = active ? 0 : historicalIndex % 7;
      let arrivalAt;
      if (active)
        arrivalAt = minutesAgo(
          index < 14
            ? 12 + index * 7
            : index < 19
              ? 3 + (index - 14) * 3
              : 25 + (index - 19) * 9,
        );
      else {
        const date = new Date(instant);
        date.setDate(date.getDate() - dayOffset);
        if (dayOffset === 0)
          date.setTime(
            instant - (45 + Math.floor(historicalIndex / 7) * 24) * 60000,
          );
        else
          date.setHours(
            7 + Math.floor(historicalIndex / 7),
            (historicalIndex * 13) % 60,
            0,
            0,
          );
        arrivalAt = date.toISOString();
      }
      const patient = patientTemplate(
        "patient_" + String(index + 1).padStart(3, "0"),
        "SC-" + (1041 + index),
        arrivalAt,
      );
      patient.name =
        firstNames[index % firstNames.length] +
        " " +
        surnames[Math.floor(index / firstNames.length)];
      patient.birthDate =
        1943 +
        ((index * 7) % 66) +
        "-" +
        String(1 + (index % 12)).padStart(2, "0") +
        "-" +
        String(1 + ((index * 3) % 27)).padStart(2, "0");
      patient.sex = index % 2 === 0 ? "Feminino" : "Masculino";
      patient.phone = "";
      patient.complaint = complaints[index % complaints.length];
      patient.allergies =
        index % 9 === 0
          ? "Dipirona (relato do paciente)"
          : index % 13 === 0
            ? "Penicilina (relato do paciente)"
            : "Não relatadas";
      patient.notes = "Cadastro fictício para demonstração da interface.";
      if (index < 14) {
        patient.status = "waiting";
        patient.risk = [
          "orange",
          "yellow",
          "yellow",
          "green",
          "yellow",
          "green",
          "green",
          "blue",
          "green",
          "blue",
          "green",
          "yellow",
          "green",
          "blue",
        ][index];
      } else if (index < 19) {
        patient.status = "triage";
      } else if (index < 24) {
        patient.status = "attending";
        patient.risk = ["red", "orange", "yellow", "green", "yellow"][
          index - 19
        ];
      } else {
        patient.status = "finished";
        patient.risk = [
          "green",
          "yellow",
          "green",
          "blue",
          "orange",
          "yellow",
          "green",
          "green",
          "blue",
          "red",
        ][historicalIndex % 10];
      }
      record(patient, arrivalAt, "Paciente cadastrado na recepção.", "arrival");
      if (patient.risk) {
        patient.triagedAt = iso(Date.parse(arrivalAt) + 3 * 60000);
        patient.vitals = {
          systolic: 110 + (index % 4) * 10,
          diastolic: 70 + (index % 3) * 5,
          heartRate: 72 + (index % 7) * 4,
          temperature: Math.round((36.3 + (index % 5) * 0.2) * 10) / 10,
          spo2: 96 + (index % 4),
          respiratoryRate: 16 + (index % 4),
          pain: index % 6,
        };
        record(
          patient,
          patient.triagedAt,
          "Classificação registrada: " +
            risks.find((risk) => risk.id === patient.risk).label +
            ".",
          "triage",
        );
      }
      if (patient.status === "attending" || patient.status === "finished") {
        patient.startedAt = iso(
          Date.parse(patient.triagedAt) +
            (patient.risk === "red" ? 0 : 5 + (index % 14)) * 60000,
        );
        patient.professional = [staff[1].id, staff[2].id, staff[4].id][
          index % 3
        ];
        patient.room =
          patient.risk === "red"
            ? "Sala de emergência"
            : "Consultório " + String(1 + (index % 4)).padStart(2, "0");
        record(
          patient,
          patient.startedAt,
          "Atendimento iniciado por " +
            staff.find((person) => person.id === patient.professional).name +
            ".",
          "started",
        );
      }
      if (patient.status === "finished") {
        patient.finishedAt = iso(
          Date.parse(patient.startedAt) + (12 + (index % 9)) * 60000,
        );
        record(
          patient,
          patient.finishedAt,
          "Atendimento finalizado.",
          "finished",
        );
      }
      patients.push(patient);
    }
    return {
      patients: patients,
      staff: staff,
      events: events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
      settings: {
        hospital: "Hospital Santa Clara",
        unit: "Pronto atendimento",
        userName: "Camila Martins",
      },
    };
  }

  function readStored(raw) {
    const wrapper = JSON.parse(raw);
    const data = wrapper && wrapper.data;
    if (
      wrapper.version !== VERSION ||
      !isObject(data) ||
      !Array.isArray(data.patients) ||
      !Array.isArray(data.staff) ||
      !Array.isArray(data.events) ||
      !isObject(data.settings)
    )
      return null;
    if (
      data.patients.length > 10000 ||
      data.staff.length > 1000 ||
      data.events.length > 50000
    )
      return null;
    const ids = new Set();
    for (const patient of data.patients) {
      if (
        !isObject(patient) ||
        !/^[a-zA-Z0-9_-]+$/.test(patient.id) ||
        ids.has(patient.id) ||
        !validDate(patient.arrivalAt) ||
        !Array.isArray(patient.history)
      )
        return null;
      ids.add(patient.id);
      validatePatient(patient);
      patient.vitals = normalizeVitals(patient.vitals);
      for (const field of ["triagedAt", "startedAt", "finishedAt"])
        if (patient[field] !== null && !validDate(patient[field])) return null;
    }
    if (
      !data.staff.every(
        (person) =>
          isObject(person) &&
          typeof person.id === "string" &&
          typeof person.name === "string" &&
          ["available", "busy", "break"].includes(person.status),
      )
    )
      return null;
    data.patients.forEach((patient) => {
      const professional = data.staff.find(
        (person) => person.name === patient.professional,
      );
      if (professional) patient.professional = professional.id;
    });
    return data;
  }

  let state;
  try {
    const stored = global.localStorage.getItem(KEY);
    state = stored ? readStored(stored) : null;
  } catch (_) {
    storageFailure();
  }
  if (!state) {
    state = seed();
    persist();
  }

  function appendEvent(patient, text, type, at) {
    const eventTime = at || now();
    const message = clean(text, 7000);
    if (!message) return null;
    const event = {
      id: uid("event"),
      patientId: patient.id,
      at: eventTime,
      text: message,
      type: type || "note",
    };
    patient.history.push({ at: eventTime, text: message });
    state.events.unshift(event);
    return event;
  }

  function addPatient(fields) {
    const at = now();
    const maxCode = state.patients.reduce(
      (max, patient) =>
        Math.max(max, Number(String(patient.code).replace(/^SC-/, "")) || 0),
      1040,
    );
    const patient = applyFields(
      patientTemplate(uid("patient"), "SC-" + (maxCode + 1), at),
      fields,
    );
    if (patient.status === "attending" || patient.status === "finished")
      throw new Error(
        "Cadastre o paciente na triagem ou na fila de atendimento.",
      );
    if (patient.risk) patient.triagedAt = at;
    state.patients.unshift(patient);
    appendEvent(patient, "Paciente cadastrado na recepção.", "arrival", at);
    if (patient.risk)
      appendEvent(
        patient,
        "Classificação registrada: " +
          risks.find((risk) => risk.id === patient.risk).label +
          ".",
        "triage",
        at,
      );
    persist();
    return clone(patient);
  }

  function updatePatient(id, patch) {
    const index = state.patients.findIndex((patient) => patient.id === id);
    if (index < 0) return null;
    const previous = state.patients[index];
    const next = applyFields(clone(previous), patch);
    const transitions = {
      triage: ["waiting"],
      waiting: ["attending"],
      attending: ["finished"],
      finished: [],
    };
    const immediateEmergency =
      previous.status === "triage" &&
      next.status === "attending" &&
      next.risk === "red";
    if (
      next.status !== previous.status &&
      !transitions[previous.status].includes(next.status) &&
      !immediateEmergency
    )
      throw new Error(
        "A mudança de situação não é permitida nesta etapa do atendimento.",
      );
    const at = now();
    if (next.risk && !next.triagedAt) next.triagedAt = at;
    if (next.status !== previous.status) {
      if (next.status === "waiting") next.triagedAt = next.triagedAt || at;
      if (next.status === "attending") next.startedAt = at;
      if (next.status === "finished") next.finishedAt = at;
    }
    state.patients[index] = next;
    if (next.risk !== previous.risk && next.risk)
      appendEvent(
        next,
        "Classificação " +
          (previous.risk ? "atualizada" : "registrada") +
          ": " +
          risks.find((risk) => risk.id === next.risk).label +
          ".",
        "triage",
        at,
      );
    if (next.status !== previous.status) {
      const professionalName =
        (state.staff.find((person) => person.id === next.professional) || {})
          .name || next.professional;
      const messages = {
        waiting: "Paciente encaminhado à fila de atendimento.",
        attending:
          "Atendimento iniciado" +
          (professionalName ? " por " + professionalName : "") +
          ".",
        finished: "Atendimento finalizado.",
      };
      appendEvent(
        next,
        messages[next.status],
        next.status === "attending" ? "started" : next.status,
        at,
      );
    } else if (next.risk === previous.risk)
      appendEvent(next, "Dados do atendimento atualizados.", "updated", at);
    persist();
    return clone(next);
  }

  function addEvent(patientId, text) {
    const patient = state.patients.find((item) => item.id === patientId);
    if (!patient) return null;
    const event = appendEvent(patient, text, "note");
    if (event) persist();
    return event ? clone(event) : null;
  }

  function updateStaff(id, patch) {
    const index = state.staff.findIndex((person) => person.id === id);
    if (index < 0) return null;
    if (!isObject(patch))
      throw new Error("Os dados do profissional são inválidos.");
    const person = clone(state.staff[index]);
    ["name", "role", "department", "status", "shift"].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(patch, key))
        person[key] = clean(patch[key], 150);
    });
    if (!person.name) throw new Error("Informe o nome do profissional.");
    if (!["available", "busy", "break"].includes(person.status))
      throw new Error("Disponibilidade inválida.");
    const parts = person.name.split(/\s+/);
    person.initials = (
      parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")
    ).toUpperCase();
    state.staff[index] = person;
    persist();
    return clone(person);
  }

  function updateSettings(patch) {
    if (!isObject(patch)) throw new Error("As configurações são inválidas.");
    const next = clone(state.settings);
    ["hospital", "unit", "userName"].forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(patch, key)) return;
      const value = clean(patch[key], 150);
      if (!value) throw new Error("Preencha todos os campos de configuração.");
      next[key] = value;
    });
    state.settings = next;
    persist();
    return clone(next);
  }

  function exportCSV(patients) {
    const rows = Array.isArray(patients) ? patients : state.patients;
    function cell(value) {
      let string = String(value == null ? "" : value);
      if (/^[\s\u0000-\u001f]*[=+\-@]/.test(string) || /^[\t\r\n]/.test(string))
        string = "'" + string;
      return '"' + string.replace(/"/g, '""') + '"';
    }
    const header = [
      "Código",
      "Nome",
      "Nascimento",
      "Sexo",
      "Telefone",
      "Queixa principal",
      "Alergias",
      "Classificação",
      "Situação",
      "Chegada",
      "Triagem",
      "Início do atendimento",
      "Finalização",
      "Profissional",
      "Sala",
      "Observações",
      "Desfecho",
    ];
    const result = [header.map(cell).join(";")];
    rows.forEach((patient) => {
      const risk = risks.find((item) => item.id === patient.risk);
      const professional = state.staff.find(
        (person) => person.id === patient.professional,
      );
      result.push(
        [
          patient.code,
          patient.name,
          patient.birthDate,
          patient.sex,
          patient.phone,
          patient.complaint,
          patient.allergies,
          risk ? risk.label : "Não classificado",
          statuses[patient.status] || patient.status,
          patient.arrivalAt,
          patient.triagedAt,
          patient.startedAt,
          patient.finishedAt,
          professional ? professional.name : patient.professional,
          patient.room,
          patient.notes,
          patient.outcome,
        ]
          .map(cell)
          .join(";"),
      );
    });
    return "\ufeff" + result.join("\r\n");
  }

  global.Store = Object.freeze({
    version: VERSION,
    risks: risks,
    statuses: statuses,
    get storageAvailable() {
      return storageAvailable;
    },
    get storageError() {
      return storageError;
    },
    get: () => clone(state),
    patients: () => clone(state.patients),
    staff: () => clone(state.staff),
    patient: (id) => {
      const patient = state.patients.find((item) => item.id === id);
      return patient ? clone(patient) : null;
    },
    risk: (id) => risks.find((risk) => risk.id === id) || null,
    addPatient: addPatient,
    updatePatient: updatePatient,
    addEvent: addEvent,
    updateStaff: updateStaff,
    updateSettings: updateSettings,
    exportCSV: exportCSV,
    reset: () => {
      state = seed();
      persist();
      return clone(state);
    },
  });

  if (typeof global.addEventListener === "function") {
    global.addEventListener("storage", function (event) {
      if (event.key !== KEY || !event.newValue) return;
      try {
        const data = readStored(event.newValue);
        if (data) {
          state = data;
          signal("clara:change", { saved: true, external: true });
        }
      } catch (_) {
        /* Ignore invalid snapshots from another tab. */
      }
    });
  }
})(window);
