const db = require('../db');

function formatBooking(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    venueId: row.venue_id,
    date: row.date,
    timeSlots: row.time_slots || [],
    eventName: row.event_name,
    hostClub: row.host_club,
    photo: row.photo,
    photoFileName: row.photo_file_name,
    description: row.description,
    eligibility: row.eligibility,
    attendance: row.attendance,
    feedback: row.feedback,
    studentCoordinators: row.student_coordinators,
    requestedBy: row.requested_by || {},
    assignedFacultyCoordinator: row.assigned_faculty_coordinator || {},
    status: row.status,
    currentReviewerRole: row.current_reviewer_role,
    changeRequest: row.change_request || {},
    reviewTrail: row.review_trail || [],
    approvedAt: row.approved_at,
    requestedAt: row.requested_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findPublicBookings(status = 'approved') {
  const result = await db.query(
    'SELECT * FROM venue_bookings WHERE status = $1 ORDER BY date ASC, created_at DESC',
    [status]
  );
  return result.rows.map(formatBooking);
}

async function findAllActiveBookings() {
  const result = await db.query(
    `SELECT * FROM venue_bookings 
     WHERE status IN ('pending_faculty', 'pending_principal', 'approved')`
  );
  return result.rows.map(formatBooking);
}

async function findAllBookings() {
  const result = await db.query('SELECT * FROM venue_bookings ORDER BY created_at DESC');
  return result.rows.map(formatBooking);
}

async function findById(id) {
  try {
    const result = await db.query('SELECT * FROM venue_bookings WHERE id = $1', [id]);
    return formatBooking(result.rows[0]);
  } catch (err) {
    return null;
  }
}

async function createBooking(data) {
  const {
    venueId,
    date,
    timeSlots,
    eventName,
    hostClub,
    photo,
    photoFileName,
    description,
    eligibility,
    attendance,
    feedback,
    studentCoordinators,
    requestedBy,
    assignedFacultyCoordinator = {},
    status = 'pending_faculty',
    currentReviewerRole = 'faculty_coordinator',
    changeRequest = {},
    reviewTrail = [],
  } = data;

  const result = await db.query(
    `INSERT INTO venue_bookings (
      venue_id, date, time_slots, event_name, host_club, photo, photo_file_name,
      description, eligibility, attendance, feedback, student_coordinators,
      requested_by, assigned_faculty_coordinator, status, current_reviewer_role,
      change_request, review_trail
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
    ) RETURNING *`,
    [
      venueId,
      date,
      JSON.stringify(timeSlots),
      eventName,
      hostClub,
      photo,
      photoFileName,
      description,
      eligibility,
      attendance,
      feedback,
      studentCoordinators,
      JSON.stringify(requestedBy),
      JSON.stringify(assignedFacultyCoordinator),
      status,
      currentReviewerRole,
      JSON.stringify(changeRequest),
      JSON.stringify(reviewTrail),
    ]
  );

  return formatBooking(result.rows[0]);
}

async function updateBooking(id, fields) {
  const setClauses = [];
  const values = [];
  let index = 1;

  const map = {
    venueId: 'venue_id',
    date: 'date',
    timeSlots: 'time_slots',
    eventName: 'event_name',
    hostClub: 'host_club',
    photo: 'photo',
    photoFileName: 'photo_file_name',
    description: 'description',
    eligibility: 'eligibility',
    attendance: 'attendance',
    feedback: 'feedback',
    studentCoordinators: 'student_coordinators',
    requestedBy: 'requested_by',
    assignedFacultyCoordinator: 'assigned_faculty_coordinator',
    status: 'status',
    currentReviewerRole: 'current_reviewer_role',
    changeRequest: 'change_request',
    reviewTrail: 'review_trail',
    approvedAt: 'approved_at',
  };

  for (const [key, val] of Object.entries(fields)) {
    if (map[key]) {
      const col = map[key];
      const isJson = ['time_slots', 'requested_by', 'assigned_faculty_coordinator', 'change_request', 'review_trail'].includes(col);
      setClauses.push(`${col} = $${index}`);
      values.push(isJson ? JSON.stringify(val) : val);
      index++;
    }
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const queryText = `
    UPDATE venue_bookings
    SET ${setClauses.join(', ')}
    WHERE id = $${index}
    RETURNING *
  `;

  const result = await db.query(queryText, values);
  return formatBooking(result.rows[0]);
}

async function deleteBooking(id) {
  const result = await db.query('DELETE FROM venue_bookings WHERE id = $1 RETURNING *', [id]);
  return formatBooking(result.rows[0]);
}

module.exports = {
  findPublicBookings,
  findAllActiveBookings,
  findAllBookings,
  findById,
  createBooking,
  updateBooking,
  deleteBooking,
};
