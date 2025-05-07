

import React, { useState, useEffect } from 'react';

const FormGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [formFields, setFormFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [llmOutput, setLlmOutput] = useState(null); // Add new state for LLM output


  // Load saved templates from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('formTemplates');
    if (saved) {
      setSavedTemplates(JSON.parse(saved));
    }
  }, []);

  const saveTemplate = () => {
    if (!prompt || !formFields.length) {
      setError('Please generate a form before saving');
      return;
    }

    const newTemplate = {
      id: Date.now(),
      prompt,
      fields: formFields,
      version: 1,
      dateCreated: new Date().toISOString(),
    };

    // Check if similar prompt exists
    const existingTemplateIndex = savedTemplates.findIndex(
      template => template.prompt.toLowerCase() === prompt.toLowerCase()
    );

    let updatedTemplates;
    if (existingTemplateIndex !== -1) {
      // Update existing template with new version
      updatedTemplates = savedTemplates.map((template, index) => {
        if (index === existingTemplateIndex) {
          return {
            ...newTemplate,
            version: template.version + 1,
          };
        }
        return template;
      });
    } else {
      // Add new template
      updatedTemplates = [...savedTemplates, newTemplate];
    }

    setSavedTemplates(updatedTemplates);
    localStorage.setItem('formTemplates', JSON.stringify(updatedTemplates));
    setSelectedTemplate(newTemplate);
  };

  const loadTemplate = (template) => {
    setPrompt(template.prompt);
    setFormFields(template.fields);
    setSelectedTemplate(template);
    // Initialize form data for the loaded template
    const initialFormData = {};
    template.fields.forEach(field => {
      if (field.defaultValue) {
        initialFormData[field.name] = field.defaultValue;
      } else {
        switch (field.type) {
          case 'multiselect':
          case 'checkboxgroup':
            initialFormData[field.name] = [];
            break;
          case 'checkbox':
            initialFormData[field.name] = false;
            break;
          default:
            initialFormData[field.name] = '';
        }
      }
    });
    setFormData(initialFormData);
  };

  const deleteTemplate = (templateId) => {
    const updatedTemplates = savedTemplates.filter(template => template.id !== templateId);
    setSavedTemplates(updatedTemplates);
    localStorage.setItem('formTemplates', JSON.stringify(updatedTemplates));
    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate(null);
    }
  };


  const generateForm = async () => {
    setIsLoading(true);
    setError(null);
    setLlmOutput(null); // Reset LLM output
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "user",
            content: `Create a JSON array of form fields based on this description: "${prompt}"
                     Each field object can have these properties:
                     {
                       "label": "Field Label",
                       "name": "fieldName",
                       "type": "text/select/multiselect/textarea/date/password/checkbox/checkboxgroup/radio/range/color/file/email/number/url/time",
                       "required": boolean,
                       "options": ["Option1", "Option2"],  // for select, multiselect, radio, checkbox
                       "validation": {
                         "minLength": number,
                         "maxLength": number,
                         "pattern": "regex pattern",
                         "min": number,
                         "max": number,
                         "errorMessage": "Custom error message"
                       },
                       "placeholder": "Placeholder text",
                       "helpText": "Helper text below the field",
                       "defaultValue": "Default value",
                       "section": "Section name for grouping"
                     }`
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0]?.message?.content) {
        const contentText = data.choices[0].message.content.trim();
        setLlmOutput(contentText); // Store raw LLM output
        const generatedFields = JSON.parse(contentText);
        setFormFields(generatedFields);
        
        // Initialize formData with default values
        const initialFormData = {};
        generatedFields.forEach(field => {
          if (field.defaultValue) {
            initialFormData[field.name] = field.defaultValue;
          } else {
            switch (field.type) {
              case 'multiselect':
              case 'checkboxgroup':
                initialFormData[field.name] = [];
                break;
              case 'checkbox':
                initialFormData[field.name] = false;
                break;
              case 'radio':
                initialFormData[field.name] = '';
                break;
              case 'number':
              case 'range':
                initialFormData[field.name] = field.validation?.min || 0;
                break;
              default:
                initialFormData[field.name] = '';
            }
          }
        });
        setFormData(initialFormData);
      }
    } catch (err) {
      console.error('Full error:', err);
      setError('Error generating form: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmissions(prev => [...prev, formData]);
    // Reset form
    const emptyFormData = {};
    formFields.forEach(field => {
      switch (field.type) {
        case 'multiselect':
        case 'checkboxgroup':
          emptyFormData[field.name] = [];
          break;
        case 'checkbox':
          emptyFormData[field.name] = false;
          break;
        default:
          emptyFormData[field.name] = '';
      }
    });
    setFormData(emptyFormData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field.name]: value
    }));
  };

  // Group fields by section
  const groupedFields = formFields.reduce((acc, field) => {
    const section = field.section || 'Default';
    if (!acc[section]) acc[section] = [];
    acc[section].push(field);
    return acc;
  }, {});

  const renderField = (field) => {
    const commonStyles = {
      width: '100%',
      padding: '8px',
      marginTop: '5px',
      borderRadius: '8px',
      border: '1px solid #ddd',
      fontSize: '16px'
    };

    const label = (
      <label style={{ 
        display: 'block', 
        marginBottom: '8px', 
        fontSize: '16px',
        fontWeight: '500'
      }}>
        {field.label}
        {field.required && <span style={{ color: '#dc3545', marginLeft: '4px' }}>*</span>}
      </label>
    );

    const helpText = field.helpText && (
      <small style={{ 
        display: 'block', 
        marginTop: '4px', 
        color: '#666',
        fontSize: '14px' 
      }}>
        {field.helpText}
      </small>
    );

    switch (field.type) {
      case 'radio':
        return (
          <div style={{ marginBottom: '20px' }}>
            {label}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '12px',
              marginTop: '8px'
            }}>
              {field.options.map((option, i) => (
                <label
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '8px',
                    borderRadius: '4px',
                    backgroundColor: formData[field.name] === option ? '#f8f9fa' : 'transparent',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  <input
                    type="radio"
                    name={field.name}
                    value={option}
                    checked={formData[field.name] === option}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    required={field.required}
                    style={{
                      width: '20px',
                      height: '20px',
                      margin: 0,
                      cursor: 'pointer'
                    }}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {helpText}
          </div>
        );

      case 'select':
        return (
          <div style={{ marginBottom: '20px' }}>
            {label}
            <select
              value={formData[field.name]}
              onChange={(e) => handleInputChange(field, e.target.value)}
              required={field.required}
              style={commonStyles}
            >
              <option value="">Select an option</option>
              {field.options.map((option, i) => (
                <option key={i} value={option}>{option}</option>
              ))}
            </select>
            {helpText}
          </div>
        );

      case 'multiselect':
        return (
          <div style={{ marginBottom: '20px' }}>
            {label}
            <select
              multiple
              value={formData[field.name]}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                handleInputChange(field, selectedOptions);
              }}
              required={field.required}
              style={{ ...commonStyles, height: '120px' }}
            >
              {field.options.map((option, i) => (
                <option key={i} value={option}>{option}</option>
              ))}
            </select>
            {helpText}
          </div>
        );

      case 'checkboxgroup':
        return (
          <div style={{ marginBottom: '20px' }}>
            {label}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '12px',
              marginTop: '8px'
            }}>
              {field.options.map((option, i) => (
                <label
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '8px',
                    borderRadius: '4px',
                    backgroundColor: (formData[field.name] || []).includes(option) ? '#f8f9fa' : 'transparent',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  <input
                    type="checkbox"
                    name={field.name}
                    value={option}
                    checked={(formData[field.name] || []).includes(option)}
                    onChange={(e) => {
                      const currentValues = formData[field.name] || [];
                      const newValues = e.target.checked
                        ? [...currentValues, option]
                        : currentValues.filter(val => val !== option);
                      
                      if (field.required && newValues.length === 0) {
                        e.target.setCustomValidity('Please select at least one option');
                      } else {
                        e.target.setCustomValidity('');
                      }
                      
                      handleInputChange(field, newValues);
                    }}
                    style={{
                      width: '20px',
                      height: '20px',
                      margin: 0,
                      cursor: 'pointer'
                    }}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {helpText}
          </div>
        );

      case 'checkbox':
        return (
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              <input
                type="checkbox"
                checked={formData[field.name]}
                onChange={(e) => handleInputChange(field, e.target.checked)}
                required={field.required}
                style={{
                  width: '20px',
                  height: '20px',
                  margin: 0,
                  cursor: 'pointer'
                }}
              />
              <span>{field.label}</span>
              {field.required && <span style={{ color: '#dc3545', marginLeft: '4px' }}>*</span>}
            </label>
            {helpText}
          </div>
        );

      case 'textarea':
        return (
          <div style={{ marginBottom: '20px' }}>
            {label}
            <textarea
              value={formData[field.name]}
              onChange={(e) => handleInputChange(field, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              style={{ ...commonStyles, minHeight: '100px', resize: 'vertical' }}
            />
            {helpText}
          </div>
        );

      case 'range':
        const value = formData[field.name];
        return (
          <div style={{ marginBottom: '20px' }}>
            {label}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="range"
                min={field.validation?.min || 0}
                max={field.validation?.max || 100}
                value={value}
                onChange={(e) => handleInputChange(field, e.target.value)}
                required={field.required}
                style={{ flex: 1 }}
              />
              <span style={{ minWidth: '40px', textAlign: 'right' }}>{value}</span>
            </div>
            {helpText}
          </div>
        );

      default:
        return (
          <div style={{ marginBottom: '20px' }}>
            {label}
            <input
              type={field.type}
              value={formData[field.name]}
              onChange={(e) => handleInputChange(field, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              min={field.validation?.min}
              max={field.validation?.max}
              minLength={field.validation?.minLength}
              maxLength={field.validation?.maxLength}
              pattern={field.validation?.pattern}
              style={commonStyles}
            />
            {helpText}
          </div>
        );
    }
  };


  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the form you want to generate... (Example: Create a contact form with name, email, phone number, and a message field)"
            style={{ 
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '16px',
              marginBottom: '10px',
              minHeight: '120px',
              resize: 'vertical',
              lineHeight: '1.5',
              fontFamily: 'inherit'
            }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={generateForm}
              disabled={isLoading || !prompt}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                opacity: isLoading || !prompt ? 0.7 : 1,
                transition: 'opacity 0.2s ease'
              }}
            >
              {isLoading ? 'Generating...' : 'Generate Form'}
            </button>
            <button
              onClick={saveTemplate}
              disabled={!formFields.length}
              style={{
                padding: '12px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                opacity: !formFields.length ? 0.7 : 1,
                transition: 'opacity 0.2s ease'
              }}
            >
              Save Template
            </button>
          </div>
        </div>

        {savedTemplates.length > 0 && (
          <div style={{ width: '300px', borderLeft: '1px solid #ddd', paddingLeft: '20px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Saved Templates</h3>
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto',
              border: '1px solid #ddd',
              borderRadius: '8px'
            }}>
              {savedTemplates.map(template => (
                <div
                  key={template.id}
                  style={{
                    padding: '10px',
                    borderBottom: '1px solid #ddd',
                    backgroundColor: selectedTemplate?.id === template.id ? '#f8f9fa' : 'transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>
                      {template.prompt.length > 30 
                        ? template.prompt.substring(0, 30) + '...' 
                        : template.prompt}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Version {template.version} • {new Date(template.dateCreated).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      onClick={() => loadTemplate(template)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ 
          color: '#dc3545', 
          padding: '12px', 
          backgroundColor: '#f8d7da',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {error && (
        <div style={{ 
          color: '#dc3545', 
          padding: '12px', 
          backgroundColor: '#f8d7da',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      
      {/* LLM Output Display */}
      {llmOutput && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '10px' }}>Generated Form Specification</h3>
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '15px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            <pre style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              fontSize: '14px',
              fontFamily: 'monospace'
            }}>
              {JSON.stringify(JSON.parse(llmOutput), null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Generated Form Display */}
      {formFields.length > 0 && (
        <div>
          <h3 style={{ marginBottom: '20px' }}>Generated Form</h3>
          <form onSubmit={handleSubmit}>
            {Object.entries(groupedFields).map(([section, fields]) => (
              <div key={section} style={{ marginBottom: '30px' }}>
                {section !== 'Default' && (
                  <h4 style={{ 
                    marginBottom: '20px',
                    fontSize: '18px',
                    fontWeight: '500'
                  }}>
                    {section}
                  </h4>
                )}
                {fields.map((field, index) => (
                  <div key={index}>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            ))}
            
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Submit
            </button>
          </form>
        </div>
      )}

      {/* Submissions Display */}
      {submissions.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h3>Submitted Data:</h3>
          {submissions.map((submission, index) => (
            <div
              key={index}
              style={{
                border: '1px solid #ddd',
                padding: '15px',
                marginTop: '10px',
                borderRadius: '8px',
                backgroundColor: '#f8f9fa'
              }}
            >
              {Object.entries(submission).map(([key, value]) => (
                <p key={key} style={{ margin: '5px 0', fontSize: '14px' }}>
                  <strong>{key}:</strong> {Array.isArray(value) ? value.join(', ') : value.toString()}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FormGenerator;