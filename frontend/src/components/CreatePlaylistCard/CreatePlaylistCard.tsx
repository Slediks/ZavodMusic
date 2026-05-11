import styles from './CreatePlaylistCard.module.css';
import { UiIcon } from '../UiIcon/UiIcon';

type CreatePlaylistCardProps = {
  onCreate: () => void;
};

export function CreatePlaylistCard({ onCreate }: CreatePlaylistCardProps) {
  return (
    <article
      className={styles["playlist-card"] + " " + styles["create-card"]}
      role="button"
      tabIndex={0}
      onClick={onCreate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCreate();
        }
      }}
    >
      <div className={styles["create-cover-wrap"]}>
        <div className={styles["create-cover-placeholder"]}>
          <UiIcon name="plus" className={styles["create-sign"]} />
        </div>
      </div>
      <div className={styles["playlist-body"] + " " + styles["create-body"]}>
        <div className={styles["playlist-title"]}>Создать плейлист</div>
        <p className={styles["playlist-desc"]}>Новый личный или публичный плейлист</p>
      </div>
    </article>
  );
}





