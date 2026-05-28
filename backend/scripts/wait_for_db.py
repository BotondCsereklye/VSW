import os
import time

import psycopg


DATABASE_URL = os.environ.get("DATABASE_URL", "")
MAX_ATTEMPTS = 30
SLEEP_SECONDS = 2


def main() -> None:
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            with psycopg.connect(DATABASE_URL.replace("+psycopg", ""), connect_timeout=3):
                print("Database connection ready.")
                return
        except psycopg.OperationalError:
            print(f"Waiting for database ({attempt}/{MAX_ATTEMPTS})...")
            time.sleep(SLEEP_SECONDS)

    raise SystemExit("Database did not become ready in time.")


if __name__ == "__main__":
    main()
