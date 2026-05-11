import type { ButtonHTMLAttributes } from "react";

export function IconButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`ui-icon-btn ${className}`.trim()} type="button" {...props} />;
}












