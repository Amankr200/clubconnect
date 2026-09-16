require('dotenv').config();
const db = require('./db');
const { sendEventCreatedNotifications } = require('./notifications/notifications');

async function test() {
  try {
    console.log("Testing getRecipients query...");
    const result = await db.query(
      `
      SELECT
        s.name AS student_name,
        s.college_email_id,
        society.name AS society_name,
        society.category AS society_category
      FROM stud_club sc
      JOIN students s
        ON sc.stud_id = s.enrollment_id
      JOIN societies society
        ON sc.club_id = society.id
      WHERE sc.club_id = $1
      ORDER BY s.enrollment_id
      `,
      [23],
    );
    console.log("Recipients for club 23:", result.rows);

    const dummyEvent = {
      hostClub: 23,
      venueId: 1,
      eventName: 'Test Notification Event',
      date: '2026-09-20',
      description: 'This is a test event for notifications.',
    };

    console.log("Testing sendEventCreatedNotifications...");
    const notifResult = await sendEventCreatedNotifications(dummyEvent);
    console.log("Notification Result:", notifResult);

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    process.exit(0);
  }
}

test();
