# Lesson attachments

Course documents (PDF guides, prompt files, templates) are uploaded in the
Course Builder and kept on the server outside the public site. Only learners
enrolled in the course can download them, and each copy carries the name and
email of whoever downloaded it, so a copy that gets passed around shows whose
account it came from.

Web links (Google Drive, Dropbox…) still work in the attachments field, but
anyone with such a link can open it. The field marks each line as protected or
shareable.

## Adding files to a lesson

1. Admin > Course Builder (or the instructor's lesson builder), open the lesson.
2. Under attachments, **Upload file** and pick one or more files: PDF, TXT, MD,
   ZIP, PNG or JPG, up to 30 MB each. Each upload adds a line
   `Name|lessonfile:<id>`; rename the part before `|`, that's what learners see.
3. Save the lesson.

## How it works

- Uploads go to `POST /api/lesson-files` (admins and instructors). The file is
  checked (allowed extension, and the bytes must match it: a renamed file is
  refused) and stored as `<random uuid>.<ext>` in `private/lesson-files/` in the
  app directory, or in `LESSON_FILES_DIR` when set (`src/lib/lesson-files.ts`).
  `/private` is git-ignored and `deploy.sh` only resets tracked files, so
  uploads survive deploys.
- The learner's course page never contains the stored references. Each
  uploaded file links to `GET /api/lessons/<lesson>/files/<id>`, which answers
  only a signed-in learner enrolled in the course (or an admin, or the course's
  instructor), and only for a file that lesson lists. Not cached, rate-limited.
- **PDFs** get a small licence line along the foot of every page
  ("Licensed to Name <email> · FutureLine Academy · date · personal use only"),
  the email faintly across the middle of each page, and the same line in the
  document's metadata. **TXT/MD** files get the licence line on top. ZIP and
  images are sent as they are. Stamping the 36-page student guide takes about
  0.2 s.
- The PDF stamp uses the standard PDF fonts, which only cover Latin letters, so
  an Arabic name is left out of the stamp; the email is always there.

## Backups

The uploaded files are the only copies on the server. Keep the originals, and
back up `/opt/futureline/private/lesson-files` (or `LESSON_FILES_DIR`) with the
database. Deleting a lesson or an attachment line does not delete the file.

## Limits

A file a learner has downloaded can still be forwarded; the stamp is what makes
that traceable. "No print / no copy" PDF settings are easy to strip, so they
aren't used. Text prompts stay copyable on purpose.
