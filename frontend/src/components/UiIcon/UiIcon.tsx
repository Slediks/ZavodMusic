import type { CSSProperties } from "react";
import styles from "./UiIcon.module.css";

export type UiIconName =
  | "play"
  | "pause"
  | "next"
  | "previous"
  | "shuffle"
  | "repeat"
  | "repeatOne"
  | "queue"
  | "menuHorizontal"
  | "menuVertical"
  | "close"
  | "trash"
  | "heart"
  | "heartOff"
  | "plus"
  | "folderMusic"
  | "text"
  | "link"
  | "edit"
  | "arrowLeft"
  | "arrowRight"
  | "check"
  | "logout"
  | "volumeOn"
  | "volumeOff"
  | "fullscreen"
  | "themeLight"
  | "themeDark"
  | "backspace"
  | "sortingRight"
  | "musicArtist"
  | "musicAlbum"
  | "musicTwo"
  | "signEqual"
  | "lock"
  | "lockOff";

const ICON_PATHS: Record<UiIconName, string> = {
  play: "/icons/player-play-svgrepo-com.svg",
  pause: "/icons/player-pause-svgrepo-com.svg",
  next: "/icons/player-next-svgrepo-com.svg",
  previous: "/icons/player-previous-svgrepo-com.svg",
  shuffle: "/icons/playlist-shuffle-svgrepo-com.svg",
  repeat: "/icons/playlist-repeat-list-svgrepo-com.svg",
  repeatOne: "/icons/playlist-repeat-song-svgrepo-com.svg",
  queue: "/icons/playlist-svgrepo-com.svg",
  menuHorizontal: "/icons/menu-kebab-horizontal-svgrepo-com.svg",
  menuVertical: "/icons/menu-kebab-vertical-svgrepo-com.svg",
  close: "/icons/close-svgrepo-com.svg",
  trash: "/icons/trash-simple-svgrepo-com.svg",
  heart: "/icons/heart-svgrepo-com.svg",
  heartOff: "/icons/heart-off-svgrepo-com.svg",
  plus: "/icons/sign-plus-svgrepo-com.svg",
  folderMusic: "/icons/folder-music-svgrepo-com.svg",
  text: "/icons/type-svgrepo-com.svg",
  link: "/icons/link-svgrepo-com.svg",
  edit: "/icons/edit-svgrepo-com.svg",
  arrowLeft: "/icons/arrow-left-2-svgrepo-com.svg",
  arrowRight: "/icons/arrow-right-2-svgrepo-com.svg",
  check: "/icons/check-svgrepo-com.svg",
  logout: "/icons/exit-svgrepo-com.svg",
  volumeOn: "/icons/volume-up-svgrepo-com.svg",
  volumeOff: "/icons/volume-off-svgrepo-com.svg",
  fullscreen: "/icons/screen-full-svgrepo-com.svg",
  themeLight: "/icons/mode-light-svgrepo-com.svg",
  themeDark: "/icons/mode-dark-svgrepo-com.svg",
  backspace: "/icons/backspace-svgrepo-com.svg",
  sortingRight: "/icons/sorting-right-svgrepo-com.svg",
  musicArtist: "/icons/music-artist-svgrepo-com.svg",
  musicAlbum: "/icons/music-album-svgrepo-com.svg",
  musicTwo: "/icons/music-2-svgrepo-com.svg",
  signEqual: "/icons/sign-equal-svgrepo-com.svg",
  lock: "/icons/lock-svgrepo-com.svg",
  lockOff: "/icons/lock-off-svgrepo-com.svg"
};

type UiIconProps = {
  name: UiIconName;
  className?: string;
};

export function UiIcon({ name, className = "" }: UiIconProps) {
  const mask = `url(${ICON_PATHS[name]})`;
  return <span aria-hidden="true" className={`${styles["ui-icon"]} ${className}`.trim()} style={{ "--ui-icon-mask": mask } as CSSProperties} />;
}





