import React, { Component, useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  downloadMyCertificate,
  getCertificateTemplate,
  listCertificateTemplates,
  listMyCertificates,
  saveCertificateTemplate,
  setCertificateTemplateActive,
  verifyCertificate,
} from '../api/certificates.js';
import './CertificatePages.css';

const FIELD_LIBRARY = [
  ['student_name', 'Student name'],
  ['enrollment_number', 'Enrollment number'],
  ['event_name', 'Event name'],
  ['society_name', 'Society name'],
  ['event_date', 'Event date'],
  ['issue_date', 'Certificate issue date'],
  ['certificate_id', 'Certificate ID'],
  ['signatory_name', 'Authorised signatory name'],
  ['signatory_designation', 'Authorised signatory designation'],
  ['verification_qr', 'Verification QR code'],
];

const SAMPLE_VALUES = {
  student_name: 'Aarav Sharma',
  enrollment_number: '2026001234',
  event_name: 'Innovation & Design Summit',
  society_name: 'ACM Society',
  event_date: '20 October 2026',
  issue_date: '11 November 2026',
  certificate_id: 'CC-PREVIEW-123456',
  signatory_name: 'Dr. Ananya Sharma',
  signatory_designation: 'Faculty Coordinator',
};

function emptyConfig() {
  return { width: 297, height: 210, orientation: 'landscape', fields: [] };
}

function makeField(type, index) {
  return {
    id: `${type}-${Date.now()}-${index}`,
    type,
    x: 0.28,
    y: Math.min(0.18 + index * 0.085, 0.82),
    width: 0.48,
    height: type === 'verification_qr' ? 0.18 : 0.07,
    fontFamily: 'Helvetica',
    fontSize: 24,
    bold: type === 'student_name' || type === 'event_name',
    italic: false,
    color: '#202938',
    align: 'center',
    wrap: true,
    overflow: 'shrink',
  };
}

function readDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || '');
    reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.readAsDataURL(file);
  });
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

class CertificateManagementErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[certificate-template-designer] Uncaught component error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <section className="certificate-page">
          <div className="certificate-message error" role="alert">
            The certificate designer encountered an unexpected error. Reload the designer to try again.
            <button type="button" className="certificate-error-reload" onClick={() => window.location.reload()}>
              Reload designer
            </button>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}

