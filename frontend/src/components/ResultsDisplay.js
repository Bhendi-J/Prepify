import React from 'react';

function ResultsDisplay({ text }) {
  if (!text) {
    return null; // Don't render anything if there's no text
  }

  return (
    <div className="content-section">
      <h2>Extracted Text</h2>
      <pre>{text}</pre>
    </div>
  );
}

export default ResultsDisplay;