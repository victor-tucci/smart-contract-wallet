import React, { useEffect, useRef } from 'react';

function SuccessPopUp({ txStatus,txHash, onClose }) {
  
  const popupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
        // Check if the clicked element is outside of the popup
        if (popupRef.current && !popupRef.current.contains(event.target)) {
            if (['OnChain', 'Cancelled', 'Reverted'].includes(txStatus)) {
                onClose(); // Close popup
            }
        }
    };

    // Add event listener to detect screen click
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div style={styles.overlay}>
      <div style={styles.popup} ref={popupRef}>
        <h2>Transaction ...  <span style={styles.highlight}>{txStatus}</span> </h2>
        <p style={styles.highlight}>{txHash}</p>
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
    color: 'black',
    border: '2px solid black',
    padding: '20px',
    borderRadius: '5px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  },
  highlight: {
    color: 'green',
  }
};

export default SuccessPopUp;
