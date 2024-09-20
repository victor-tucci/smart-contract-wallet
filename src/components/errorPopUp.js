import React, { useState, useEffect } from 'react';

function ErrorPopup({ errorMessage, onClose }) {
  useEffect(() => {
    const handleClickOutside = () => {
      onClose(); // Close popup on screen click
    };

    // Add event listener to detect screen click
    document.addEventListener('click', handleClickOutside);

    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div style={styles.overlay}>
      <div style={styles.popup}>
        <h2>Error</h2>
        <p>{errorMessage}</p>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '5px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  },
};

export default ErrorPopup;
