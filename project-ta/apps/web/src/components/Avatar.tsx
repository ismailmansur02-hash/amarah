interface Props {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function Avatar({ name, color = "#157347", size = "md" }: Props) {
  const cls = size === "lg" ? "avatar avatar-lg" : size === "sm" ? "avatar avatar-sm" : "avatar";
  return (
    <span className={cls} style={{ background: color }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
