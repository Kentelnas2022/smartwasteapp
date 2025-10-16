import React from 'react';
import styles from './Spinner.module.css'; // Import CSS module for styling

const Spinner = () => {
  return (
    <div className={styles.spinner}>
      <div className={styles.ball}></div>
      <div className={styles.ball}></div>
    </div>
  );
};

export default Spinner;
