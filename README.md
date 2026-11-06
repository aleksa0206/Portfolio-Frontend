# Portfolio Frontend

Angular client for my personal site, [aleksao.me](https://aleksao.me). The site is a terminal: visitors browse my projects, education and contact details with shell commands, and each file opens in a window next to the terminal. All content comes from [Portfolio-Backend](https://github.com/aleksa0206/Portfolio-Backend) and is edited in an admin dashboard.

## The terminal

The content is mapped onto a small virtual file system (`terminal/vfs.ts`, `terminal/portfolio-fs.ts`): `~/about.md`, `~/skills.md`, `~/education.md`, `~/contact.txt`, a folder per project and so on. The shell supports:

- `ls`, `cd`, `pwd`, `cat`, `tree`, `find`, `open`, `echo`, `history`, `clear`, `help`, `man`
- shortcuts such as `about`, `projects`, `skills`, `education`, `contact`, `github`, `whoami`, `neofetch`
- quoting and argument parsing (`terminal/parser.ts`), Tab completion of commands and paths (`terminal/complete.ts`) and command history

Commands are plain functions from arguments and shell state to output lines (`terminal/commands.ts`), so the logic is unit-tested without rendering anything.

A project page shows the project's details and, when it links to a public GitHub repository, that repository's README.

The site also has a few jokes, all configurable from the admin dashboard:

- an "agreement" popup on the first visit;
- a red "takeover" when the visitor stays idle for a while or types a destructive command like `rm -rf` or `sudo`;
- an `important` file that eventually lets you download my CV.

## Admin dashboard

`/admin/login`, protected by a JWT and a route guard:

- profile, contact details, skills and the editable texts of the site
- CRUD for education, licenses and projects
- inbox for messages sent from the contact page
- easter egg settings (how often the popup returns, idle timeout)

The auth interceptor attaches the token to API requests; the error interceptor signs the admin out on a `401`.

## Tech stack

Angular 22 (standalone components, signals), TypeScript, SCSS, Reactive Forms, Vitest, nginx, Docker.

## Running locally

Requires Node.js 22+ and the backend running on `http://localhost:4000`.

```bash
npm install
npm start          # http://localhost:4200
npm test
npm run build      # production build into dist/portfolio-frontend
```

The API URL is in `src/environments/environment.ts` (development) and `src/environments/environment.prod.ts` (production build, swapped in through `fileReplacements`).

## Structure

```
src/app/
  terminal/        shell: commands, parser, completion, virtual file system
  pages/           the windows opened from the terminal (projects, education, licenses,
                   contact, files) and the admin dashboard
  core/            API services, models, auth guard, interceptors, site texts
  consent-dialog.ts, idle-prank.ts   the easter eggs
  matrix-rain.ts   background animation
```

## Docker

```bash
docker build -t portfolio-frontend .
```

A multi-stage build: the app is compiled with Node and served by nginx, which falls back to `index.html` for client-side routes and adds basic security headers.

In production the site runs in Docker on my home server behind a Cloudflare Tunnel, together with the backend and MySQL.
