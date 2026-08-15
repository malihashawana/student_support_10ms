# Support Connect Hub

Student Support Hub – Full Application Build Prompt

Build a complete, functional web application called Student Support Hub – HSC 28.

The application is a centralized student issue reporting, tracking, and resolution platform. Students can log in using their registered contact information, submit problems, search previously reported problems, view responses and resolutions, and track their own tickets.

The internal support team has a separate admin login and dashboard where they can upload the student database, view all submitted issues in a spreadsheet-like interface, filter and search issues, respond to students, update issue status, and export the data.

The application should be production-ready in structure but initially use the provided demo credentials and local/mock data where necessary.

---

## Local Development Setup

To run this project locally you need your own Supabase backend, because the service-role key and database password used by Lovable Cloud are not retrievable from the platform.

1. Create a free Supabase project at https://supabase.com.
2. Copy `supabase/migrations/` SQL files and run them in your project's SQL Editor (or use the Supabase CLI).
3. Copy `.env.example` to `.env` and fill in the values from your own Supabase project settings:
   - `SUPABASE_URL` / `VITE_SUPABASE_URL` — Project Settings → API → Project URL
   - `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` — Project Settings → API → Project API keys → `anon public`
   - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API → Project API keys → `service role` (keep this secret)
   - `SESSION_SECRET` — generate locally with `openssl rand -hex 32`
4. Install dependencies: `bun install` (or `npm install`)
5. Start the dev server: `bun dev` (or `npm run dev`)

Inside Lovable and on the published site these values are injected automatically, so no manual `.env` is required there.

---

1. Overall Goal

The platform should create one central place where HSC 28 students can:

* Report problems
* Track their own problems
* Search problems already reported by other students
* See whether an issue has already been solved
* View official responses
* Upload screenshots or supporting files
* Provide additional information if needed

The support team should be able to:

* Import the student database through CSV
* Verify students using their registered contact/login number
* See all submitted tickets
* Search and filter tickets
* View ticket details
* Respond to students
* Change ticket status
* View attachments
* Export ticket data as CSV
* Monitor unresolved and resolved issues
* Maintain a central issue database

The system should have a clean, modern, education-focused dashboard suitable for an HSC 28 student support platform.

---

2. Two Separate User Experiences

There should be two primary access types:

A. Student

Students log in using their registered contact/login number.

B. Support Team / Admin

Support team members log in using:

Username:

TENMS

Password:

tenten10

This is only the initial/demo credential.

The authentication system should be structured so that the credentials can later be changed or replaced with proper user accounts.

Do not expose the admin credentials anywhere in the student interface.

---

3. Landing/Login Page

Create a clean login page with two options:

Student Login

Fields:

* Contact / Login Number
* Continue / Login button

The system checks whether the entered number exists in the imported student database.

If the number exists:

* Authenticate the student
* Load their student profile
* Allow them to access their dashboard

If the number does not exist:

Show:

"Your contact number was not found in the registered student list. Please contact the support team."

Do not allow an unregistered student to create an account freely.

---

Support Team Login

Separate button:

"Support Team Login"

Fields:

* Username
* Password

Initial credentials:

Username: TENMS

Password: tenten10

After successful login, redirect to the Support Team Dashboard.

---

4. Student Dashboard

After login, students should see a dashboard containing:

Header

* Student Support Hub
* HSC 28
* Student name
* Login/contact number
* Profile/logout button

Main Dashboard Sections

1. Report a Problem

Large primary button:

"Report a Problem"

Students can submit a new support ticket.

Problem categories:

* Sound
* Video
* Exam
* Recorded Lecture
* Live Class
* App / Website
* Payment / Subscription
* Study Material
* Account / Login
* Other

Do NOT ask students to select which internal team should solve the problem.

The support team will internally determine how to handle each issue.

---

5. Student Ticket Submission Form

Fields:

Problem Category

Dropdown using the categories above.

Problem Title

Short title.

Example:

"Physics class audio is not working"

Problem Description

Large text area.

Prompt:

"Please describe your problem clearly."

Related Course / Subject

Optional dropdown.

Related Class / Exam

Optional field.

Attachment

Allow students to upload:

* Images
* Screenshots
* PDFs
* Small audio files
* Small video files

Also allow:

* YouTube/video link
* Google Drive link
* Other relevant URL

Validate file size and supported formats.

Submit Button

"Submit Problem"

After submission, generate a unique ticket ID.

Example:

HSC28-000123

