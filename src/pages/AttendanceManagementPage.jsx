import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { Download, ScanLine, Search, UserCheck, UserX } from 'lucide-react';
import {
  downloadAttendanceExport,
  getAttendanceEvents,
  getEventAttendance,
  scanAttendance,
  updateAttendance,
} from '../api/attendance.js';
import './AttendanceManagementPage.css';

const FILTERS = ['All', 'Present', 'Absent'];
const EXPORT_FORMATS = ['csv', 'xlsx', 'pdf'];

function parsePassToken(text) {
  try {
    const payload = JSON.parse(text);
    return typeof payload?.passToken === 'string' ? payload.passToken : '';
  } catch {
    return '';
  }
}

function attendanceLabel(participant) {
  if (participant.registrationStatus !== 'REGISTERED') return 'Not Applicable';
  return participant.attendanceStatus ? 'Present' : 'Absent';
}

function formatTimestamp(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

export default function AttendanceManagementPage({ token, canScan, canManage = canScan, canViewDashboard = true }) {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [attendance, setAttendance] = useState(null);
  const [activeView, setActiveView] = useState(canScan ? 'scanner' : 'dashboard');
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const busyRef = useRef(false);

  const loadAttendance = async (eventId = selectedEventId) => {
    if (!eventId) {
      setAttendance(null);
      return;
    }
    const result = await getEventAttendance(token, eventId);
    setAttendance(result);
  };

  useEffect(() => {
    let active = true;
    if (!canViewDashboard) {
      setLoading(false);
      return () => { active = false; };
    }
    getAttendanceEvents(token)
      .then((result) => {
        if (!active) return;
        setEvents(result);
        if (result.length) setSelectedEventId((current) => current || result[0].id);
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [canViewDashboard, token]);

  useEffect(() => {
    let active = true;
    if (!canViewDashboard || !selectedEventId) {
      setAttendance(null);
      return () => { active = false; };
    }
    getEventAttendance(token, selectedEventId)
      .then((result) => { if (active) setAttendance(result); })
      .catch((loadError) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [canViewDashboard, token, selectedEventId]);

  useEffect(() => {
    if (!scanning || !canScan) return undefined;
    let disposed = false;
    busyRef.current = false;
    setError('');
    const reader = new BrowserQRCodeReader();
    scannerRef.current = reader;

    reader.decodeFromVideoDevice(undefined, videoRef.current, async (result) => {
      if (!result || busyRef.current) return;
      busyRef.current = true;
      setScanning(false);
      const passToken = parsePassToken(result.getText());
      if (!passToken) {
        setError('This QR code does not contain a valid ClubConnect event pass.');
        busyRef.current = false;
        return;
      }

      setScanBusy(true);
      try {
        const response = await scanAttendance(token, passToken);
        setScanResult(response.attendance);
        setError('');
        if (selectedEventId) {
          const updated = await getEventAttendance(token, selectedEventId);
          setAttendance(updated);
        }
      } catch (scanError) {
        setError(scanError.message || 'Unable to mark attendance.');
      } finally {
        setScanBusy(false);
        busyRef.current = false;
      }
    }).then((controls) => {
      if (disposed) controls.stop();
      else scannerRef.current = controls;
    }).catch((cameraError) => {
      if (!disposed) {
        setError(cameraError.message || 'Camera access is unavailable. Check browser permissions.');
        setScanning(false);
      }
    });

    return () => {
      disposed = true;
      scannerRef.current?.stop?.();
      scannerRef.current = null;
    };
  }, [canScan, scanning, selectedEventId, token]);

  const filteredParticipants = useMemo(() => {
    const participants = attendance?.participants || [];
    const normalized = search.trim().toLowerCase();
    return participants.filter((participant) => {
      if (filter === 'Present' && !(participant.registrationStatus === 'REGISTERED' && participant.attendanceStatus)) return false;
      if (filter === 'Absent' && !(participant.registrationStatus === 'REGISTERED' && !participant.attendanceStatus)) return false;
      if (!normalized) return true;
      return participant.studentName.toLowerCase().includes(normalized)
        || participant.enrollmentNumber.toLowerCase().includes(normalized);
    });
  }, [attendance, filter, search]);

  const handleManualUpdate = async (participant, attendanceStatus) => {
    setError('');
    try {
      await updateAttendance(token, participant.attendanceId, attendanceStatus);
      await loadAttendance();
    } catch (updateError) {
      setError(updateError.message || 'Unable to update attendance.');
    }
  };

  const handleExport = async (format) => {
    if (!selectedEventId) return;
    setExporting(format);
    setError('');
    try {
      const blob = await downloadAttendanceExport(token, selectedEventId, format);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${selectedEventId}-attendance.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError.message || 'Unable to export attendance.');
    } finally {
      setExporting('');
    }
  };

  const startScanner = () => {
    setScanResult(null);
    setError('');
    setScanning(true);
  };

  return (
    <section className="attendance-management">
      <header className="attendance-page-header">
        <div>
          <h1>Attendance Management</h1>
          <p>Scan event passes and review attendance records.</p>
        </div>
        {canScan && canViewDashboard && (
          <div className="attendance-view-tabs" role="tablist" aria-label="Attendance views">
            <button type="button" className={activeView === 'scanner' ? 'active' : ''} onClick={() => setActiveView('scanner')}>
              <ScanLine size={17} /> Scanner
            </button>
            <button type="button" className={activeView === 'dashboard' ? 'active' : ''} onClick={() => setActiveView('dashboard')}>
              Attendance Dashboard
            </button>
          </div>
        )}
      </header>

      {error && <p className="attendance-message attendance-message--error" role="alert">{error}</p>}
      {scanResult && (
        <p className="attendance-message attendance-message--success" role="status">
          Present recorded for <strong>{scanResult.studentName}</strong> at {scanResult.eventName}.
        </p>
      )}

      {canScan && activeView === 'scanner' && (
        <div className="attendance-scanner-layout">
          <div className="dash-card attendance-scanner-panel">
            <h2 className="dash-card-title">Scan Event Pass</h2>
            <p className="dash-card-subtitle">Allow camera access and scan the student's active ClubConnect QR pass.</p>
            <video ref={videoRef} className="attendance-camera" muted playsInline />
            <div className="attendance-scanner-actions">
              {!scanning ? (
                <button className="btn-action-primary" type="button" onClick={startScanner} disabled={scanBusy}>
                  <ScanLine size={17} /> {scanBusy ? 'Validating…' : 'Open Scanner'}
                </button>
              ) : (
                <button className="btn-outline" type="button" onClick={() => setScanning(false)}>Stop Camera</button>
              )}
            </div>
          </div>
          <div className="dash-card attendance-scan-guidance">
            <h2 className="dash-card-title">Scan Result</h2>
            {scanBusy ? <p role="status">Validating pass with the server…</p> : scanResult ? (
              <dl>
                <div><dt>Student</dt><dd>{scanResult.studentName}</dd></div>
                <div><dt>Event</dt><dd>{scanResult.eventName}</dd></div>
                <div><dt>Venue</dt><dd>{scanResult.venue}</dd></div>
                <div><dt>Attendance</dt><dd>Present</dd></div>
                <div><dt>Marked at</dt><dd>{formatTimestamp(scanResult.attendanceTime)}</dd></div>
              </dl>
            ) : <p>Scan a student's active event pass to record attendance.</p>}
          </div>
        </div>
      )}

      {canViewDashboard && (!canScan || activeView === 'dashboard') && (
        <>
          <div className="attendance-event-picker">
            <label htmlFor="attendance-event">Event</label>
            <select id="attendance-event" value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)}>
              <option value="">Select an approved event</option>
              {events.map((event) => <option value={event.id} key={event.id}>{event.eventName} · {event.eventDate}</option>)}
            </select>
          </div>
          {loading ? <p role="status">Loading attendance events…</p> : attendance ? (
            <>
              <div className="attendance-summary-grid">
                <div className="dash-stat-box"><span className="dash-stat-label">Registered</span><strong>{attendance.registeredCount}</strong></div>
                <div className="dash-stat-box"><span className="dash-stat-label">Present</span><strong>{attendance.presentCount}</strong></div>
                <div className="dash-stat-box"><span className="dash-stat-label">Absent</span><strong>{attendance.absentCount}</strong></div>
                <div className="dash-stat-box"><span className="dash-stat-label">Attendance</span><strong>{attendance.attendancePercentage}%</strong></div>
              </div>

              <div className="dash-card attendance-participants">
                <div className="attendance-table-heading">
                  <div>
                    <h2 className="dash-card-title">{attendance.event.eventName}</h2>
                    <p className="dash-card-subtitle">{attendance.event.eventDate} · {attendance.event.venue}</p>
                  </div>
                  <div className="attendance-export-actions" aria-label="Export attendance">
                    {EXPORT_FORMATS.map((format) => (
                      <button key={format} className="btn-outline" type="button" onClick={() => handleExport(format)} disabled={Boolean(exporting)} title={`Export ${format.toUpperCase()}`}>
                        <Download size={15} /> {exporting === format ? 'Preparing…' : format.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="attendance-table-controls">
                  <div className="attendance-filter-tabs" role="group" aria-label="Filter attendance">
                    {FILTERS.map((item) => (
                      <button type="button" className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>
                    ))}
                  </div>
                  <label className="attendance-search">
                    <Search size={16} />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or enrollment" />
                  </label>
                </div>

                <div className="dash-table-wrapper">
                  <table className="dash-table attendance-table">
                    <thead><tr>
                      <th>Student Name</th><th>Enrollment Number</th><th>Branch</th><th>Section</th>
                      <th>Registration</th><th>Attendance</th><th>Attendance Time</th>
                      {canManage && <th>Manual Override</th>}
                    </tr></thead>
                    <tbody>
                      {filteredParticipants.length ? filteredParticipants.map((participant) => (
                        <tr key={participant.attendanceId}>
                          <td>{participant.studentName}</td>
                          <td>{participant.enrollmentNumber}</td>
                          <td>{participant.branch || '—'}</td>
                          <td>{participant.section || '—'}</td>
                          <td>{participant.registrationStatus}</td>
                          <td>{attendanceLabel(participant)}</td>
                          <td>{formatTimestamp(participant.attendanceTime)}</td>
                          {canManage && <td>
                            {participant.registrationStatus === 'REGISTERED' ? (
                              <div className="attendance-row-actions">
                                <button type="button" className="attendance-icon-button attendance-icon-button--present" title="Mark Present" aria-label={`Mark ${participant.studentName} present`} disabled={participant.attendanceStatus} onClick={() => handleManualUpdate(participant, true)}><UserCheck size={17} /></button>
                                <button type="button" className="attendance-icon-button attendance-icon-button--absent" title="Mark Absent" aria-label={`Mark ${participant.studentName} absent`} disabled={!participant.attendanceStatus} onClick={() => handleManualUpdate(participant, false)}><UserX size={17} /></button>
                              </div>
                            ) : '—'}
                          </td>}
                        </tr>
                      )) : <tr><td colSpan={canManage ? 8 : 7}>No participants match this filter.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : !events.length ? <div className="dash-empty-state">No approved events are available.</div> : null}
        </>
      )}
    </section>
  );
}
