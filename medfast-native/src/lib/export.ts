import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { Patient } from "../data/types";
import { Store } from "../data/store-core";
import { dateTime } from "./format";
export async function exportPatients(store: Store, patients: Patient[]) {
  const csv = store.exportCSV(patients),
    name = `medfast-pacientes-${new Date().toISOString().slice(0, 10)}.csv`;
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error(
      "O compartilhamento de arquivos não está disponível neste dispositivo.",
    );
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(csv);
  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle: "Exportar pacientes do MedFast",
  });
}
const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function printPatients(
  store: Store,
  patients: Patient[],
  title = "Relatório de atendimento",
) {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escape(title)} · MedFast</title><style>body{font:14px Arial;color:#1F2937;padding:30px}h1{color:#0648D7}table{border-collapse:collapse;width:100%;font-size:11px}th,td{padding:9px;border-bottom:1px solid #DCE5EF;text-align:left}p{line-height:1.5}tr{break-inside:avoid}</style></head><body><h1>MedFast · ${escape(title)}</h1><p>${escape(store.get().settings.hospital)} · ${escape(dateTime(new Date().toISOString()))}<br>Demonstração · ${patients.length} registros fictícios</p><table><thead><tr><th>Paciente</th><th>Risco</th><th>Situação</th><th>Chegada</th><th>Profissional</th></tr></thead><tbody>${patients.map((p) => `<tr><td>${escape(p.name)}<br>${escape(p.code)}</td><td>${escape(store.risk(p.risk)?.label || "Não classificado")}</td><td>${escape(store.statuses[p.status])}</td><td>${escape(dateTime(p.arrivalAt))}</td><td>${escape(store.staff().find((s) => s.id === p.professional)?.name || "—")}</td></tr>`).join("")}</tbody></table>${patients.length === 1 ? `<h2>Ficha do paciente</h2><p>Queixa: ${escape(patients[0].complaint)}<br>Alergias: ${escape(patients[0].allergies)}<br>Observações: ${escape(patients[0].notes)}<br>Desfecho: ${escape(patients[0].outcome || "—")}</p><h2>Histórico</h2>${patients[0].history.map((h) => `<p>${escape(dateTime(h.at))} · ${escape(h.text)}</p>`).join("")}` : ""}</body></html>`;
  if (Platform.OS === "web") {
    const tab = window.open("", "_blank");
    if (!tab)
      throw new Error("Permita abrir a janela de impressão no navegador.");
    tab.document.write(html);
    tab.document.close();
    tab.focus();
    tab.print();
    return;
  }
  await Print.printAsync({ html });
}