Show a confirmation screen:

"Your problem has been submitted successfully."

Display:

* Ticket ID
* Category
* Status
* Submission time

---

6. Ticket Status

Tickets should have these statuses:

Open

Newly submitted issue.

In Review

Support team is currently checking the issue.

Waiting for Information

More information is required from the student.

Resolved

The issue has been solved and an official response has been provided.

Closed

The issue is completed and no further action is required.

Students should be able to see their own ticket status.

---

7. Student "My Issues" Page

Create a page called:

"My Issues"

Show the student's tickets in a clean table/card format.

Columns:

* Ticket ID
* Problem
* Category
* Date
* Status
* Last Updated

Students can click any ticket to open the complete ticket.

The student should ONLY be able to modify/view their private information and their own ticket details.

---

8. Public Student Issue Board

Create another important section:

"Community Issues"

This is a searchable central issue board.

Students can see problems submitted by other students.

This allows students to discover:

"I am having the same problem."

Each issue should display:

* Ticket ID
* Problem title
* Category
* Short description
* Status
* Date reported
* Official response, if resolved

Do NOT display:

* Student phone number
* Student login number
* Email
* Private personal information
* Internal staff notes

Student identity should remain private.

---

9. Search

The Community Issues page must have a prominent search bar.

Students should be able to search by:

* Problem title
* Keywords
* Category
* Course
* Subject
* Ticket ID

Example:

Student searches:

"physics audio"

and sees previously reported sound/audio problems related to Physics.

This should help reduce duplicate tickets.

---

10. Community Issue Detail

When a student opens a public issue, show:

Problem

"Physics lecture audio is not working"

Category

Sound

Description

Student's publicly safe problem description.

Status

Resolved

Official Response

"Audio issue has been fixed. Please refresh the lecture page."

Resolution Date

Date/time.

Do not reveal the student's identity.

---

11. Student Dashboard Statistics

At the top of the student dashboard, show simple statistics:

* My Open Issues
* My Resolved Issues
* Total Issues Submitted

Also show a small notice board.

---

12. Notice Board

Create a notice board section on the dashboard.

Support team can publish notices such as:

* Known platform issues
* Scheduled maintenance
* Exam-related announcements
* Lecture recording updates
* Important support announcements

Students can read these notices from their dashboard.

---

13. Support Team Dashboard

The admin/support team dashboard is completely different from the student dashboard.

After logging in with:

TENMS / tenten10

show:

Dashboard Overview

Cards:

* Total Tickets
* Open
* In Review
* Waiting for Information
* Resolved
* Closed

Also show:

* Today's tickets
* Recently updated tickets
* Most common problem categories

---

14. Student Database Upload

This is extremely important.

The support team must have a clearly visible section called:

Student Database

There should be a prominent button:

"Upload Student CSV"

The support team can upload a CSV file containing registered student information.

Example CSV:

```csv
name,contact_number,student_id,email
Rahim,017XXXXXXXX,10001,rahim@example.com
Karim,018XXXXXXXX,10002,karim@example.com
```

The system should:

1. Accept CSV
2. Parse the file
3. Validate columns
4. Show preview before importing
5. Show number of valid records
6. Show duplicate records
7. Show invalid records
8. Allow confirmation
9. Import/update the student database

Do not delete existing students automatically unless explicitly requested.

Use contact/login number as the primary student authentication identifier.

---

15. Student Database Table

After importing the CSV, show the data in a spreadsheet-like interface.

Columns:

* Name
* Contact Number
* Student ID
* Email
* Status
* Date Added

Features:

* Search
* Sort
* Filter
* Pagination
* Edit
* Delete
* Export CSV

The interface should visually resemble a clean spreadsheet.

---

16. Support Team Ticket Workspace

The main support workspace should also use a spreadsheet-like table.

This is the central operational interface.

Columns:

* Ticket ID
* Student Name
* Contact/Login Number
* Category
* Problem Title
* Course/Subject
* Status
* Submitted Date
* Last Updated
* Assigned/Handled By
* Response Status

The internal team should be able to filter tickets themselves.

IMPORTANT:

Do NOT create a required "Which Team" field for students.

There should be NO student-facing team selection.

The support team can simply filter based on:

* Sound
* Video
* Exam
* Recorded Lecture
* Live Class
* App / Website
* Payment / Subscription
* Study Material
* Account / Login
* Other

Different internal teams can independently visit the dashboard and filter the categories relevant to them.

---

