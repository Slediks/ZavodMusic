import type { MouseEvent, ReactNode } from "react";

type AppLinkProps = {
  to: string;
  currentPath: string;
  onNavigate: (to: string) => void;
  className?: string;
  children: ReactNode;
};

export function AppLink({ to, currentPath, onNavigate, className, children }: AppLinkProps) {
  const active = currentPath === to;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    onNavigate(to);
  };

  return (
    <a
      href={to}
      onClick={handleClick}
      className={className}
      data-active={active ? "true" : "false"}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </a>
  );
}







