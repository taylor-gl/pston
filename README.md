# People Saying Their Own Names (pston)

## Setting up the dev environment

Docker Desktop must be installed for the local supabase. On Linux, I had to do `mkdir /socket_mnt`, and then add `/socket_mnt` to Docker Desktop `Virtual file shares` setting at Settings -> Resources -> File sharing. Permissions on `/socket_mnt` must be sufficiently loose.

Then you can run:

```bash
npx supabase start -x vector
```

(Vector gives me issues, and we're not using it)

You can access postgres through the URL it gives:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

To stop the local supabase:

```bash
npx supabase stop
```

## Migrations

Local:

```bash
npx supabase db push --local
```

Remote: (Run this after `git push` when pushing to prod if there are new migrations to run.)

```bash
npx supabase db push
```

## Running the dev environment

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```
