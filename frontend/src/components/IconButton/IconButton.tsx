import styles from "./IconButton.module.css";
import type { ButtonHTMLAttributes } from "react";

export function IconButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={[styles["ui-icon-btn"], className].filter(Boolean).join(" ")} type="button" {...props} />;
}


