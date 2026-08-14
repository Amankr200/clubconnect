import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { venues } from "../data/venues.js";
import {
  createVenueBooking,
  resubmitVenueBooking,
} from "../api/venueBookings.js";
import "./VenueBookingModal.css";
import { CheckCircle, AlertCircle, X } from "lucide-react";

/*
const createEmptyScheduleEntry = () => ({
  date: "",
  startTime: "",
  endTime: "",
});
*/

export default function VenueBookingModal({
  isOpen,
  onClose,
  onBookingSuccess,
  token,
  booking,
}) {
  const MAX_PHOTO_SIZE_MB = 5;
  const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;

  const { token: authToken } = useAuth();
  const activeToken = token || authToken;
  const [selectedVenue, setSelectedVenue] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStartTime, setSelectedStartTime] = useState("");
  const [selectedEndTime, setSelectedEndTime] = useState("");
  // const [scheduleEntries, setScheduleEntries] = useState([createEmptyScheduleEntry()]);
  const [eventName, setEventName] = useState("");
  const [clubs, setClubs] = useState([]);
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
  const isEditing = Boolean(booking?.id);

  const venueDetails = selectedVenue
    ? venues.find((venue) => venue.id === parseInt(selectedVenue, 10))
    : null;

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getMinDate = () => getTodayDate();

  /*
  const updateScheduleEntry = (index, field, value) => {
    setScheduleEntries((prev) =>
      prev.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry,
      ),
    );
    setBookingError("");
  };

  const addScheduleEntry = () => {
    setScheduleEntries((prev) => [...prev, createEmptyScheduleEntry()]);
    setBookingError("");
  };

  const removeScheduleEntry = (index) => {
    setScheduleEntries((prev) => {
      const next = prev.filter((_, entryIndex) => entryIndex !== index);
      return next.length > 0 ? next : [createEmptyScheduleEntry()];
    });
    setBookingError("");
  };
  */

  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPhoto("");
      setPhotoFileName("");
      setBookingError("");
      return;
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setPhoto("");
      setPhotoFileName("");
      setBookingError(
        `Photo must be ${MAX_PHOTO_SIZE_MB} MB or smaller. Please choose a smaller image.`,
      );
      event.target.value = "";
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
    /*
    setScheduleEntries(
      booking?.timeSlots?.length
        ? booking.timeSlots.map((slot) => ({
            date: slot.date || booking?.date || "",
            startTime: slot.startTime || "",
            endTime: slot.endTime || "",
          }))
        : [createEmptyScheduleEntry()],
    );
    */
    setSelectedDate(booking?.date || "");
    setSelectedStartTime(booking?.timeSlots?.[0]?.startTime || "");
    setSelectedEndTime(booking?.timeSlots?.[0]?.endTime || "");
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
  }, [booking, isOpen]);
  
  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const response = await fetch("  /api/societies");

        if (!response.ok) {
          throw new Error("Failed to fetch clubs");
        }

        const data = await response.json();
        if (!Array.isArray(data.societies)) {
          throw new Error("Expected an array of clubs");
        }
        setClubs(data.societies);
      } catch (error) {
        console.error("Error fetching clubs:", error);
        setClubs([]);
      }
    };

    fetchClubs();
  }, []);

  const handleBooking = async (e) => {
    e.preventDefault();
    setBookingError("");
    setBookingSuccess("");

    if (
      !selectedVenue ||
      !selectedDate ||
      !selectedStartTime ||
      !selectedEndTime ||
      !eventName ||
      !hostClub ||
      !description ||
      !eligibility ||
      !attendance ||
      !feedback ||
      !studentCoordinators
    ) {
      setBookingError(
        "Please complete every required field and event detail.",
      );
      return;
    }

    /*
    const normalizedSchedule = scheduleEntries
      .map((entry) => ({
        date: String(entry.date || "").trim(),
        startTime: String(entry.startTime || "").trim(),
        endTime: String(entry.endTime || "").trim(),
      }))
      .filter((entry) => entry.date || entry.startTime || entry.endTime);

    if (normalizedSchedule.length === 0) {
      setBookingError("Please add at least one date with start and end time.");
      return;
    }

    if (normalizedSchedule.some((entry) => !entry.date || !entry.startTime || !entry.endTime)) {
      setBookingError("Please complete the date, start time, and end time for every entry.");
      return;
    }

    if (normalizedSchedule.some((entry) => entry.date < getMinDate())) {
      setBookingError("Please select today or a future date.");
      return;
    }

    if (normalizedSchedule.some((entry) => entry.endTime <= entry.startTime)) {
      setBookingError("End time must be later than start time for every date.");
      return;
    }
    */

    if (selectedDate < getMinDate()) {
      setBookingError("Please select today or a future date.");
      return;
    }

    if (selectedEndTime < selectedStartTime) {
      setBookingError("End time must be later than start time.");
      return;
    }

    if (!activeToken && !isEditing) {
      setBookingError(
        "Please sign in as a student coordinator to request a venue.",
      );
      return;
    }

    try {
      /*
      const sortedSchedule = [...normalizedSchedule].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });
      const firstEntry = sortedSchedule[0];
      */
      const timeSlots = [
        {
          startTime: selectedStartTime,
          endTime: selectedEndTime,
        },
      ];
      const payload = {
        venueId: parseInt(selectedVenue, 10),
        date: selectedDate,
        timeSlots,
        eventName,
        hostClub: parseInt(hostClub, 10),
        photo,
        photoFileName,
        description,
        eligibility,
        attendance,
        feedback,
        studentCoordinators,
      };

      console.log("BOOKING PAYLOAD:", payload);

      const result = isEditing
        ? await resubmitVenueBooking(activeToken, booking.id, payload)
        : await createVenueBooking(activeToken, payload);

      const [startHour, startMinute] = selectedStartTime.split(":").map(Number);
      const [endHour, endMinute] = selectedEndTime.split(":").map(Number);

      const startTotal = startHour * 60 + startMinute;
      const endTotal = endHour * 60 + endMinute;

      const durationMins = endTotal - startTotal;
      const durationHours = Math.floor(durationMins / 60);
      const durationRemainingMins = durationMins % 60;
      const durationStr = durationHours > 0
        ? `${durationHours}h ${durationRemainingMins}m`
        : `${durationMins}m`;

      setBookingSuccess(
        `✓ Event "${eventName}" has been ${
          isEditing ? "resubmitted" : "sent for approval"
        } at ${venueDetails?.name || "selected venue"} on ${selectedDate} (${durationStr})`,
      );

      if (onBookingSuccess) {
        onBookingSuccess(result.booking);
      }

      setTimeout(() => {
        onClose();
        setBookingSuccess("");
      }, 2000);
    } catch (error) {
      if (String(error.message || "").includes("overlaps with another event")) {
        setBookingError("event overlaps with another event");
        return;
      }

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

        {isEditing && (booking?.changeRequest?.notes || booking?.status === "revision_requested") && (
          <div
            style={{
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid #f59e0b",
              borderRadius: "12px",
              padding: "12px 16px",
              marginBottom: "20px",
              color: "var(--text-dark)",
            }}
          >
            <strong style={{ color: "#d97706", display: "block", marginBottom: "4px" }}>
              ⚠️ Revision Requested {booking?.changeRequest?.fromRole ? `by ${booking.changeRequest.fromRole.replace("_", " ").toUpperCase()}` : ""}
            </strong>
            <span style={{ fontSize: "0.9rem", lineHeight: "1.4" }}>
              {booking?.changeRequest?.notes || "Please review and modify the event details below before resubmitting your request."}
            </span>
          </div>
        )}

        <div className="booking-form-group">
          <label htmlFor="hostClub">Host Club/Organization *</label>

          <select
            id="hostClub"
            value={hostClub}
            onChange={(event) => setHostClub(event.target.value)}
          >
            <option value="">Select a club</option>

            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
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

        <form onSubmit={handleBooking}>
          <div className="booking-form-group">
            <label htmlFor="venue">Select Venue *</label>
            <select
              id="venue"
              value={selectedVenue}
              onChange={(event) => {
                setSelectedVenue(event.target.value);
                setBookingError("");
              }}
            >
              <option value="">-- Choose a venue --</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </div>

          <div className="booking-form-group booking-schedule-group">
            <div className="booking-schedule-header">
              <div>
                <label>Booking Schedule *</label>
              </div>
              {/* <button type="button" className="add-date-btn" onClick={addScheduleEntry}>
                + Add date
              </button> */}
            </div>

            <div className="booking-schedule-list">
                <div className="booking-schedule-card">
                  <div className="booking-schedule-grid">
                    <div className="schedule-field">
                      <label htmlFor="booking-date">Date *</label>
                      <input
                        id="booking-date"
                        type="date"
                        value={selectedDate}
                        min={getMinDate()}
                        onChange={(event) => setSelectedDate(event.target.value)}
                      />
                    </div>
                    <div className="schedule-field">
                      <label htmlFor="booking-start-time">Start time *</label>
                      <input
                        id="booking-start-time"
                        type="time"
                        step="300"
                        value={selectedStartTime}
                        onChange={(event) => setSelectedStartTime(event.target.value)}
                      />
                    </div>
                    <div className="schedule-field">
                      <label htmlFor="booking-end-time">End time *</label>
                      <input
                        id="booking-end-time"
                        type="time"
                        step="300"
                        value={selectedEndTime}
                        onChange={(event) => setSelectedEndTime(event.target.value)}
                      />
                    </div>
                  </div>

                  {/*
                  {scheduleEntries.length > 1 && (
                    <button
                      type="button"
                      className="remove-date-btn"
                      onClick={() => removeScheduleEntry(index)}
                    >
                      Remove date
                    </button>
                  )}
                  */}
                </div>
            </div>

            <div className="booking-schedule-footnote">
              Overlapping times will be blocked when you submit the request.
            </div>
          </div>

          <div className="booking-form-group">
            <label htmlFor="photo">Poster Upload</label>
            <input
              id="photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
            />
            <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>
              Max photo size: {MAX_PHOTO_SIZE_MB} MB
            </div>
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
                {/*
                <div className="venue-info-item">
                  <strong>Capacity</strong>
                  <span>{venueDetails.capacity} persons</span>
                </div>
                */}
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
            <label htmlFor="attendance">Registration Link *</label>
            <input
              id="attendance"
              type="text"
              placeholder="Link to registration form"
              value={attendance}
              onChange={(event) => setAttendance(event.target.value)}
              required
              maxLength={80}
            />
          </div>

          <div className="booking-form-group">
            <label htmlFor="feedback">Feedback Link*</label>
            <input
              id="feedback"
              type="text"
              placeholder="Link to feedback form"
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