17. Ticket Filters

Support team should be able to filter by:

Status

* Open
* In Review
* Waiting for Information
* Resolved
* Closed

Category

All available problem categories.

Date

* Today
* Yesterday
* Last 7 days
* Last 30 days
* Custom range

Course

Filter by course/subject.

Search

Search:

* Ticket ID
* Student name
* Contact number
* Problem title
* Description
* Keywords

---

18. Ticket Detail Page – Support Team

Clicking a ticket should open a detailed workspace.

Show:

Student Information

* Name
* Contact number
* Student ID

Problem

* Ticket ID
* Category
* Title
* Description
* Course
* Submission date

Attachments

Display uploaded screenshots/images directly.

For supported files, provide an in-app viewer.

For unsupported files, provide download/open action.

For video/audio:

* Audio player
* Video player

For external links:

* Clickable link
* Safe preview where possible

---

19. Support Team Response

The support team should have a response box:

"Write response to student..."

Buttons:

* Save Response
* Send Response
* Mark as Resolved

The response should be stored with the ticket.

Students should be able to see the response from their ticket page.

---

20. Resolution Flow

Example:

Student:

"Recorded Physics lecture has no sound."

Status:

Open

Support team checks the issue.

Status becomes:

In Review

Support team writes:

"We have checked the recording and replaced the corrupted audio file."

Then:

Status → Resolved

Student sees:

"Resolved"

and the official response.

---

21. Waiting for Information

If the support team needs additional information:

Set:

Waiting for Information

Add a response:

"Please send a screenshot of the error."

The student sees this response in their ticket.

Allow the student to add a follow-up message or attachment.

Once submitted:

Status can return to:

In Review

---

22. Ticket Conversation

Each ticket should support a simple conversation/thread.

Example:

Student:
"Video is not loading."

Support:
"Can you send a screenshot?"

Student:
"Here is the screenshot."

Support:
"The issue has been fixed."

This conversation should remain attached to the ticket.

---

23. Attachments

Implement attachment support.

Students can upload:

* PNG
* JPG/JPEG
* WebP
* PDF
* MP3
* WAV
* MP4
* WebM

Also support external links.

Each attachment should have:

* File name
* File type
* File size
* Upload date
* Preview where supported

Implement reasonable file-size limits and validation.

---

24. Export

Support team must have a visible:

"Export CSV"

button.

Allow export of:

All Tickets

or filtered tickets.

Export fields such as:

* Ticket ID
* Student Name
* Contact Number
* Student ID
* Category
* Title
* Description
* Status
* Response
* Submitted Date
* Updated Date

The exported file should open cleanly in Excel/Google Sheets.

---

25. Notice Management – Support Team

Support team can:

* Create notice
* Edit notice
* Delete notice
* Publish/unpublish notice

Fields:

* Title
* Description
* Date
* Priority
* Published status

Published notices appear on the student dashboard.

---

26. Admin Settings

Create an admin settings section.

Allow future configuration of:

* Admin username
* Admin password
* Problem categories
* Notice settings
* File upload limits
* Student database settings

The initial credentials are:

Username:

TENMS

Password:

tenten10

Do not hardcode these in the frontend.

Use a proper authentication/session mechanism so they can later be changed securely.

---

27. Security & Privacy

This is critical.

Students must NOT be able to:

* Access the admin dashboard
* Access another student's private ticket
* See contact numbers
* See emails
* Edit other students' tickets
* Upload arbitrary unauthorized data

Students can see the sanitized public issue information.

Admin/support users can see full ticket information.

Authentication should be handled server-side.

Never expose admin credentials in client-side JavaScript.

Protect all admin/server functions with authorization checks.

---

28. UI/UX

Design should be modern, clean, and professional.

Use a dashboard layout.

Suggested structure:

Student navigation

* Dashboard
* Report a Problem
* My Issues
* Community Issues
* Notices
* Profile

Support Team navigation

* Dashboard
* Tickets
* Student Database
* Notices
* Reports / Export
* Settings
* Logout

Use clear status badges:

* Open
* In Review
* Waiting
* Resolved
* Closed

Use responsive design for:

* Desktop
* Tablet
* Mobile

---

29. Spreadsheet-Like Interface

The support team's main ticket table and student database should feel similar to a spreadsheet.

Features:

* Sticky headers
* Search
* Filters
* Sort
* Pagination
* Column alignment
* Status badges
* Row click
* Export
* Responsive horizontal scrolling