function CertificateManagementEditor({ token }) {
  const [templates, setTemplates] = useState([]);
  const [events, setEvents] = useState([]);
  const [societyName, setSocietyName] = useState('');
  const [templateGroupId, setTemplateGroupId] = useState('');
  const [name, setName] = useState('Society Certificate');
  const [eventId, setEventId] = useState('');
  const [config, setConfig] = useState(emptyConfig);
  const [backgroundData, setBackgroundData] = useState('');
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [drag, setDrag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const selectedField = config.fields.find((field) => field.id === selectedFieldId) || null;

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const templateResult = await listCertificateTemplates(token);
      const records = templateResult.templates || [];
      setTemplates(records);
      setSocietyName(templateResult.society?.name || '');
      setEvents(templateResult.events || []);
    } catch (requestError) {
      setTemplates([]);
      setSocietyName('');
      setEvents([]);
      setError(requestError.message || 'Unable to load certificate templates.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!templateGroupId) return;
    let active = true;
    getCertificateTemplate(token, templateGroupId)
      .then(({ template }) => {
        if (!active) return;
        setName(template.name);
        setEventId(template.eventId || '');
        setConfig(template.config);
        setBackgroundData(template.backgroundData || '');
        setSelectedFieldId(template.config.fields[0]?.id || '');
        setError('');
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to open this template.');
      });
    return () => { active = false; };
  }, [templateGroupId, token]);

  useEffect(() => {
    if (!drag) return undefined;
    const move = (event) => {
      const stage = canvasRef.current;
      const activeDrag = dragRef.current;
      if (!stage || !activeDrag) return;
      const bounds = stage.getBoundingClientRect();
      const nextX = (event.clientX - bounds.left) / bounds.width;
      const nextY = (event.clientY - bounds.top) / bounds.height;
      setConfig((current) => ({
        ...current,
        fields: current.fields.map((field) => {
          if (field.id !== activeDrag.id) return field;
          if (activeDrag.mode === 'resize') {
            return {
              ...field,
              width: Math.max(0.04, Math.min(1 - field.x, nextX - field.x)),
              height: Math.max(0.035, Math.min(1 - field.y, nextY - field.y)),
            };
          }
          return {
            ...field,
            x: Math.max(0, Math.min(1 - field.width, nextX - activeDrag.offsetX)),
            y: Math.max(0, Math.min(1 - field.height, nextY - activeDrag.offsetY)),
          };
        }),
      }));
    };
    const stop = () => {
      dragRef.current = null;
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, [drag]);

  const beginDrag = (event, field, mode = 'move') => {
    if (event.button !== 0 || !canvasRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = canvasRef.current.getBoundingClientRect();
    const pointerX = (event.clientX - bounds.left) / bounds.width;
    const pointerY = (event.clientY - bounds.top) / bounds.height;
    const state = {
      id: field.id,
      mode,
      offsetX: pointerX - field.x,
      offsetY: pointerY - field.y,
    };
    dragRef.current = state;
    setDrag(state);
    setSelectedFieldId(field.id);
  };

  const updateField = (fieldId, updates) => {
    setConfig((current) => ({
      ...current,
      fields: current.fields.map((field) => field.id === fieldId ? { ...field, ...updates } : field),
    }));
  };

  const addField = (type) => {
    const field = makeField(type, config.fields.length);
    setConfig((current) => ({ ...current, fields: [...current.fields, field] }));
    setSelectedFieldId(field.id);
  };

  const removeField = () => {
    if (!selectedField) return;
    setConfig((current) => ({
      ...current,
      fields: current.fields.filter((field) => field.id !== selectedField.id),
    }));
    setSelectedFieldId('');
  };

  const startNewTemplate = () => {
    setTemplateGroupId('');
    setName('Society Certificate');
    setEventId('');
    setConfig(emptyConfig());
    setBackgroundData('');
    setSelectedFieldId('');
    setNotice('');
    setError('');
  };

  const handleBackgroundChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a PNG or JPEG background no larger than 5 MB.');
      event.target.value = '';
      return;
    }
    try {
      setBackgroundData(await readDataUrl(file));
      setError('');
    } catch (readError) {
      setError(readError.message);
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await saveCertificateTemplate(token, templateGroupId, {
        name,
        eventId: eventId || null,
        config,
        backgroundData,
      });
      if (!result.template?.templateGroupId) {
        throw new Error('The server saved the template but did not return its identifier. Refresh the designer before continuing.');
      }
      setTemplateGroupId(result.template.templateGroupId);
      setNotice('Template saved. Earlier issued certificates retain their original design.');
      await loadTemplates();
    } catch (saveError) {
      setError(saveError.message || 'Unable to save template.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (template) => {
    setError('');
    setNotice('');
    try {
      await setCertificateTemplateActive(token, template.templateGroupId, !template.isActive);
      await loadTemplates();
      setNotice(template.isActive ? 'Template deactivated.' : 'Template activated for its certificate context.');
    } catch (activationError) {
      setError(activationError.message || 'Unable to change template status.');
    }
  };

  const selectedTemplate = templates.find((template) => template.templateGroupId === templateGroupId);

  return (
    <section className="certificate-page">
      <header className="certificate-page-header">
        <div>
          <p className="certificate-eyebrow">
            {societyName ? `Managing templates for ${societyName}` : 'No society assigned'} · Certificates
          </p>
          <h1>Certificate template designer</h1>
          <p>
            {societyName
              ? `Design a reusable certificate for ${societyName}. Issued certificates keep an immutable copy of the active design.`
              : 'Templates are limited to the society linked to your faculty account.'}
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={startNewTemplate}>New template</button>
      </header>

      {error && <div className="certificate-message error" role="alert">{error}</div>}
      {notice && <div className="certificate-message success" role="status">{notice}</div>}

      <div className="certificate-layout">
        <aside className="certificate-sidebar">
          <h2>Society templates</h2>
          {loading ? <p>Loading templates…</p> : templates.length === 0
            ? <p>No templates yet. Create your first one.</p>
            : templates.map((template) => (
              <button
                type="button"
                key={template.templateGroupId}
                className={`certificate-template-item ${templateGroupId === template.templateGroupId ? 'selected' : ''}`}
                onClick={() => setTemplateGroupId(template.templateGroupId)}
              >
                <strong>{template.name}</strong>
                <span>v{template.version} · {template.eventName || 'All society events'}</span>
                <small className={template.isActive ? 'active' : ''}>{template.isActive ? 'Active' : 'Inactive'}</small>
              </button>
            ))}
        </aside>

        <div className="certificate-editor">
          <div className="certificate-editor-toolbar">
            <label>
              Template name
              <input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              Certificate context
              <select value={eventId} onChange={(event) => setEventId(event.target.value)}>
                <option value="">All society events</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.eventName} · {event.date}
                  </option>
                ))}
              </select>
            </label>
            <label className="certificate-upload">
              Background artwork (PNG/JPG, max 5 MB)
              <input type="file" accept="image/png,image/jpeg" onChange={handleBackgroundChange} />
            </label>
          </div>

          <div className="certificate-page-settings">
            <label>
              Orientation
              <select
                value={config.orientation}
                onChange={(event) => {
                  const orientation = event.target.value;
                  setConfig((current) => ({
                    ...current,
                    orientation,
                    width: orientation === 'landscape' ? 297 : 210,
                    height: orientation === 'landscape' ? 210 : 297,
                  }));
                }}
              >
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
              </select>
            </label>
            <label>Width (mm)<input type="number" min="100" max="1000" value={config.width} onChange={(event) => setConfig((current) => ({ ...current, width: Number(event.target.value) }))} /></label>
            <label>Height (mm)<input type="number" min="100" max="1000" value={config.height} onChange={(event) => setConfig((current) => ({ ...current, height: Number(event.target.value) }))} /></label>
            {selectedTemplate && (
              <button type="button" className="btn-outline" onClick={() => toggleActive(selectedTemplate)}>
                {selectedTemplate.isActive ? 'Deactivate' : 'Activate'}
              </button>
            )}
          </div>

          <div className="certificate-stage-wrap">
            <div
              ref={canvasRef}
              className="certificate-stage"
              style={{ aspectRatio: `${config.width} / ${config.height}` }}
              aria-label="Certificate template canvas"
            >
              {backgroundData && <img className="certificate-background" src={backgroundData} alt="" draggable="false" />}
              {!backgroundData && <div className="certificate-stage-empty">Upload a certificate background to begin</div>}
              {config.fields.map((field) => (
                <div
                  key={field.id}
                  className={`certificate-field ${selectedFieldId === field.id ? 'selected' : ''}`}
                  style={{
                    left: `${field.x * 100}%`,
                    top: `${field.y * 100}%`,
                    width: `${field.width * 100}%`,
                    height: `${field.height * 100}%`,
                    fontFamily: field.fontFamily || 'Helvetica',
                    fontSize: `${field.fontSize * 35.28 / config.width}cqw`,
                    fontWeight: field.bold ? 700 : 400,
                    fontStyle: field.italic ? 'italic' : 'normal',
                    color: field.color || '#202938',
                    textAlign: field.align || 'center',
                    whiteSpace: field.wrap ? 'normal' : 'nowrap',
                    overflow: 'hidden',
                    textOverflow: field.overflow === 'clip' ? 'ellipsis' : 'clip',
                  }}
                  onPointerDown={(event) => beginDrag(event, field)}
                  onClick={() => setSelectedFieldId(field.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${FIELD_LIBRARY.find(([type]) => type === field.type)?.[1] || field.type}, drag to move`}
                >
                  {field.type === 'verification_qr'
                    ? <QRCodeSVG value="https://clubconnect.example/verify/preview" size={72} />
                    : SAMPLE_VALUES[field.type]}
                  <span
                    className="certificate-resize-handle"
                    onPointerDown={(event) => beginDrag(event, field, 'resize')}
                    aria-label="Resize field"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="certificate-tools-grid">
            <div className="certificate-tool-card">
              <h2>Dynamic field library</h2>
              <div className="certificate-field-library">
                {FIELD_LIBRARY.map(([type, label]) => (
                  <button type="button" key={type} onClick={() => addField(type)}>＋ {label}</button>
                ))}
              </div>
            </div>
            <div className="certificate-tool-card">
              <h2>Selected field</h2>
              {!selectedField ? <p>Select a canvas field to edit it.</p> : (
                <div className="certificate-field-properties">
                  <strong>{FIELD_LIBRARY.find(([type]) => type === selectedField.type)?.[1]}</strong>
                  {selectedField.type !== 'verification_qr' && (
                    <>
                      <div className="certificate-property-row">
                        <label>Font<select value={selectedField.fontFamily} onChange={(event) => updateField(selectedField.id, { fontFamily: event.target.value })}><option>Helvetica</option><option>Times-Roman</option><option>Courier</option></select></label>
                        <label>Size (pt)<input type="number" min="6" max="96" value={selectedField.fontSize} onChange={(event) => updateField(selectedField.id, { fontSize: Number(event.target.value) })} /></label>
                        <label>Colour<input type="color" value={selectedField.color} onChange={(event) => updateField(selectedField.id, { color: event.target.value })} /></label>
                      </div>
                      <div className="certificate-property-options">
                        <label><input type="checkbox" checked={selectedField.bold} onChange={(event) => updateField(selectedField.id, { bold: event.target.checked })} /> Bold</label>
                        <label><input type="checkbox" checked={selectedField.italic} onChange={(event) => updateField(selectedField.id, { italic: event.target.checked })} /> Italic</label>
                        <label>Align<select value={selectedField.align} onChange={(event) => updateField(selectedField.id, { align: event.target.value })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
                        <label><input type="checkbox" checked={selectedField.wrap} onChange={(event) => updateField(selectedField.id, { wrap: event.target.checked })} /> Wrap text</label>
                        <label>Overflow<select value={selectedField.overflow} onChange={(event) => updateField(selectedField.id, { overflow: event.target.value })}><option value="clip">Clip</option><option value="shrink">Shrink to fit</option></select></label>
                      </div>
                    </>
                  )}
                  <button type="button" className="certificate-remove-field" onClick={removeField}>Remove field</button>
                </div>
              )}
            </div>
          </div>
          <div className="certificate-save-row">
            <p>Positions and sizes are saved as relative page coordinates. Preview uses sample student and event values.</p>
            <button type="button" className="btn-primary" onClick={save} disabled={saving || !backgroundData || !name.trim()}>
              {saving ? 'Saving…' : templateGroupId ? 'Save new version' : 'Create template'}
            </button>
          </div>
        </div>
      </div>
      <div className="certificate-helper-note">
        Templates activate independently for the whole society or a selected event. Event-specific active templates take precedence over the society default.
      </div>
    </section>
  );
}

export function CertificateManagementPage({ token }) {
  return (
    <CertificateManagementErrorBoundary>
      <CertificateManagementEditor token={token} />
    </CertificateManagementErrorBoundary>
  );
}

export function MyCertificatesPage({ token }) {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState('');

  useEffect(() => {
    let active = true;
    const loadCertificates = () => {
      listMyCertificates(token)
        .then((result) => {
          if (!active) return;
          setCertificates(result.certificates || []);
          setError('');
        })
        .catch((requestError) => {
          if (active) setError(requestError.message || 'Unable to load certificates.');
        })
        .finally(() => { if (active) setLoading(false); });
    };
    loadCertificates();
    const refreshTimer = window.setInterval(loadCertificates, 30_000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [token]);

  const download = async (certificate) => {
    setDownloadingId(certificate.id);
    setError('');
    try {
      const blob = await downloadMyCertificate(token, certificate.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${certificate.certificateId}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(downloadError.message || 'Unable to download certificate.');
    } finally {
      setDownloadingId('');
    }
  };

  return (
    <section className="certificate-page">
      <header className="certificate-page-header">
        <div>
          <p className="certificate-eyebrow">Student dashboard</p>
          <h1>My certificates</h1>
          <p>Certificates are issued after verified attendance and submitted event feedback.</p>
        </div>
      </header>
      {error && <div className="certificate-message error" role="alert">{error}</div>}
      {loading ? <p>Loading certificates…</p> : certificates.length === 0
        ? <div className="certificate-empty">No certificates have been issued yet.</div>
        : <div className="certificate-list">
          {certificates.map((certificate) => (
            <article key={certificate.id} className="certificate-list-card">
              <div>
                <h2>{certificate.eventName}</h2>
                <p>{certificate.societyName} · Event date {formatDate(certificate.eventDate)}</p>
                <p>Issued {formatDate(certificate.issuedAt)} · {certificate.certificateId}</p>
                <a href={certificate.verificationUrl} target="_blank" rel="noreferrer">Open verification page</a>
              </div>
              <div className="certificate-list-actions">
                <span className={`certificate-status ${certificate.status.toLowerCase()}`}>
                  {certificate.status === 'GENERATED' ? 'Ready' : certificate.status === 'FAILED' ? 'Retry scheduled' : 'Preparing PDF'}
                </span>
                {certificate.status === 'GENERATED' && (
                  <button type="button" className="btn-primary" disabled={downloadingId === certificate.id} onClick={() => download(certificate)}>
                    {downloadingId === certificate.id ? 'Downloading…' : 'Download PDF'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>}
    </section>
  );
}

export function CertificateVerificationPage({ token }) {
  const [verification, setVerification] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    verifyCertificate(token)
      .then((result) => { if (active) setVerification(result); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to verify certificate.'); });
    return () => { active = false; };
  }, [token]);

  return (
    <main className="certificate-verify-page">
      <div className="certificate-verify-card">
        <p className="certificate-eyebrow">ClubConnect · Certificate verification</p>
        <h1>{error ? 'Verification unavailable' : verification?.valid ? 'Valid certificate' : verification ? 'Invalid certificate' : 'Verifying certificate…'}</h1>
        {error && <div className="certificate-message error" role="alert">{error}</div>}
        {verification?.valid && (
          <dl>
            <dt>Status</dt><dd>Valid</dd>
            <dt>Certificate ID</dt><dd>{verification.certificateId}</dd>
            <dt>Event</dt><dd>{verification.eventName}</dd>
            <dt>Society</dt><dd>{verification.societyName}</dd>
            <dt>Issue date</dt><dd>{formatDate(verification.issuedAt)}</dd>
          </dl>
        )}
        {verification && !verification.valid && <p>This certificate could not be verified.</p>}
      </div>
    </main>
  );
}
