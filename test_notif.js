const db = require('./backend/db');
const { sendEventCreatedNotifications } = require('./backend/notifications/notifications');

async function test() {
  try {
    // 1. Test the database query
    console.log("Testing getRecipients query...");
    // Let's test with club_id = 23 (which has students in the screenshot)
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

    // 2. Test sendEventCreatedNotifications function directly
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