Do not make the interface unnecessarily complicated.

The goal is for support staff to quickly scan hundreds or thousands of tickets.

---

30. Database Structure

Use a proper relational database structure.

Suggested entities:

Student

* id
* name
* contact_number
* student_id
* email
* created_at
* updated_at

Ticket

* id
* ticket_number
* student_id
* category
* title
* description
* course
* status
* created_at
* updated_at

TicketMessage

* id
* ticket_id
* sender_type
* sender_id
* message
* created_at

Attachment

* id
* ticket_id
* message_id
* file_name
* file_url
* file_type
* file_size
* created_at

Notice

* id
* title
* content
* priority
* published
* created_at
* updated_at

Admin/User

* id
* username
* password_hash
* role
* created_at

Do not store passwords in plain text.

---

31. CSV Import Requirements

The CSV importer should support variations in column names where possible.

For example:

* name / student_name
* phone / contact / contact_number / phone_number
* student_id / login_id
* email / email_address

Show a mapping interface if columns do not automatically match.

Before import:

Show:

"125 students detected"

"120 valid"

"3 duplicates"

"2 invalid"

Then:

[Cancel] [Confirm Import]

---

32. Empty States

Every page should have a useful empty state.

Example:

No tickets:

"No problems reported yet."

No search results:

"No issues found matching your search."

No notices:

"No new notices."

No students:

"Upload your student CSV to begin."

---

33. Error Handling

Never show raw server errors to students.

For example, instead of:

```text
requireStaff failed
```

show:

"Your session has expired. Please sign in again."

For unauthorized users:

"You don't have permission to access this page."

For failed uploads:

"Upload failed. Please check the file type and size."

---

34. Important Current Authentication Issue

The existing application contains a server-side `requireStaff()` authorization check.

Preserve this concept.

The support dashboard and support-only server functions must verify that the authenticated user is a valid staff/admin user.

Do not simply remove `requireStaff()` to make errors disappear.

Instead, implement the authentication flow correctly.

---

35. Demo Data

For development, create a small set of demo students and tickets if the database is empty.

Example students:

* Rahim
* Karim
* Nabila
* Sadia

Create several sample issues across:

* Sound
* Video
* Exam
* Recorded Lecture
* Other

Include different statuses so the dashboard can immediately demonstrate the workflow.

Clearly label demo data where appropriate.

---

36. Final User Flow

Student

```text
Open website
↓
Student Login
↓
Enter registered contact number
↓
System verifies student
↓
Student Dashboard
↓
Search existing issue OR report new problem
↓
Submit ticket
↓
Receive ticket ID
↓
Track status
↓
Support responds
↓
Student sees response
↓
Issue becomes Resolved
```

Support Team

```text
Open website
↓
Support Team Login
↓
TENMS / tenten10
↓
Support Dashboard
↓
Upload Student CSV
↓
Student database populated
↓
View Ticket Workspace
↓
Filter by problem category
↓
Open ticket
↓
Review description/attachments
↓
Respond
↓
Change status
↓
Resolve ticket
↓
Student sees resolution
↓
Export data when required
```

---

37. Most Important Product Principle

The application should NOT be designed around internal departments.

Students should only think:

"I have a problem."

They select:

"What type of problem?"

The internal support team decides what action is needed.

Therefore:

DO NOT show:

"Select responsible team"

"Choose department"

"Send to CX"

"Send to CPD"

"Send to Content"

Instead, use the problem category and allow internal staff to filter the ticket database according to their own responsibilities.

The platform is a central issue database and resolution system, not a department-selection system.

---

38. Build Requirement

Do not create only static UI mockups.

Implement the actual working functionality:

* Authentication
* Student verification
* Admin authentication
* CSV upload
* CSV parsing
* Student database
* Ticket creation
* Ticket listing
* Ticket filtering
* Ticket search
* Ticket status updates
* Ticket conversations
* Attachments
* Attachment preview
* Public issue board
* Notices
* Admin dashboard
* Student dashboard
* CSV export
* Role-based authorization
* Persistent database storage

Use the existing project's technology stack where possible.

Before modifying existing authentication/database functionality, inspect the current codebase and preserve working functionality.

Fix existing runtime/authentication issues rather than bypassing security checks.

The finished result should be a functional HSC 28 Student Support Hub, not merely a visual prototype. Make it functional that after admin login it brings to admin view not before bage make the url line up correct and proper

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/475f11aa-3118-4a42-9ca4-ed08027742bd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
