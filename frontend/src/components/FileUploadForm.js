import React, { useState } from 'react';

function FileUploadForm({ onUpload, isLoading }) {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="content-section">
      <div className="form-group">
        <input type="file" onChange={handleFileChange} className="form-control-file" />
      </div>
      <button type="submit" className="btn" disabled={isLoading || !selectedFile}>
        {isLoading ? 'Processing...' : 'Process Note'}
      </button>
    </form>
  );
}

export default FileUploadForm;