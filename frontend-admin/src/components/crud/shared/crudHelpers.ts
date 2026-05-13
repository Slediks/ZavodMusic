import type { AnyEntity } from "../../../types";

export function objectLabel(item: AnyEntity) {
  return `${item.id} · ${item.title || item.name || item.login || "Без названия"}`;
}

export function renderValue(value: any): string {
  if (value == null) return "-";
  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    if (typeof value[0] === "object") return value.map((x) => objectLabel(x)).join(", ");
    return value.join(", ");
  }
  if (typeof value === "object") return objectLabel(value);
  return String(value);
}

export function listLine(type: string, item: AnyEntity) {
  if (type === "tracks") {
    const bits = [item.id, item.title || "без названия"];
    if (item.missingFile) bits.push("missing");
    if (item.disabledManually) bits.push("disabled");
    return bits.join(" · ");
  }
  return objectLabel(item);
}

export function deleteHint(type: string) {
  if (type === "albums") return "Перед удалением можно переназначить треки на другой альбом или создать новый.";
  if (type === "artists") return "Перед удалением можно переназначить треки другому автору.";
  if (type === "users") return "Перед удалением можно назначить нового владельца плейлистов.";
  return "Удаление необратимо.";
}
