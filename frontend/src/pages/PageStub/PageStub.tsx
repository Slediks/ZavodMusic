import styles from './PageStub.module.css';
export function PageStub({ title }: { title: string }) {
  return (
    <section className={styles["page-stub"]}>
      <h1>{title}</h1>
      <p>Этап 4: каркас страницы готов.</p>
    </section>
  );
}












