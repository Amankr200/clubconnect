import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getEventPass, getMyEventPasses } from '../api/eventPasses.js';
import './EventPassesPage.css';

function passStatusLabel(status) {
  if (status === 'active') return 'QR Active';
  if (status === 'closed') return 'Attendance Window Closed';
  return 'QR Not Available Yet';
}

export default function EventPassesPage({ token }) {
  const [passes, setPasses] = useState([]);
  const [selectedRegistrationId, setSelectedRegistrationId] = useState(null);
  const [selectedPass, setSelectedPass] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingPass, setLoadingPass] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;
    getMyEventPasses(token)
      .then((result) => { if (active) setPasses(result); })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load event passes.'); })
      .finally(() => { if (active) setLoadingList(false); });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!selectedRegistrationId) return undefined;
    let active = true;
    const loadPass = async () => {
      try {
        const result = await getEventPass(token, selectedRegistrationId);
        if (active) {
          setSelectedPass(result);
          setError('');
        }
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load this event pass.');
      } finally {
        if (active) setLoadingPass(false);
      }
    };

    setLoadingPass(true);
    loadPass();
    const poll = selectedPass?.qrStatus === 'closed' ? null : window.setInterval(loadPass, 10000);
    return () => {
      active = false;
      if (poll) window.clearInterval(poll);
    };
  }, [token, selectedRegistrationId, selectedPass?.qrStatus]);

  useEffect(() => {
    if (!selectedRegistrationId) return undefined;
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(clock);
  }, [selectedRegistrationId]);

  const openPass = (registrationId) => {
    setError('');
    setSelectedPass(null);
    setSelectedRegistrationId(registrationId);
  };

  const isExpired = selectedPass?.attendanceEndTime
    ? now >= new Date(selectedPass.attendanceEndTime).getTime()
    : false;
  const isQrActive = Boolean(selectedPass?.qrActive && selectedPass.passToken && !isExpired);
  const qrStatus = isExpired ? 'closed' : selectedPass?.qrStatus;

  if (selectedRegistrationId) {
    return (
      <section className="event-passes-page">
        <button className="btn-outline" type="button" onClick={() => { setSelectedRegistrationId(null); setSelectedPass(null); setError(''); }}>
          ← My Event Passes
        </button>
        {loadingPass && !selectedPass && <p role="status">Loading event pass…</p>}
        {error && <p role="alert" className="form-error">{error}</p>}
        {selectedPass && (
          <article className="dash-card event-pass-detail">
            <div className="event-pass-heading">
              <div>
                <h2 className="dash-card-title">{selectedPass.eventName}</h2>
                <p className="dash-card-subtitle">{selectedPass.societyName}</p>
              </div>
              <span className={`event-pass-status event-pass-status--${qrStatus || 'not_started'}`}>
                {passStatusLabel(qrStatus)}
              </span>
            </div>
            <dl className="event-pass-meta">
              <div><dt>Date</dt><dd>{selectedPass.eventDate}</dd></div>
              <div><dt>Venue</dt><dd>{selectedPass.venue}</dd></div>
              <div><dt>Registration</dt><dd>{selectedPass.registrationStatus}</dd></div>
              <div><dt>QR Window</dt><dd>{selectedPass.attendanceStartTime ? new Date(selectedPass.attendanceStartTime).toLocaleString() : 'Not configured'} – {selectedPass.attendanceEndTime ? new Date(selectedPass.attendanceEndTime).toLocaleString() : 'Not configured'}</dd></div>
            </dl>
            <div className="event-pass-qr" aria-live="polite">
              {isQrActive ? (
                <QRCodeSVG
                  value={JSON.stringify({ passToken: selectedPass.passToken })}
                  size={240}
                  level="H"
                  title="Event pass QR code"
                />
              ) : (
                <p>{passStatusLabel(qrStatus)}</p>
              )}
            </div>
          </article>
        )}
      </section>
    );
  }

  return (
    <section className="event-passes-page">
      <header className="event-passes-header">
        <div>
          <h1>My Event Passes</h1>
          <p>Passes are available for active event registrations.</p>
        </div>
      </header>
      {error && <p role="alert" className="form-error">{error}</p>}
      {loadingList ? <p role="status">Loading event passes…</p> : passes.length ? (
        <div className="event-pass-list">
          {passes.map((pass) => (
            <article className="dash-card event-pass-row" key={pass.registrationId}>
              <div>
                <h2>{pass.eventName}</h2>
                <p>{pass.eventDate} · {pass.venue}</p>
              </div>
              <span className={`event-pass-status event-pass-status--${pass.qrStatus}`}>
                {passStatusLabel(pass.qrStatus)}
              </span>
              <button className="btn-action-primary" type="button" onClick={() => openPass(pass.registrationId)}>
                View Pass
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="dash-empty-state">No active RSVP registrations have event passes yet.</div>
      )}
    </section>
  );
}
