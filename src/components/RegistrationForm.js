import React, { useState } from 'react';

const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    idNumber: ''
  });
  
  const [submissions, setSubmissions] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    
    // Add new submission
    setSubmissions([...submissions, formData]);
    
    // Clear form
    setFormData({
      name: '',
      country: '',
      idNumber: ''
    });
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Name:
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Country:
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            ID Number:
            <input
              type="text"
              name="idNumber"
              value={formData.idNumber}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </label>
        </div>

        <button 
          type="submit"
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Submit
        </button>
      </form>

      {submissions.length > 0 && (
        <div>
          <h3>Submitted Data:</h3>
          {submissions.map((submission, index) => (
            <div 
              key={index}
              style={{
                border: '1px solid #ddd',
                padding: '10px',
                marginBottom: '10px',
                borderRadius: '4px'
              }}
            >
              <p>Name: {submission.name}</p>
              <p>Country: {submission.country}</p>
              <p>ID Number: {submission.idNumber}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RegistrationForm;