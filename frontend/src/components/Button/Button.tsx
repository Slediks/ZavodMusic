import styles from "./Button.module.css";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const variantClass = variant === "primary"
    ? styles["ui-btn-primary"]
    : variant === "danger"
      ? styles["ui-btn-danger"]
      : styles["ui-btn-ghost"];

  return <button className={[styles["ui-btn"], variantClass, className].filter(Boolean).join(" ")} {...props} />;
}


