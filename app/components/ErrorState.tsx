import styles from "./ErrorState.module.css";

type Props = {
  icon: string;
  heading: string;
  body: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export default function ErrorState({
  icon,
  heading,
  body,
  onRetry,
  retryLabel = "Retry",
}: Props) {
  return (
    <div className={styles.wrap}>
      <span className={styles.icon}>{icon}</span>
      <h2 className={styles.heading}>{heading}</h2>
      <p className={styles.body}>{body}</p>
      {onRetry && (
        <button className={styles.retryBtn} onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}
