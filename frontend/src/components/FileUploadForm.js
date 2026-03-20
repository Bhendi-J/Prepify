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
    <form onSubmit={handleSubmit}>
      <div className="dropzone">
        <input 
          type="file" 
          onChange={handleFileChange} 
          disabled={isLoading}
          accept=".txt,.pdf,.png,.jpg,.jpeg"
        />
        <div className="dropzone-text">
          {selectedFile ? 'Selected file:' : 'Drag and drop your document here, or click to browse'}
        </div>
        {selectedFile && (
          <div className="dropzone-file">{selectedFile.name}</div>
        )}
      </div>
      
      <button 
        type="submit" 
        className="btn" 
        disabled={isLoading || !selectedFile} 
        style={{width: '100%', padding: '14px', fontSize: '1rem'}}
      >
        {isLoading ? (
          <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
             Processing with AI...
          </span>
        ) : 'Summarize Document'}
      </button>
    </form>
  );
}

export default FileUploadForm;