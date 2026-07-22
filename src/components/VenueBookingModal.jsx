import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { venues } from "../data/venues.js";
import {
  generateTimeSlots,
  convertTo12HourFormat,
} from "../utils/timeSlots.js";
import {
  createVenueBooking,
  getVenueAvailability,
  resubmitVenueBooking,
} from "../api/venueBookings.js";
import "./VenueBookingModal.css";
import { CheckCircle, AlertCircle, X } from "lucide-react";

export default function VenueBookingModal({
  isOpen,
  onClose,
  onBookingSuccess,
  token,
  booking,
}) {
  const { token: authToken } = useAuth();
  const activeToken = token || authToken;
  const [selectedVenue, setSelectedVenue] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [eventName, setEventName] = useState("");
  const [hostClub, setHostClub] = useState("");
  const [photo, setPhoto] = useState("");
  const [photoFileName, setPhotoFileName] = useState("");
  const [description, setDescription] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [attendance, setAttendance] = useState("");
  const [feedback, setFeedback] = useState("");
  const [studentCoordinators, setStudentCoordinators] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [existingBookings, setExistingBookings] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const allTimeSlots = useMemo(() => generateTimeSlots(), []);
  const isEditing = Boolean(booking?.id);

  const venueDetails = selectedVenue
    ? venues.find((venue) => venue.id === parseInt(selectedVenue, 10))
    : null;

  const bookedSlots = useMemo(
    () => existingBookings.flatMap((item) => item.timeSlots || []),
    [existingBookings],
  );

  const availableSlots = useMemo(() => {
    if (!selectedVenue || !selectedDate) return [];

    return allTimeSlots.filter(
      (slot) =>
        !bookedSlots.some(
          (bookedSlot) =>
            bookedSlot.startTime < slot.endTime &&
            bookedSlot.endTime > slot.startTime,
        ),
    );
  }, [selectedVenue, selectedDate, allTimeSlots, bookedSlots]);

  const getMinDate = () => new Date().toISOString().split("T")[0];

  const toggleSlotSelection = (startTime) => {
    setSelectedSlots((prev) =>
      prev.includes(startTime)
        ? prev.filter((slot) => slot !== startTime)
        : [...prev, startTime].sort(),
    );
    setBookingError("");
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPhoto("");
      setPhotoFileName("");
      setBookingError("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(String(reader.result || ""));
      setPhotoFileName(file.name);
      setBookingError("");
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!isOpen) return;

    setSelectedVenue(booking?.venueId ? String(booking.venueId) : "");
    setSelectedDate(booking?.date || "");
    setSelectedSlots(booking?.timeSlots?.map((slot) => slot.startTime) || []);
    setEventName(booking?.eventName || "");
    setHostClub(booking?.hostClub || "");
    setPhoto(booking?.photo || "");
    setPhotoFileName(booking?.photoFileName || "");
    setDescription(booking?.description || "");
    setEligibility(booking?.eligibility || "");
    setAttendance(booking?.attendance || "");
    setFeedback(booking?.feedback || "");
    setStudentCoordinators(booking?.studentCoordinators || "");
    setBookingError("");
    setBookingSuccess("");
    setExistingBookings([]);
  }, [booking, isOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      if (!selectedVenue || !selectedDate) {
        setExistingBookings([]);
        return;
      }

      setLoadingAvailability(true);
      try {
        const data = await getVenueAvailability(selectedVenue, selectedDate);
        if (!cancelled) {
          setExistingBookings(data.bookings || []);
        }
      } catch {
        if (!cancelled) {
          setExistingBookings([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingAvailability(false);
        }
      }
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [selectedVenue, selectedDate]);

  const areSlotConsecutive = (slots) => {
    if (slots.length <= 1) return true;

    const sortedSlots = [...slots].sort();
    for (let i = 0; i < sortedSlots.length - 1; i += 1) {
      const currentSlot = allTimeSlots.find(
        (slot) => slot.startTime === sortedSlots[i],
      );
      const nextSlot = allTimeSlots.find(
        (slot) => slot.startTime === sortedSlots[i + 1],
      );
      if (
        !currentSlot ||
        !nextSlot ||
        currentSlot.endTime !== nextSlot.startTime
      ) {
        return false;
      }
    }

    return true;
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    setBookingError("");
    setBookingSuccess("");

    if (
      !selectedVenue ||
      !selectedDate ||
      selectedSlots.length === 0 ||
      !eventName ||
      !hostClub ||
      !photo ||
      !description ||
      !eligibility ||
      !attendance ||
      !feedback ||
      !studentCoordinators
    ) {
      setBookingError(
        "Please complete every required field, including the photo upload and event details.",
      );
      return;
    }

    if (!areSlotConsecutive(selectedSlots)) {
      setBookingError("Selected time slots must be consecutive");
      return;
    }

    if (!activeToken && !isEditing) {
      setBookingError(
        "Please sign in as a student coordinator to request a venue.",
      );
      return;
    }

    try {
      const slotsData = allTimeSlots.filter((slot) =>
        selectedSlots.includes(slot.startTime),
      );
      const firstSlot = slotsData[0];
      const lastSlot = slotsData[slotsData.length - 1];
      const payload = {
        venueId: parseInt(selectedVenue, 10),
        date: selectedDate,
        timeSlots: slotsData.map((slot) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
        eventName,
        hostClub,
        photo,
        photoFileName,
        description,
        eligibility,
        attendance,
        feedback,
        studentCoordinators,
      };

      const result = isEditing
        ? await resubmitVenueBooking(activeToken, booking.id, payload)
        : await createVenueBooking(activeToken, payload);

      const durationMins = selectedSlots.length * 50;
      const durationHours = Math.floor(durationMins / 60);
      const durationRemainingMins = durationMins % 60;
      const durationStr =
        durationHours > 0
          ? `${durationHours}h ${durationRemainingMins}m`
          : `${durationMins}m`;

      setBookingSuccess(
        `✓ Event "${eventName}" has been ${isEditing ? "resubmitted" : "sent for approval"} at ${venueDetails?.name || "selected venue"} on ${selectedDate} from ${convertTo12HourFormat(firstSlot.startTime)} to ${convertTo12HourFormat(lastSlot.endTime)} (${durationStr})`,
      );

      if (onBookingSuccess) {
        onBookingSuccess(result.booking);
      }

      setTimeout(() => {
        onClose();
        setBookingSuccess("");
      }, 2000);
    } catch (error) {
      setBookingError(
        error.message || "Failed to create booking. Please try again.",
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="booking-modal-overlay" onClick={onClose}>
      <div
        className="booking-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="booking-modal-header">
          <h2>{isEditing ? "Revise Venue Request" : "Book a Venue"}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {bookingSuccess && (
          <div className="success-message">
            <CheckCircle
              size={18}
              style={{ display: "inline-block", marginRight: "8px" }}
            />
            {bookingSuccess}
          </div>
        )}

        {bookingError && (
          <div className="error-message">
            <AlertCircle
              size={18}
              style={{ display: "inline-block", marginRight: "8px" }}
            />
            {bookingError}
          </div>
        )}

        <div className="booking-form-group">
          <label htmlFor="hostClub">Host Club/Organization *</label>
          <input
            id="hostClub"
            type="text"
            placeholder="e.g., #DEFINE, IEEE, WIE"
            value={hostClub}
            onChange={(event) => setHostClub(event.target.value)}
            maxLength={50}
          />
        </div>

        <div className="booking-form-group">
          <label htmlFor="eventName">Event Name *</label>
          <input
            id="eventName"
            type="text"
            placeholder="e.g., Tech Talk on AI, Workshop: DSA Basics"
            value={eventName}
            onChange={(event) => setEventName(event.target.value)}
            maxLength={100}
          />
        </div>

        <div className="booking-form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            placeholder="Provide a detailed description of the event"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            rows={5}
          />
        </div>

        <div className="booking-form-group">
          <label htmlFor="date">Select Date *</label>
          <input
            id="date"
            type="date"
            value={selectedDate}
            onChange={(event) => {
              setSelectedDate(event.target.value);
              setSelectedSlots([]);
              setBookingError("");
            }}
            min={getMinDate()}
          />
        </div>

        <form onSubmit={handleBooking}>
          <div className="booking-form-group">
            <label htmlFor="venue">Select Venue *</label>
            <select
              id="venue"
              value={selectedVenue}
              onChange={(event) => {
                setSelectedVenue(event.target.value);
                setSelectedSlots([]);
                setBookingError("");
              }}
            >
              <option value="">-- Choose a venue --</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name} (Capacity: {venue.capacity})
                </option>
              ))}
            </select>
          </div>

          <div className="booking-form-group">
            <label htmlFor="photo">Photo Upload *</label>
            <input
              id="photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
            />
            {photo && (
              <div className="photo-preview-card">
                <img
                  src={photo}
                  alt={
                    photoFileName
                      ? `Uploaded preview of ${photoFileName}`
                      : "Uploaded preview"
                  }
                  className="photo-preview"
                />
                {photoFileName && (
                  <div className="photo-file-name">{photoFileName}</div>
                )}
              </div>
            )}
          </div>

          {venueDetails && (
            <div className="venue-details-card">
              <h3>{venueDetails.name}</h3>
              <div className="venue-info-grid">
                <div className="venue-info-item">
                  <strong>Capacity</strong>
                  <span>{venueDetails.capacity} persons</span>
                </div>
                <div className="venue-info-item">
                  <strong>Location</strong>
                  <span>{venueDetails.location}</span>
                </div>
                <div className="venue-info-item">
                  <strong>Contact Person</strong>
                  <span>{venueDetails.contactPerson}</span>
                </div>
                <div className="venue-info-item">
                  <strong>Phone</strong>
                  <span>{venueDetails.contactPhone}</span>
                </div>
              </div>
              <div className="venue-facilities">
                <strong style={{ display: "block", marginBottom: "8px" }}>
                  Facilities:
                </strong>
                <div className="venue-facilities-list">
                  {venueDetails.facilities.map((facility, index) => (
                    <span key={index} className="facility-badge">
                      {facility}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedDate && selectedVenue && (
            <>
              <div className="time-slots-info">
                <p>
                  <strong>
                    📌 Select one or more consecutive time slots (50 min each)
                  </strong>
                </p>
                {loadingAvailability && (
                  <p>Checking current booking requests...</p>
                )}
              </div>

              <div className="available-slots">
                <h4>✓ Available Time Slots</h4>
                <div className="slots-grid">
                  {availableSlots.length > 0 ? (
                    availableSlots.map((slot, index) => (
                      <div
                        key={index}
                        className={`slot-badge ${selectedSlots.includes(slot.startTime) ? "selected" : ""}`}
                        onClick={() => toggleSlotSelection(slot.startTime)}
                        style={{ cursor: "pointer" }}
                      >
                        {convertTo12HourFormat(slot.startTime)}
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#6b7280", fontSize: "13px" }}>
                      No available slots for this date
                    </div>
                  )}
                </div>
              </div>

              {selectedSlots.length > 0 && (
                <div className="selected-slots-summary">
                  <h4>📋 Selected Slots</h4>
                  <div className="selected-slots-list">
                    {selectedSlots.map((startTime, index) => {
                      const slot = allTimeSlots.find(
                        (item) => item.startTime === startTime,
                      );
                      if (!slot) return null;

                      return (
                        <div key={index} className="selected-slot-item">
                          <span>
                            {convertTo12HourFormat(slot.startTime)} -{" "}
                            {convertTo12HourFormat(slot.endTime)}
                          </span>
                          <button
                            type="button"
                            className="remove-slot-btn"
                            onClick={() => toggleSlotSelection(startTime)}
                            title="Remove this slot"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="slots-duration">
                    Total Duration:{" "}
                    <strong>{selectedSlots.length * 50} minutes</strong>
                  </div>
                </div>
              )}

              {bookedSlots.length > 0 && (
                <div className="booked-slots">
                  <h4>✗ Booked Time Slots</h4>
                  {bookedSlots.map((slot, index) => (
                    <div key={index} className="booking-item">
                      <div className="time">
                        {convertTo12HourFormat(slot.startTime)} -{" "}
                        {convertTo12HourFormat(slot.endTime)}
                      </div>
                      <div className="event">
                        {slot.eventName} by {slot.hostClub}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="booking-form-group">
            <label htmlFor="eligibility">Eligibility *</label>
            <input
              id="eligibility"
              type="text"
              placeholder="Who can attend this event?"
              value={eligibility}
              onChange={(event) => setEligibility(event.target.value)}
              required
              maxLength={120}
            />
          </div>

          <div className="booking-form-group">
            <label htmlFor="studentCoordinators">Student Coordinators *</label>
            <textarea
              id="studentCoordinators"
              type="text"
              placeholder="Names of student coordinators"
              value={studentCoordinators}
              onChange={(event) => setStudentCoordinators(event.target.value)}
              required
              maxLength={120}
            />
          </div>

          <div className="booking-form-group">
            <label htmlFor="attendance">Attendance *</label>
            <input
              id="attendance"
              type="text"
              placeholder="Expected attendance count or range"
              value={attendance}
              onChange={(event) => setAttendance(event.target.value)}
              required
              maxLength={80}
            />
          </div>

          <div className="booking-form-group">
            <label htmlFor="feedback">Feedback *</label>
            <input
              id="feedback"
              type="text"
              placeholder="Any feedback or remarks"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              required
              maxLength={120}
            />
          </div>

          <div className="booking-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!activeToken && !isEditing}
            >
              {isEditing ? "Resubmit Request" : "Request Approval"}
            </button>
          </div>

          {!activeToken && !isEditing && (
            <div className="booking-note">
              Student coordinators must be signed in to submit venue requests.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
