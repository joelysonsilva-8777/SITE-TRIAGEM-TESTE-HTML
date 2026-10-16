import { useLocalSearchParams } from "expo-router";
import { Triage } from "../screens/Triage";
export default function TriageRoute() {
  const { patient } = useLocalSearchParams<{ patient?: string }>();
  const patientId = typeof patient === "string" ? patient : undefined;
  return <Triage key={patientId || "triage"} patientId={patientId} />;
}
